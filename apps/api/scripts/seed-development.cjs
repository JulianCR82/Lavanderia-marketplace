const { Pool } = require('pg');
const { hash, argon2id } = require('argon2');

// Fixed fixture IDs make re-runs safe; no provider identities or bypass tokens are seeded.
const users = [
  ['10000000-0000-4000-8000-000000000001', 'cliente@example.test', 'CUSTOMER'],
  ['10000000-0000-4000-8000-000000000002', 'otro-cliente@example.test', 'CUSTOMER'],
  ['10000000-0000-4000-8000-000000000003', 'admin@example.test', 'PLATFORM_ADMIN'],
  ['10000000-0000-4000-8000-000000000004', 'propietario@example.test', 'CUSTOMER', 'OWNER'],
  ['10000000-0000-4000-8000-000000000005', 'encargado@example.test', 'CUSTOMER', 'STAFF'],
  ['10000000-0000-4000-8000-000000000006', 'operario@example.test', 'CUSTOMER', 'STAFF'],
  ['10000000-0000-4000-8000-000000000007', 'propietario-b@example.test', 'CUSTOMER', 'OWNER'],
];
const laundryA = '20000000-0000-4000-8000-000000000001';
const laundryB = '20000000-0000-4000-8000-000000000002';

async function seed() {
  if (process.env.NODE_ENV !== 'development' || process.env.DEV_SEED_ENABLED !== 'true') throw new Error('Seed permitido solo con NODE_ENV=development y DEV_SEED_ENABLED=true.');
  const password = process.env.DEV_SEED_PASSWORD;
  if (!password || [...password].length < 15 || [...password].length > 128) throw new Error('Configura DEV_SEED_PASSWORD privado de 15–128 caracteres.');
  const passwordHash = await hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const pool = new Pool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(74102522)');
    for (const [id,name] of [[laundryA,'Lavandería de prueba A'],[laundryB,'Lavandería de prueba B']]) {
      await client.query("INSERT INTO laundries(id,name,status) VALUES ($1,$2,'ACTIVE') ON CONFLICT(id) DO NOTHING", [id,name]);
      const fixture = await client.query('SELECT 1 FROM laundries WHERE id=$1 AND name=$2', [id,name]);
      if (!fixture.rowCount) throw new Error('La lavandería de fixture está en conflicto; no se asignarán membresías.');
    }
    for (const [id,email,role,memberRole] of users) {
      await client.query('INSERT INTO accounts(id,email,platform_role,is_development_fixture) VALUES ($1,$2,$3,true) ON CONFLICT(id) DO NOTHING', [id,email,role]);
      const existing = await client.query('SELECT 1 FROM accounts WHERE id=$1 AND email=$2 AND platform_role=$3 AND is_development_fixture', [id,email,role]);
      if (!existing.rowCount) throw new Error('Fixture en conflicto: no se sobrescribieron datos existentes.');
      // Re-running never resets passwords or modifies real accounts.
      await client.query('INSERT INTO account_credentials(account_id,password_hash) VALUES ($1,$2) ON CONFLICT(account_id) DO NOTHING', [id,passwordHash]);
      if (memberRole) await client.query('INSERT INTO laundry_memberships(laundry_id,account_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [email === 'propietario-b@example.test' ? laundryB : laundryA,id,memberRole]);
    }
    await client.query('COMMIT');
    process.stdout.write('Seed de desarrollo listo: 7 cuentas y 2 lavanderías. Credenciales solo en DEV_SEED_PASSWORD privado.\n');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); await pool.end(); }
}

if (require.main === module) seed().catch(() => {
  process.stderr.write('Seed no ejecutado. Revisa entorno, configuración y posibles conflictos; no se sobrescribieron credenciales.\n');
  process.exitCode = 1;
});
module.exports = { seed };
