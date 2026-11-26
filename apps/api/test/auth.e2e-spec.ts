import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash, argon2id } from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { POSTGRES_POOL } from '../src/database/database.service';
import {
  ProviderTokenService,
  ProviderIdentity,
} from '../src/auth/provider-token.service';
import { registrationDatabase } from './registration-database';
import type { SessionGrant } from '../src/sessions/session.types';

describe('US-001 sessions, identities and role boundaries', () => {
  let app: INestApplication<App>;
  let db: Awaited<ReturnType<typeof registrationDatabase>>['db'];
  const password = 'Ropa de prueba para todas las cuentas 🧺';
  let passwordHash: string;
  const oldKey = process.env.REGISTRATION_HMAC_KEY;
  const proofs = new Map<string, ProviderIdentity>();
  const customer = '30000000-0000-4000-8000-000000000001';
  const owner = '30000000-0000-4000-8000-000000000002';
  const admin = '30000000-0000-4000-8000-000000000003';
  const staff = '30000000-0000-4000-8000-000000000004';
  const laundryA = '40000000-0000-4000-8000-000000000001';
  const laundryB = '40000000-0000-4000-8000-000000000002';
  beforeAll(async () => {
    process.env.REGISTRATION_HMAC_KEY =
      'test-only-auth-key-32-bytes-not-for-production';
    const database = await registrationDatabase();
    db = database.db;
    for (const name of [
      '001_initial.sql',
      '002_customer_registration.sql',
      '003_sessions_and_federated_identity.sql',
      '004_password_recovery.sql',
      '005_account_profile.sql',
      '006_session_management.sql',
    ])
      await db.exec(
        readFileSync(join(__dirname, '../migrations', name), 'utf8'),
      );
    await db.exec(
      "INSERT INTO accounts(id,email) VALUES('30000000-0000-4000-8000-000000000099','legacy-manager@example.test'); INSERT INTO laundries(id,name) VALUES('40000000-0000-4000-8000-000000000099','Legacy'); INSERT INTO laundry_memberships(laundry_id,account_id,role) VALUES('40000000-0000-4000-8000-000000000099','30000000-0000-4000-8000-000000000099','MANAGER')",
    );
    await db.exec(
      readFileSync(
        join(__dirname, '../migrations/007_laundry_membership_roles.sql'),
        'utf8',
      ),
    );
    expect(
      (
        await db.query(
          "SELECT role::text AS role FROM laundry_memberships WHERE account_id='30000000-0000-4000-8000-000000000099'",
        )
      ).rows,
    ).toEqual([{ role: 'STAFF' }]);
    expect(
      (
        await db.query(
          "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='laundry_member_role' ORDER BY e.enumsortorder",
        )
      ).rows,
    ).toEqual([{ enumlabel: 'OWNER' }, { enumlabel: 'STAFF' }]);
    await db.exec(
      readFileSync(
        join(
          __dirname,
          '../migrations/008_staff_invitations_and_account_kind.sql',
        ),
        'utf8',
      ),
    );
    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(POSTGRES_POOL)
      .useValue(database.pool)
      .overrideProvider(ProviderTokenService)
      .useValue({
        audiences: () => ['fixture-client'],
        verify: (_provider: string, token: string) => {
          const identity = proofs.get(token);
          if (!identity) throw new Error('Untrusted provider fixture');
          return Promise.resolve(identity);
        },
      })
      .compile();
    app = fixture.createNestApplication();
    await app.init();
  }, 30000);
  beforeEach(async () => {
    proofs.clear();
    await db.exec(
      'TRUNCATE accounts,laundries,auth_attempts,registration_events CASCADE',
    );
    for (const [id, email, role] of [
      [customer, 'cliente@example.test', 'CUSTOMER'],
      [owner, 'owner@example.test', 'CUSTOMER'],
      [admin, 'admin@example.test', 'PLATFORM_ADMIN'],
      [staff, 'staff@example.test', 'CUSTOMER'],
    ]) {
      await db.query(
        'INSERT INTO accounts(id,email,platform_role) VALUES($1,$2,$3)',
        [id, email, role],
      );
      await db.query(
        'INSERT INTO account_credentials(account_id,password_hash) VALUES($1,$2)',
        [id, passwordHash],
      );
    }
    await db.query(
      "INSERT INTO laundries(id,name,status) VALUES($1,'Prueba A','ACTIVE'),($2,'Prueba B','ACTIVE')",
      [laundryA, laundryB],
    );
    await db.query(
      "INSERT INTO laundry_memberships(laundry_id,account_id,role) VALUES($1,$2,'OWNER')",
      [laundryA, owner],
    );
    await db.query(
      "INSERT INTO laundry_memberships(laundry_id,account_id,role) VALUES($1,$2,'STAFF')",
      [laundryA, staff],
    );
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await db?.close();
      if (oldKey === undefined) delete process.env.REGISTRATION_HMAC_KEY;
      else process.env.REGISTRATION_HMAC_KEY = oldKey;
    }
  });
  const login = async (
    email = 'cliente@example.test',
    platform = 'android',
  ): Promise<SessionGrant> =>
    (
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client-Platform', platform)
        .send({ email, password })
        .expect(200)
    ).body as SessionGrant;
  const me = (token: string) =>
    request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' });
  const challenge = async (provider = 'google', token?: string) => {
    const call = request(app.getHttpServer()).post(
      token ? '/auth/identities/challenge' : '/auth/providers/challenge',
    );
    if (token) call.auth(token, { type: 'bearer' });
    return (await call.send({ provider }).expect(201)).body as {
      challengeId: string;
      nonce: string;
    };
  };
  const exchange = (body: object, token?: string) => {
    const call = request(app.getHttpServer()).post(
      token ? '/auth/identities/link' : '/auth/providers/login',
    );
    if (token) call.auth(token, { type: 'bearer' });
    return call.set('X-Client-Platform', 'ios').send(body);
  };

  it('stores only a digest, expires after seven days and revokes immediately', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    const grant = await login();
    await me(grant.sessionToken).expect(200);
    const session = (
      await db.query<{
        token_hash: string;
        days: number;
        client_platform: string;
      }>(
        'SELECT token_hash,client_platform,extract(epoch FROM (expires_at-created_at))/86400 AS days FROM auth_sessions',
      )
    ).rows[0];
    expect(session.token_hash).not.toBe(grant.sessionToken);
    expect(session.token_hash).toHaveLength(64);
    expect(session.client_platform).toBe('android');
    expect(Number(session.days)).toBeCloseTo(7, 2);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(grant.sessionToken, { type: 'bearer' })
      .send({})
      .expect(204);
    await me(grant.sessionToken).expect(401);
    const second = await login();
    await db.exec(
      "UPDATE auth_sessions SET expires_at=now()-interval '1 second'",
    );
    await me(second.sessionToken).expect(401);
  });
  it('uses generic credential errors and limits concurrent guesses without trusting role fields', async () => {
    const missing = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@example.test', password })
      .expect(401);
    const wrong = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'cliente@example.test', password: 'incorrect' })
      .expect(401);
    expect(missing.body as unknown).toEqual(wrong.body as unknown);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'cliente@example.test',
        password,
        platformRole: 'PLATFORM_ADMIN',
      })
      .expect(400);
    const responses = await Promise.all(
      Array.from({ length: 12 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'quota@example.test', password: 'wrong' }),
      ),
    );
    expect(responses.filter((r) => r.status === 401)).toHaveLength(10);
    expect(responses.filter((r) => r.status === 429)).toHaveLength(2);
  });
  it('treats unrecognized platform hints as absent without accepting arbitrary metadata', async () => {
    await login('cliente@example.test', 'untrusted-device-data');
    expect(
      (await db.query('SELECT client_platform FROM auth_sessions')).rows,
    ).toEqual([{ client_platform: null }]);
  });
  it('authorizes platform and laundry routes from current roles and isolates laundries', async () => {
    const client = await login();
    const operator = await login('owner@example.test');
    const platform = await login('admin@example.test');
    const operatorStaff = await login('staff@example.test');
    await request(app.getHttpServer())
      .get('/platform/access')
      .auth(client.sessionToken, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform/access')
      .auth(operator.sessionToken, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform/access')
      .auth(platform.sessionToken, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/laundries/${laundryA}/access`)
      .auth(operator.sessionToken, { type: 'bearer' })
      .expect(200)
      .expect({ laundryId: laundryA, laundryName: 'Prueba A', role: 'OWNER' });
    await request(app.getHttpServer())
      .get(`/laundries/${laundryA}/access`)
      .auth(operatorStaff.sessionToken, { type: 'bearer' })
      .expect(200)
      .expect({ laundryId: laundryA, laundryName: 'Prueba A', role: 'STAFF' });
    for (const token of [platform.sessionToken, client.sessionToken])
      await request(app.getHttpServer())
        .get(`/laundries/${laundryA}/access`)
        .auth(token, { type: 'bearer' })
        .expect(403);
    await request(app.getHttpServer())
      .get('/platform/access')
      .auth(operatorStaff.sessionToken, { type: 'bearer' })
      .expect(403);
    for (const token of [
      operator.sessionToken,
      operatorStaff.sessionToken,
      platform.sessionToken,
      client.sessionToken,
    ])
      await request(app.getHttpServer())
        .get(`/laundries/${laundryB}/access`)
        .auth(token, { type: 'bearer' })
        .expect(403);
    await db.query('DELETE FROM laundry_memberships WHERE account_id=$1', [
      owner,
    ]);
    await request(app.getHttpServer())
      .get(`/laundries/${laundryA}/access`)
      .auth(operator.sessionToken, { type: 'bearer' })
      .expect(403);
  });
  it('requires a valid session on both role-protected routes', async () => {
    const paths = ['/platform/access', `/laundries/${laundryA}/access`];
    for (const path of paths) {
      await request(app.getHttpServer()).get(path).expect(401);
      await request(app.getHttpServer())
        .get(path)
        .auth('invalid', { type: 'bearer' })
        .expect(401);
    }
    const platform = await login('admin@example.test');
    const operator = await login('owner@example.test');
    await db.exec(
      "UPDATE auth_sessions SET expires_at=now()-interval '1 second'",
    );
    for (const [path, token] of [
      [paths[0], platform.sessionToken],
      [paths[1], operator.sessionToken],
    ])
      await request(app.getHttpServer())
        .get(path)
        .auth(token, { type: 'bearer' })
        .expect(401);
    const revokedPlatform = await login('admin@example.test');
    const revokedOperator = await login('owner@example.test');
    await db.exec('UPDATE auth_sessions SET revoked_at=now()');
    for (const [path, token] of [
      [paths[0], revokedPlatform.sessionToken],
      [paths[1], revokedOperator.sessionToken],
    ])
      await request(app.getHttpServer())
        .get(path)
        .auth(token, { type: 'bearer' })
        .expect(401);
  });
  it('reloads platform roles and permits administrators only with explicit laundry membership', async () => {
    const platform = await login('admin@example.test');
    await request(app.getHttpServer())
      .get(`/laundries/${laundryA}/access`)
      .auth(platform.sessionToken, { type: 'bearer' })
      .expect(403);
    await db.query(
      "INSERT INTO laundry_memberships(laundry_id,account_id,role) VALUES($1,$2,'STAFF')",
      [laundryA, admin],
    );
    await request(app.getHttpServer())
      .get(`/laundries/${laundryA}/access`)
      .auth(platform.sessionToken, { type: 'bearer' })
      .expect(200)
      .expect({ laundryId: laundryA, laundryName: 'Prueba A', role: 'STAFF' });
    await db.query("UPDATE accounts SET platform_role='CUSTOMER' WHERE id=$1", [
      admin,
    ]);
    await request(app.getHttpServer())
      .get('/platform/access')
      .auth(platform.sessionToken, { type: 'bearer' })
      .expect(403);
  });
  it('creates federated CUSTOMER and rejects replay even across concurrent exchanges', async () => {
    const proof = await challenge();
    proofs.set('proof', {
      subject: 'google-new',
      email: 'new@example.test',
      nonce: proof.nonce,
    });
    const body = {
      provider: 'google',
      challengeId: proof.challengeId,
      identityToken: 'proof',
    };
    const responses = await Promise.all([exchange(body), exchange(body)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 401]);
    expect(
      (await db.query('SELECT client_platform FROM auth_sessions')).rows,
    ).toEqual([{ client_platform: 'ios' }]);
    expect(
      (
        await db.query(
          "SELECT platform_role FROM accounts WHERE email='new@example.test'",
        )
      ).rows,
    ).toEqual([{ platform_role: 'CUSTOMER' }]);
    expect(
      (await db.query('SELECT * FROM account_identities')).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          "SELECT m.* FROM laundry_memberships m JOIN accounts a ON a.id=m.account_id WHERE a.email='new@example.test'",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it('rejects switching a password account to Google without changing its credentials', async () => {
    const proof = await challenge();
    proofs.set('collision', {
      subject: 'google-customer',
      email: 'cliente@example.test',
      nonce: proof.nonce,
    });
    const response = await exchange({
      provider: 'google',
      challengeId: proof.challengeId,
      identityToken: 'collision',
    }).expect(409);
    expect((response.body as { code: string }).code).toBe(
      'ACCOUNT_SIGN_IN_METHOD_MISMATCH',
    );
    expect(
      (
        await db.query('SELECT * FROM account_identities WHERE account_id=$1', [
          customer,
        ])
      ).rows,
    ).toHaveLength(0);
    await login();
  });
  it('disables both linking endpoints even with a valid session and provider proof', async () => {
    const grant = await login();
    await request(app.getHttpServer())
      .post('/auth/identities/challenge')
      .auth(grant.sessionToken, { type: 'bearer' })
      .send({ provider: 'google' })
      .expect(404);
    const proof = await challenge();
    proofs.set('forbidden-link', {
      subject: 'google-customer',
      email: 'cliente@example.test',
      nonce: proof.nonce,
    });
    await exchange(
      {
        provider: 'google',
        challengeId: proof.challengeId,
        identityToken: 'forbidden-link',
      },
      grant.sessionToken,
    ).expect(404);
    expect(
      (await db.query('SELECT * FROM account_identities')).rows,
    ).toHaveLength(0);
  });
  it('preserves login for identities linked before linking was retired', async () => {
    await db.query(
      "INSERT INTO account_identities(provider,subject,account_id) VALUES('google','legacy-linked-subject',$1)",
      [customer],
    );
    const proof = await challenge();
    proofs.set('legacy-login', {
      subject: 'legacy-linked-subject',
      nonce: proof.nonce,
    });
    const result = await exchange({
      provider: 'google',
      challengeId: proof.challengeId,
      identityToken: 'legacy-login',
    }).expect(200);
    const profile = await me((result.body as SessionGrant).sessionToken).expect(
      200,
    );
    expect((profile.body as { id: string }).id).toBe(customer);
    await login();
  });
  it('rejects deferred or unknown providers for login and linking without creating challenges', async () => {
    const grant = await login();
    const proof = {
      challengeId: '50000000-0000-4000-8000-000000000001',
      identityToken: 'untrusted-token',
    };
    for (const provider of ['apple', 'unknown']) {
      await request(app.getHttpServer())
        .post('/auth/providers/challenge')
        .send({ provider })
        .expect(400);
      await exchange({ provider, ...proof }).expect(400);
      await request(app.getHttpServer())
        .post('/auth/identities/challenge')
        .auth(grant.sessionToken, { type: 'bearer' })
        .send({ provider })
        .expect(404);
      await exchange({ provider, ...proof }, grant.sessionToken).expect(404);
    }
    expect(
      (await db.query('SELECT count(*)::int AS count FROM auth_challenges'))
        .rows,
    ).toEqual([{ count: 0 }]);
  });
  it('binds nonce and expiration and commits failed proof attempts', async () => {
    const proof = await challenge('google');
    proofs.set('wrong-nonce', {
      subject: 'google-new',
      email: 'new@example.test',
      nonce: 'wrong',
    });
    for (let i = 0; i < 5; i++)
      await exchange({
        provider: 'google',
        challengeId: proof.challengeId,
        identityToken: 'wrong-nonce',
      }).expect(401);
    expect(
      (
        await db.query('SELECT attempts FROM auth_challenges WHERE id=$1', [
          proof.challengeId,
        ])
      ).rows,
    ).toEqual([{ attempts: 5 }]);
    proofs.set('correct', {
      subject: 'google-new',
      email: 'new@example.test',
      nonce: proof.nonce,
    });
    await exchange({
      provider: 'google',
      challengeId: proof.challengeId,
      identityToken: 'correct',
    }).expect(401);
    const expired = await challenge('google');
    await db.exec(
      "UPDATE auth_challenges SET expires_at=now()-interval '1 second'",
    );
    await exchange({
      provider: 'google',
      challengeId: expired.challengeId,
      identityToken: 'correct',
    }).expect(401);
  });
  it('denies development fixtures in production even with an existing session', async () => {
    await db.query(
      'UPDATE accounts SET is_development_fixture=true WHERE id=$1',
      [customer],
    );
    const grant = await login();
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await me(grant.sessionToken).expect(401);
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'cliente@example.test', password })
        .expect(401);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('returns to the same Google account without requesting its email again', async () => {
    const first = await challenge('google');
    proofs.set('google-first', {
      subject: 'google-returning-subject',
      email: 'private@example.test',
      nonce: first.nonce,
    });
    const signed = await exchange({
      provider: 'google',
      challengeId: first.challengeId,
      identityToken: 'google-first',
    }).expect(200);
    const original = await me(
      (signed.body as SessionGrant).sessionToken,
    ).expect(200);
    const again = await challenge('google');
    proofs.set('google-again', {
      subject: 'google-returning-subject',
      nonce: again.nonce,
    });
    const returned = await exchange({
      provider: 'google',
      challengeId: again.challengeId,
      identityToken: 'google-again',
    }).expect(200);
    const profile = await me(
      (returned.body as SessionGrant).sessionToken,
    ).expect(200);
    expect((profile.body as { id: string }).id).toBe(
      (original.body as { id: string }).id,
    );
    expect((profile.body as { platformRole: string }).platformRole).toBe(
      'CUSTOMER',
    );
  });

  it('cannot move an already linked provider identity into another account', async () => {
    await db.query(
      "INSERT INTO account_identities(provider,subject,account_id) VALUES('google','owned-subject',$1)",
      [customer],
    );
    const other = await login('owner@example.test');
    await request(app.getHttpServer())
      .post('/auth/identities/link')
      .auth(other.sessionToken, { type: 'bearer' })
      .send({
        provider: 'google',
        challengeId: '50000000-0000-4000-8000-000000000001',
        identityToken: 'steal',
      })
      .expect(404);
    expect(
      (
        await db.query(
          "SELECT account_id FROM account_identities WHERE subject='owned-subject'",
        )
      ).rows,
    ).toEqual([{ account_id: customer }]);
  });
});
