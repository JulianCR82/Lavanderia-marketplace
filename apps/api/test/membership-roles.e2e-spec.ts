import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { registrationDatabase } from './registration-database';

/** SQL integration without HTTP; uses only the existing disposable DB harness. */
describe('US-001.06 migration 007 membership roles', () => {
  let db: Awaited<ReturnType<typeof registrationDatabase>>['db'];
  let pool: Pool;
  const migration = readFileSync(
    join(__dirname, '../migrations/007_laundry_membership_roles.sql'),
    'utf8',
  );
  // 007 contains only simple SQL statements; PGlite query accepts one at a time.
  const statements = migration.split(';').filter((sql) => sql.trim());
  const labels = () =>
    db.query<{ enumlabel: string }>(
      "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='laundry_member_role' ORDER BY e.enumsortorder",
    );

  beforeEach(async () => {
    ({ db, pool } = await registrationDatabase());
    await db.exec(
      readFileSync(join(__dirname, '../migrations/001_initial.sql'), 'utf8'),
    );
    await db.exec(`
      INSERT INTO accounts(id,email) VALUES
        ('91000000-0000-4000-8000-000000000001','owner@example.test'),
        ('91000000-0000-4000-8000-000000000002','manager@example.test'),
        ('91000000-0000-4000-8000-000000000003','staff@example.test');
      INSERT INTO laundries(id,name) VALUES
        ('92000000-0000-4000-8000-000000000001','Migration fixture');
      INSERT INTO laundry_memberships(laundry_id,account_id,role,created_at)
        SELECT '92000000-0000-4000-8000-000000000001',id,
          CASE email WHEN 'owner@example.test' THEN 'OWNER'
            WHEN 'manager@example.test' THEN 'MANAGER' ELSE 'STAFF' END::laundry_member_role,
          '2026-01-01T00:00:00Z'::timestamptz
        FROM accounts;
    `);
  }, 30000);

  afterEach(async () => {
    await db?.close();
  });

  it('rolls back the enum replacement and legacy rows with the transaction', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const statement of statements) await client.query(statement);
    } finally {
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
    expect((await labels()).rows.map((row) => row.enumlabel)).toEqual([
      'OWNER',
      'MANAGER',
      'STAFF',
    ]);
    expect(
      (
        await db.query(
          "SELECT role::text AS role FROM laundry_memberships WHERE account_id='91000000-0000-4000-8000-000000000002'",
        )
      ).rows,
    ).toEqual([{ role: 'MANAGER' }]);
  });

  it('converts MANAGER to STAFF and preserves every membership identity and creation date', async () => {
    const before = (
      await db.query<{ role: string }>(
        'SELECT laundry_id,account_id,role::text AS role,created_at FROM laundry_memberships ORDER BY account_id',
      )
    ).rows;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const statement of statements) await client.query(statement);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    expect(
      (
        await db.query(
          'SELECT laundry_id,account_id,role::text AS role,created_at FROM laundry_memberships ORDER BY account_id',
        )
      ).rows,
    ).toEqual(
      before.map((row) => ({
        ...row,
        role: row.role === 'MANAGER' ? 'STAFF' : row.role,
      })),
    );
    expect((await labels()).rows.map((row) => row.enumlabel)).toEqual([
      'OWNER',
      'STAFF',
    ]);
    expect(
      (
        await db.query(
          "SELECT typname FROM pg_type WHERE typname='laundry_member_role_legacy'",
        )
      ).rows,
    ).toEqual([]);
  });

  it('rejects MANAGER in the current enum', async () => {
    await db.exec(migration);
    await expect(
      db.query("UPDATE laundry_memberships SET role='MANAGER'"),
    ).rejects.toMatchObject({ code: '22P02' });
  });
});
