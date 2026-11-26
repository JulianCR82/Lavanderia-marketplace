import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  DatabaseService,
  POSTGRES_POOL,
} from '../src/database/database.service';
import { AuthService } from '../src/auth/auth.service';
import { RegistrationCrypto } from '../src/registration/registration-crypto.service';
import { RecoveryMailer } from '../src/recovery/recovery-mailer';
import { RecoveryDelivery } from '../src/recovery/recovery-delivery.service';
import { registrationDatabase } from './registration-database';

interface Pending {
  recoveryId: string;
  expiresAt: string;
  resendAvailableAt: string;
  message: string;
}
describe('US-001.03 recovery HTTP and SQL', () => {
  let app: INestApplication<App>;
  let db: Awaited<ReturnType<typeof registrationDatabase>>['db'];
  let deliveries: { email: string; code: string }[] = [];
  let notices: string[] = [];
  let mailFails = false;
  let noticeFails = false;
  let blockedDelivery: Promise<void> | undefined;
  let codeSequence = 410000;
  const account = '50000000-0000-4000-8000-000000000001';
  const originalPassword = 'Mi ropa anterior para esta prueba 🧺';
  const newPassword = 'Una contraseña nueva y diferente 🧺';
  const oldKey = process.env.REGISTRATION_HMAC_KEY;
  let passwordHash: string;
  beforeAll(async () => {
    process.env.REGISTRATION_HMAC_KEY = 'test-only-recovery-key-with-32-bytes';
    const database = await registrationDatabase();
    db = database.db;
    for (const name of [
      '001_initial.sql',
      '002_customer_registration.sql',
      '003_sessions_and_federated_identity.sql',
      '004_password_recovery.sql',
      '005_account_profile.sql',
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
      .overrideProvider(RecoveryMailer)
      .useValue({
        sendCode: (email: string, code: string) => {
          if (mailFails)
            return Promise.reject(new Error('private provider failure'));
          deliveries.push({ email, code });
          return blockedDelivery ?? Promise.resolve();
        },
        sendChanged: (email: string) => {
          if (noticeFails)
            return Promise.reject(new Error('private transport error'));
          notices.push(email);
          return Promise.resolve();
        },
      })
      .compile();
    app = fixture.createNestApplication();
    await app.init();
    passwordHash = await app
      .get(RegistrationCrypto)
      .hashPassword(originalPassword);
    jest
      .spyOn(app.get(RegistrationCrypto), 'code')
      .mockImplementation(() => String(codeSequence++));
  }, 30_000);
  beforeEach(async () => {
    deliveries = [];
    notices = [];
    mailFails = false;
    noticeFails = false;
    blockedDelivery = undefined;
    await db.exec(
      'TRUNCATE accounts,registration_events,auth_attempts CASCADE',
    );
    await db.query(
      "INSERT INTO accounts(id,email,platform_role) VALUES($1,'cliente@example.test','CUSTOMER')",
      [account],
    );
    await db.query(
      'INSERT INTO account_credentials(account_id,password_hash) VALUES($1,$2)',
      [account, passwordHash],
    );
  });
  afterEach(async () => {
    await app.get(RecoveryDelivery).onModuleDestroy();
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
  const start = async (email = 'cliente@example.test'): Promise<Pending> =>
    (
      await request(app.getHttpServer())
        .post('/auth/recovery')
        .send({ email })
        .expect(202)
    ).body as Pending;
  const verify = (id: string, code: string) =>
    request(app.getHttpServer())
      .post('/auth/recovery/verify')
      .send({ recoveryId: id, code });
  const reset = (token: string, password = newPassword) =>
    request(app.getHttpServer())
      .post('/auth/recovery/reset')
      .send({ resetToken: token, password, passwordConfirmation: password });
  const grant = async () => {
    const flow = await start();
    const code = deliveries.at(-1)!.code;
    const proof = await verify(flow.recoveryId, code).expect(200);
    return {
      flow,
      code,
      token: (proof.body as { resetToken: string }).resetToken,
    };
  };
  const login = (password = originalPassword) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'cliente@example.test', password });
  const ageSends = () =>
    db.exec(
      "UPDATE registration_events SET created_at=created_at-interval '61 seconds' WHERE kind='send'",
    );

  it('normalizes email and keeps unknown, password and Google-only responses indistinguishable', async () => {
    const known = await start(' CLIENTE@EXAMPLE.TEST ');
    const missing = await start('missing@example.test');
    await db.query("INSERT INTO accounts(email) VALUES('google@example.test')");
    const google = await start('google@example.test');
    expect(known.message).toBe(missing.message);
    expect(google.message).toBe(missing.message);
    for (const flow of [known, missing, google]) {
      expect(flow.recoveryId).toMatch(/^[a-f0-9-]{36}$/);
      expect(Object.keys(flow).sort()).toEqual([
        'expiresAt',
        'message',
        'recoveryId',
        'resendAvailableAt',
      ]);
    }
    expect(deliveries).toHaveLength(1);
    const stored = (
      await db.query<{ otp_digest: string }>(
        'SELECT otp_digest FROM password_recovery_challenges WHERE id=$1',
        [known.recoveryId],
      )
    ).rows[0];
    expect(stored.otp_digest).toHaveLength(64);
    expect(stored.otp_digest).not.toBe(deliveries[0].code);
    await verify(missing.recoveryId, '000000').expect(400);
  });
  it('changes password, revokes all sessions, audits, notifies and consumes every grant atomically', async () => {
    const session = (await login().expect(200)).body as {
      sessionToken: string;
    };
    const second = (await login().expect(200)).body as { sessionToken: string };
    const proof = await grant();
    expect((await reset(proof.token).expect(200)).body as unknown).toEqual({
      status: 'PASSWORD_CHANGED',
      message: expect.any(String) as unknown,
    });
    for (const token of [session.sessionToken, second.sessionToken])
      await request(app.getHttpServer())
        .get('/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
    await login().expect(401);
    await login(newPassword).expect(200);
    await reset(proof.token).expect(400);
    await verify(proof.flow.recoveryId, proof.code).expect(400);
    expect(
      (await db.query('SELECT * FROM account_security_events')).rows,
    ).toHaveLength(1);
    expect(
      (await db.query('SELECT * FROM password_recovery_notifications')).rows,
    ).toHaveLength(1);
    await app.get(RecoveryDelivery).onModuleDestroy();
    await ageSends();
    await app.get(RecoveryDelivery).flushNotifications();
    expect(notices).toEqual(['cliente@example.test']);
  });
  it('keeps attempts and process expiry across resend and restart, and enforces cooldown', async () => {
    const flow = await start(),
      oldCode = deliveries.at(-1)!.code;
    await request(app.getHttpServer())
      .post('/auth/recovery/resend')
      .send({ recoveryId: flow.recoveryId })
      .expect(429);
    await verify(flow.recoveryId, '999999').expect(400);
    await ageSends();
    const resent = (
      await request(app.getHttpServer())
        .post('/auth/recovery/resend')
        .send({ recoveryId: flow.recoveryId })
        .expect(202)
    ).body as Pending;
    expect(resent.expiresAt).toBe(flow.expiresAt);
    await verify(flow.recoveryId, oldCode).expect(400);
    await ageSends();
    const restarted = await start();
    expect(restarted.expiresAt).toBe(flow.expiresAt);
    expect(restarted.recoveryId).not.toBe(flow.recoveryId);
    expect(
      (
        await db.query<{ failed_attempts: number }>(
          'SELECT failed_attempts FROM password_recovery_challenges WHERE id=$1',
          [restarted.recoveryId],
        )
      ).rows[0].failed_attempts,
    ).toBe(2);
    for (let i = 0; i < 3; i++)
      await verify(restarted.recoveryId, '999999').expect(400);
    await verify(restarted.recoveryId, deliveries.at(-1)!.code).expect(400);
    await login().expect(200);
  });
  it('rejects expired OTP/grants and never lets a recovery proof authorize protected routes', async () => {
    const proof = await grant();
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(proof.token, { type: 'bearer' })
      .expect(401);
    await db.exec(
      "UPDATE password_recovery_challenges SET grant_expires_at=now()-interval '1 second'",
    );
    await reset(proof.token).expect(400);
    await ageSends();
    const flow = await start();
    await db.exec(
      "UPDATE password_recovery_challenges SET expires_at=now()-interval '1 second'",
    );
    await verify(flow.recoveryId, deliveries.at(-1)!.code).expect(400);
  });
  it('validates confirmations/policy without consuming valid grants and prevents concurrent replay', async () => {
    const proof = await grant();
    await request(app.getHttpServer())
      .post('/auth/recovery/reset')
      .send({
        resetToken: proof.token,
        password: newPassword,
        passwordConfirmation: 'different',
      })
      .expect(400);
    await reset(proof.token, 'short').expect(400);
    const responses = await Promise.all([
      reset(proof.token),
      reset(proof.token),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(
      (await db.query('SELECT * FROM account_security_events')).rows,
    ).toHaveLength(1);
  });
  it('shares persistent email/global quotas with registration, including nonexistent contacts', async () => {
    const email = 'missing@example.test';
    await start(email);
    await request(app.getHttpServer())
      .post('/auth/registrations')
      .send({ email, password: newPassword })
      .expect(429);
    for (let i = 0; i < 4; i++) {
      await ageSends();
      await start(email);
    }
    await ageSends();
    await request(app.getHttpServer())
      .post('/auth/recovery')
      .send({ email })
      .expect(429);
  });
  it('does not disclose provider errors and reserves quota on failed/uncertain delivery', async () => {
    mailFails = true;
    const flow = await start();
    await app.get(RecoveryDelivery).onModuleDestroy();
    expect(
      (
        await db.query<{ delivery_state: string }>(
          'SELECT delivery_state FROM password_recovery_challenges WHERE id=$1',
          [flow.recoveryId],
        )
      ).rows[0].delivery_state,
    ).toBe('failed');
    expect(
      (await db.query("SELECT * FROM registration_events WHERE kind='send'"))
        .rows,
    ).toHaveLength(1);
  });
  it('rejects mass assignment and proofs belonging to another process', async () => {
    await request(app.getHttpServer())
      .post('/auth/recovery')
      .send({ email: 'cliente@example.test', accountId: account })
      .expect(400);
    const flow = await start();
    await verify(randomUUID(), deliveries.at(-1)!.code).expect(400);
    await verify(flow.recoveryId, '123').expect(400);
  });

  it('rejects a grant if its credential changed after verification', async () => {
    const proof = await grant();
    const otherHash = await app
      .get(RegistrationCrypto)
      .hashPassword(newPassword);
    await db.query(
      'UPDATE account_credentials SET password_hash=$2 WHERE account_id=$1',
      [account, otherHash],
    );
    await reset(proof.token).expect(400);
    expect(
      (await db.query('SELECT * FROM account_security_events')).rows,
    ).toHaveLength(0);
    await login(newPassword).expect(200);
  });

  it('returns the generic response without waiting for the email provider', async () => {
    let release!: () => void;
    blockedDelivery = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      const flow = await start();
      expect(flow.message).toContain('Si existe');
      expect(
        (
          await db.query<{ delivery_state: string }>(
            'SELECT delivery_state FROM password_recovery_challenges WHERE id=$1',
            [flow.recoveryId],
          )
        ).rows[0].delivery_state,
      ).toBe('pending');
    } finally {
      release();
    }
  });

  it('rejects a password login when reset wins between verification and session creation', async () => {
    const database = app.get(DatabaseService);
    const transact = database.transaction.bind(
      database,
    ) as DatabaseService['transaction'];
    const replacement = await app
      .get(RegistrationCrypto)
      .hashPassword(newPassword);
    const spy = jest
      .spyOn(database, 'transaction')
      .mockImplementationOnce(async (work) => {
        // Controlled interleaving: another recovery changed the credential after
        // Argon2 verification, but before login acquired its credential lock.
        await db.query(
          'UPDATE account_credentials SET password_hash=$2 WHERE account_id=$1',
          [account, replacement],
        );
        return transact(work);
      });
    try {
      await expect(
        app
          .get(AuthService)
          .login({ email: 'cliente@example.test', password: originalPassword }),
      ).rejects.toThrow();
      expect((await db.query('SELECT * FROM auth_sessions')).rows).toHaveLength(
        0,
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('persists security notices and retries delivery without rolling back a password reset', async () => {
    const proof = await grant();
    await reset(proof.token).expect(200);
    await app.get(RecoveryDelivery).onModuleDestroy();
    await ageSends();
    noticeFails = true;
    await app.get(RecoveryDelivery).flushNotifications();
    expect(
      (
        await db.query<{ delivered_at: Date | null }>(
          'SELECT delivered_at FROM password_recovery_notifications',
        )
      ).rows[0].delivered_at,
    ).toBeNull();
    await login(newPassword).expect(200);
    await ageSends();
    await db.exec(
      "UPDATE password_recovery_notifications SET lease_until=now()-interval '1 second'",
    );
    noticeFails = false;
    await app.get(RecoveryDelivery).flushNotifications();
    expect(notices).toEqual(['cliente@example.test']);
  });
});
