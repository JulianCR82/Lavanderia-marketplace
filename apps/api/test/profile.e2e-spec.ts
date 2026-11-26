import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  DatabaseService,
  POSTGRES_POOL,
} from '../src/database/database.service';
import { SessionService } from '../src/sessions/session.service';
import type { AccountProfile } from '../src/sessions/session.types';
import { ProfileService } from '../src/profile/profile.service';
import { registrationDatabase } from './registration-database';

describe('US-001.04 own profile HTTP and SQL', () => {
  let app: INestApplication<App>;
  let db: Awaited<ReturnType<typeof registrationDatabase>>['db'];
  const customer = '60000000-0000-4000-8000-000000000001';
  const owner = '60000000-0000-4000-8000-000000000002';
  const admin = '60000000-0000-4000-8000-000000000003';
  const laundry = '70000000-0000-4000-8000-000000000001';
  const oldKey = process.env.REGISTRATION_HMAC_KEY;

  beforeAll(async () => {
    process.env.REGISTRATION_HMAC_KEY =
      'profile-test-key-with-at-least-32-bytes';
    const database = await registrationDatabase();
    db = database.db;
    const directory = join(__dirname, '../migrations');
    for (const name of readdirSync(directory)
      .filter((file) => file.endsWith('.sql'))
      .sort())
      await db.exec(readFileSync(join(directory, name), 'utf8'));
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(POSTGRES_POOL)
      .useValue(database.pool)
      .compile();
    app = fixture.createNestApplication();
    await app.init();
  }, 30000);

  beforeEach(async () => {
    await db.exec('TRUNCATE accounts,laundries CASCADE');
    for (const [id, email, role] of [
      [customer, 'profile-customer@example.test', 'CUSTOMER'],
      [owner, 'profile-owner@example.test', 'CUSTOMER'],
      [admin, 'profile-admin@example.test', 'PLATFORM_ADMIN'],
    ])
      await db.query(
        'INSERT INTO accounts(id,email,platform_role) VALUES($1,$2,$3)',
        [id, email, role],
      );
    await db.query(
      "INSERT INTO laundries(id,name) VALUES($1,'Lavandería de prueba')",
      [laundry],
    );
    await db.query(
      "INSERT INTO laundry_memberships(account_id,laundry_id,role) VALUES($1,$2,'OWNER')",
      [owner, laundry],
    );
    await db.query(
      "INSERT INTO account_identities(provider,subject,account_id) VALUES('google','stable-google-id',$1)",
      [customer],
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

  async function token(accountId = customer) {
    const grant = await app
      .get(DatabaseService)
      .transaction((client) =>
        app.get(SessionService).issue(client, accountId),
      );
    return grant.sessionToken;
  }
  const update = (sessionToken: string, body: unknown) =>
    request(app.getHttpServer())
      .patch('/profile/me')
      .auth(sessionToken, { type: 'bearer' })
      .send(body as object);
  const me = (sessionToken: string) =>
    request(app.getHttpServer())
      .get('/auth/me')
      .auth(sessionToken, { type: 'bearer' });

  it('requires an active session and rejects expired or revoked sessions', async () => {
    await request(app.getHttpServer())
      .patch('/profile/me')
      .send({ displayName: 'Ana' })
      .expect(401);
    const expired = await token();
    await db.exec(
      "UPDATE auth_sessions SET expires_at=now()-interval '1 second'",
    );
    await update(expired, { displayName: 'Ana' }).expect(401);
    const revoked = await token();
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(revoked, { type: 'bearer' })
      .expect(204);
    await update(revoked, { displayName: 'Ana' }).expect(401);
    expect(
      (
        await db.query('SELECT display_name FROM accounts WHERE id=$1', [
          customer,
        ])
      ).rows[0].display_name,
    ).toBeNull();
  });

  it('normalizes, persists and clears only the current account name; retries preserve identity', async () => {
    const sessionToken = await token();
    const first = await update(sessionToken, {
      displayName: "  Jose\u0301 D'Angelo  ",
    }).expect(200);
    expect(first.headers['cache-control']).toBe('no-store');
    expect((first.body as AccountProfile).displayName).toBe("José D'Angelo");
    await update(sessionToken, { displayName: "José D'Angelo" }).expect(200);
    expect(
      ((await me(sessionToken).expect(200)).body as AccountProfile).displayName,
    ).toBe("José D'Angelo");
    const rows = (
      await db.query(
        'SELECT id,display_name,email,platform_role FROM accounts ORDER BY id',
      )
    ).rows;
    expect(rows[0]).toMatchObject({
      id: customer,
      email: 'profile-customer@example.test',
      platform_role: 'CUSTOMER',
    });
    expect(rows.slice(1).every((row) => row.display_name === null)).toBe(true);
    expect(
      (
        await db.query(
          'SELECT subject FROM account_identities WHERE account_id=$1',
          [customer],
        )
      ).rows[0].subject,
    ).toBe('stable-google-id');
    await update(sessionToken, { displayName: '   ' }).expect(200);
    expect(
      ((await me(sessionToken).expect(200)).body as AccountProfile).displayName,
    ).toBeNull();
  });

  it.each([
    {},
    { displayName: null },
    { displayName: 42 },
    { displayName: ['Ana'] },
    { displayName: 'a'.repeat(81) },
    { displayName: 'Ana\nMaría' },
    { displayName: 'Ana\u202e' },
    { displayName: 'Ana', email: 'other@example.test' },
    { displayName: 'Ana', id: owner },
    { displayName: 'Ana', accountId: owner },
    { displayName: 'Ana', platformRole: 'PLATFORM_ADMIN' },
    {
      displayName: 'Ana',
      memberships: [{ laundryId: laundry, role: 'OWNER' }],
    },
  ])(
    'rejects invalid or forbidden input without changing an account: %j',
    async (body) => {
      await update(await token(), body).expect(400);
      expect(
        (
          await db.query('SELECT display_name FROM accounts WHERE id=$1', [
            customer,
          ])
        ).rows[0].display_name,
      ).toBeNull();
    },
  );

  it('accepts the length boundary and arbitrary text as data, not SQL', async () => {
    const sessionToken = await token();
    await update(sessionToken, { displayName: 'a'.repeat(80) }).expect(200);
    const name =
      "D'Angelo; UPDATE accounts SET platform_role='PLATFORM_ADMIN'; --";
    const result = await update(sessionToken, { displayName: name }).expect(
      200,
    );
    expect((result.body as AccountProfile).displayName).toBe(name);
    expect((result.body as AccountProfile).platformRole).toBe('CUSTOMER');
  });

  it('allows members and administrators to edit themselves without altering memberships', async () => {
    const memberResult = await update(await token(owner), {
      displayName: 'Responsable',
    }).expect(200);
    expect((memberResult.body as AccountProfile).memberships).toEqual([
      {
        laundryId: laundry,
        laundryName: 'Lavandería de prueba',
        role: 'OWNER',
      },
    ]);
    await update(await token(admin), { displayName: 'Administración' }).expect(
      200,
    );
    const adminAttempt = await token(admin);
    await request(app.getHttpServer())
      .patch(`/profile/${customer}`)
      .auth(adminAttempt, { type: 'bearer' })
      .send({ displayName: 'Otro' })
      .expect(404);
    expect(
      (
        await db.query('SELECT display_name FROM accounts WHERE id=$1', [
          customer,
        ])
      ).rows[0].display_name,
    ).toBeNull();
  });

  it('enforces the name constraint at the persistence boundary', async () => {
    await expect(
      db.query('UPDATE accounts SET display_name=$2 WHERE id=$1', [
        customer,
        'a'.repeat(81),
      ]),
    ).rejects.toThrow();
    await expect(
      db.query('UPDATE accounts SET display_name=$2 WHERE id=$1', [
        customer,
        '',
      ]),
    ).rejects.toThrow();
  });

  it('redacts persistence failures and leaves the saved profile intact', async () => {
    const sessionToken = await token();
    const spy = jest
      .spyOn(app.get(ProfileService), 'update')
      .mockRejectedValueOnce(new Error('private SQL details'));
    try {
      const result = await update(sessionToken, { displayName: 'Ana' }).expect(
        503,
      );
      expect(result.body).toEqual({
        code: 'PROFILE_UNAVAILABLE',
        message: 'No pudimos guardar tu perfil. Intenta de nuevo.',
      });
      expect(JSON.stringify(result.body)).not.toContain('SQL');
    } finally {
      spy.mockRestore();
    }
    expect(
      ((await me(sessionToken).expect(200)).body as AccountProfile).displayName,
    ).toBeNull();
  });
});
