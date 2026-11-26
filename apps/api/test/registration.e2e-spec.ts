import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { verify } from 'argon2';
import { AppModule } from '../src/app.module';
import { POSTGRES_POOL } from '../src/database/database.service';
import { RegistrationMailer } from '../src/registration/registration-mailer';
import { PendingRegistration } from './registration.types';
import type { App } from 'supertest/types';
import { RegistrationCrypto } from '../src/registration/registration-crypto.service';
import { registrationDatabase } from './registration-database';

/** Isolated SQL engine: no network, existing databases or developer data involved. */
describe('US-001.01 registration (HTTP + SQL)', () => {
  let app: INestApplication<App>;
  let db: Awaited<ReturnType<typeof registrationDatabase>>['db'];
  let sent: { email: string; code: string }[];
  let mailFails = false;
  const password = 'Una prenda limpia para mañana 🧺';
  const originalKey = process.env.REGISTRATION_HMAC_KEY;

  beforeAll(async () => {
    process.env.REGISTRATION_HMAC_KEY =
      'test-only-key-32-bytes-never-use-in-production';
    const database = await registrationDatabase();
    db = database.db;
    await db.exec(
      readFileSync(join(__dirname, '../migrations/001_initial.sql'), 'utf8'),
    );
    await db.exec(
      readFileSync(
        join(__dirname, '../migrations/002_customer_registration.sql'),
        'utf8',
      ),
    );
    await db.exec(
      readFileSync(
        join(
          __dirname,
          '../migrations/003_sessions_and_federated_identity.sql',
        ),
        'utf8',
      ),
    );
    await db.exec(
      readFileSync(
        join(__dirname, '../migrations/005_account_profile.sql'),
        'utf8',
      ),
    );
    for (const name of [
      '004_password_recovery.sql',
      '006_session_management.sql',
      '007_laundry_membership_roles.sql',
      '008_staff_invitations_and_account_kind.sql',
    ])
      await db.exec(
        readFileSync(join(__dirname, '../migrations', name), 'utf8'),
      );
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(POSTGRES_POOL)
      .useValue(database.pool)
      .overrideProvider(RegistrationMailer)
      .useValue({
        send: (email: string, code: string) => {
          if (mailFails) throw new Error('simulated transport failure');
          sent.push({ email, code });
          return Promise.resolve();
        },
      })
      .compile();
    app = fixture.createNestApplication();
    await app.init();
    let sequence = 100000;
    jest
      .spyOn(app.get(RegistrationCrypto), 'code')
      .mockImplementation(() => String(sequence++));
  }, 30_000);

  beforeEach(async () => {
    sent = [];
    mailFails = false;
    await db.exec(
      'TRUNCATE registration_challenges, registration_events, account_credentials, accounts CASCADE',
    );
  });

  afterAll(async () => {
    await app?.close();
    await db?.close();
    if (originalKey === undefined) delete process.env.REGISTRATION_HMAC_KEY;
    else process.env.REGISTRATION_HMAC_KEY = originalKey;
  });

  const start = async (
    email = 'cliente@example.com',
    secret = password,
  ): Promise<PendingRegistration> => {
    const response = await request(app.getHttpServer())
      .post('/auth/registrations')
      .send({ email, password: secret })
      .expect(201);
    return response.body as PendingRegistration;
  };
  const check = (registrationId: string, code: string) =>
    request(app.getHttpServer())
      .post('/auth/registrations/verify')
      .set('X-Client-Platform', 'web')
      .send({ registrationId, code });
  const resend = (registrationId: string) =>
    request(app.getHttpServer())
      .post('/auth/registrations/resend')
      .send({ registrationId });
  const elapseCooldown = () =>
    db.exec(
      "UPDATE registration_events SET created_at = created_at - interval '61 seconds'",
    );

  it('normalizes email and creates CUSTOMER with an opaque session after proof verification', async () => {
    const pending = await start('  CLIENTE@Example.com  ');
    expect(sent[0].email).toBe('cliente@example.com');
    expect(sent[0].code).toMatch(/^\d{6}$/);
    expect((await db.query('SELECT * FROM accounts')).rows).toHaveLength(0);
    const challenge = (
      await db.query<{ password_hash: string; otp_digest: string }>(
        'SELECT * FROM registration_challenges',
      )
    ).rows[0];
    expect(challenge.password_hash).toMatch(
      /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/,
    );
    expect(await verify(challenge.password_hash, password)).toBe(true);
    expect(challenge.otp_digest).not.toBe(sent[0].code);
    expect(JSON.stringify(pending)).not.toContain('password');
    const result = await check(pending.registrationId, sent[0].code).expect(
      200,
    );
    expect(result.body as unknown).toMatchObject({
      status: 'CREATED',
      message: expect.any(String) as unknown,
    });
    expect(
      (await db.query('SELECT client_platform FROM auth_sessions')).rows,
    ).toEqual([{ client_platform: 'web' }]);
    expect(
      (await db.query('SELECT platform_role,phone FROM accounts')).rows,
    ).toEqual([{ platform_role: 'CUSTOMER', phone: null }]);
    expect(
      (await db.query('SELECT * FROM laundry_memberships')).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('SELECT * FROM registration_challenges')).rows,
    ).toHaveLength(0);
    await check(pending.registrationId, sent[0].code).expect(400);
    await request(app.getHttpServer())
      .post('/auth/registrations')
      .send({ email: 'CLIENTE@example.com', password })
      .expect(409);
  });

  it('rejects invalid input, short/overlong/common passwords and role injection', async () => {
    for (const body of [
      { email: 'bad', password },
      { email: 'a@example.com', password: 'short' },
      { email: 'a@example.com', password: 'x'.repeat(129) },
      { email: 'a@example.com', password: '123456789012345' },
      { email: 'a@example.com', password, platform_role: 'PLATFORM_ADMIN' },
    ])
      await request(app.getHttpServer())
        .post('/auth/registrations')
        .send(body)
        .expect(400);
    expect(sent).toHaveLength(0);
  });

  it('expires proof; resend invalidates previous code without resetting failures', async () => {
    const pending = await start();
    const oldCode = sent[0].code;
    await db.exec(
      "UPDATE registration_challenges SET expires_at=now() - interval '1 second'",
    );
    expect(
      (
        (await check(pending.registrationId, oldCode).expect(400)).body as {
          code: string;
        }
      ).code,
    ).toBe('CODE_EXPIRED');
    await resend(pending.registrationId).expect(429);
    await elapseCooldown();
    await resend(pending.registrationId).expect(200);
    await check(pending.registrationId, oldCode).expect(400);
    expect(
      (await db.query('SELECT failed_attempts FROM registration_challenges'))
        .rows,
    ).toEqual([{ failed_attempts: 1 }]);
    await check(pending.registrationId, sent[1].code).expect(200);
  });

  it('commits five failures across resends and refuses even the correct code afterward', async () => {
    const pending = await start();
    const wrong = sent[0].code === '000000' ? '000001' : '000000';
    for (let i = 0; i < 4; i++)
      await check(pending.registrationId, wrong).expect(400);
    await elapseCooldown();
    await resend(pending.registrationId).expect(200);
    const wrongNew = sent[1].code === '999999' ? '999998' : '999999';
    await check(pending.registrationId, wrongNew).expect(400);
    await check(pending.registrationId, sent[1].code).expect(400);
    await elapseCooldown();
    await resend(pending.registrationId).expect(400);
    expect(
      (await db.query('SELECT failed_attempts FROM registration_challenges'))
        .rows,
    ).toEqual([{ failed_attempts: 5 }]);
    expect((await db.query('SELECT * FROM accounts')).rows).toHaveLength(0);
  });

  it('enforces contact budget across new registration processes', async () => {
    for (let i = 0; i < 5; i++) {
      await start();
      await elapseCooldown();
    }
    await request(app.getHttpServer())
      .post('/auth/registrations')
      .send({ email: 'CLIENTE@example.com', password })
      .expect(429);
    expect(sent).toHaveLength(5);
  });

  it('allows only one concurrent confirmation and preserves the credential bound to its flow', async () => {
    const first = await start();
    const firstCode = sent[0].code;
    await elapseCooldown();
    const second = await start(
      'cliente@example.com',
      'Otra contraseña con prendas distintas',
    );
    // Cross-flow substitution must fail, even with a valid code from another flow.
    if (firstCode !== sent[1].code)
      await check(second.registrationId, firstCode).expect(400);
    const responses = await Promise.all([
      check(first.registrationId, firstCode),
      check(first.registrationId, firstCode),
      check(second.registrationId, sent[1].code),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400, 400]);
    const credential = (
      await db.query<{ password_hash: string }>(
        'SELECT password_hash FROM account_credentials',
      )
    ).rows[0];
    const winningPassword =
      responses[2].status === 200
        ? 'Otra contraseña con prendas distintas'
        : password;
    expect(await verify(credential.password_hash, winningPassword)).toBe(true);
    expect((await db.query('SELECT * FROM accounts')).rows).toHaveLength(1);
  });

  it('rolls back account and proof consumption when credential persistence fails', async () => {
    const pending = await start();
    await db.exec(
      'ALTER TABLE account_credentials ADD CONSTRAINT simulated_failure CHECK (false)',
    );
    try {
      await check(pending.registrationId, sent[0].code).expect(503);
      expect((await db.query('SELECT * FROM accounts')).rows).toHaveLength(0);
      expect(
        (await db.query('SELECT * FROM registration_challenges')).rows,
      ).toHaveLength(1);
    } finally {
      await db.exec(
        'ALTER TABLE account_credentials DROP CONSTRAINT simulated_failure',
      );
    }
    await check(pending.registrationId, sent[0].code).expect(200);
  });

  it('retains quota on provider failure, without creating an account or exposing errors', async () => {
    mailFails = true;
    const failure = await request(app.getHttpServer())
      .post('/auth/registrations')
      .send({ email: 'cliente@example.com', password })
      .expect(503);
    expect(JSON.stringify(failure.body)).not.toContain('simulated');
    expect((await db.query('SELECT * FROM accounts')).rows).toHaveLength(0);
    mailFails = false;
    await request(app.getHttpServer())
      .post('/auth/registrations')
      .send({ email: 'cliente@example.com', password })
      .expect(429);
  });

  it('enforces IP/global hourly/global daily budgets from persistent history', async () => {
    await start('probe@example.com');
    const observedKey = (
      await db.query<{ ip_key: string }>(
        "SELECT ip_key FROM registration_events WHERE kind='request' LIMIT 1",
      )
    ).rows[0].ip_key;
    sent = [];
    await db.exec('TRUNCATE registration_challenges');
    for (const budget of ['ip', 'hour', 'day']) {
      await db.exec('TRUNCATE registration_events');
      const count = budget === 'ip' ? 30 : 100;
      const ipKey = budget === 'ip' ? observedKey : 'another-ip';
      await db.query(
        `INSERT INTO registration_events(kind,email_key,ip_key,created_at)
        SELECT 'send','other-contact',$1,now() - $2::interval FROM generate_series(1,$3::int)`,
        [ipKey, budget === 'day' ? '2 hours' : '2 minutes', count],
      );
      await request(app.getHttpServer())
        .post('/auth/registrations')
        .send({ email: 'cliente@example.com', password })
        .expect(429);
    }
    expect(sent).toHaveLength(0);
  });

  it('bounds password hashing requests per IP and ignores forged forwarding headers', async () => {
    await start('probe@example.com');
    const ipKey = (
      await db.query<{ ip_key: string }>(
        "SELECT ip_key FROM registration_events WHERE kind='request' LIMIT 1",
      )
    ).rows[0].ip_key;
    await db.exec('TRUNCATE registration_events, registration_challenges');
    sent = [];
    await db.query(
      `INSERT INTO registration_events(kind,email_key,ip_key)
      SELECT 'request','',$1 FROM generate_series(1,120)`,
      [ipKey],
    );
    await request(app.getHttpServer())
      .post('/auth/registrations')
      .set('X-Forwarded-For', '203.0.113.22')
      .send({ email: 'cliente@example.com', password })
      .expect(429);
    expect(sent).toHaveLength(0);
  });

  it('cleans abandoned flows and expired quota history during activity', async () => {
    await start();
    await db.exec(
      "UPDATE registration_events SET created_at=now() - interval '25 hours'; UPDATE registration_challenges SET created_at=now() - interval '25 hours'",
    );
    await start('otro@example.com');
    expect(
      (await db.query('SELECT * FROM registration_challenges')).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          "SELECT * FROM registration_events WHERE created_at < now() - interval '24 hours'",
        )
      ).rows,
    ).toHaveLength(0);
  });

  it('reserves the final IP send slot only once under concurrent requests', async () => {
    await start('probe@example.com');
    const ipKey = (
      await db.query<{ ip_key: string }>(
        "SELECT ip_key FROM registration_events WHERE kind='request' LIMIT 1",
      )
    ).rows[0].ip_key;
    await db.exec('TRUNCATE registration_events, registration_challenges');
    sent = [];
    await db.query(
      `INSERT INTO registration_events(kind,email_key,ip_key,created_at)
      SELECT 'send','other-contact',$1,now() - interval '2 minutes' FROM generate_series(1,29)`,
      [ipKey],
    );
    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        request(app.getHttpServer())
          .post('/auth/registrations')
          .send({ email: `race${index}@example.com`, password }),
      ),
    );
    expect(
      responses.filter((response) => response.status === 201),
    ).toHaveLength(1);
    expect(
      responses.filter((response) => response.status === 429),
    ).toHaveLength(7);
    expect(sent).toHaveLength(1);
  });
});
