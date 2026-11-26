import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { argon2id, hash } from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  DatabaseService,
  POSTGRES_POOL,
} from '../src/database/database.service';
import { SessionService } from '../src/sessions/session.service';
import type { SessionGrant } from '../src/sessions/session.types';
import { StaffMailer } from '../src/staff/staff-mailer';
import { registrationDatabase } from './registration-database';

describe('US-003.01 staff invitation and exclusive account conversion', () => {
  let app: INestApplication<App>;
  let db: Awaited<ReturnType<typeof registrationDatabase>>['db'];
  let deliveries: string[] = [];
  let mailFails = false;
  let passwordHash: string;
  const password = 'La ropa de la prueba de invitaciones 🧺';
  const ids = {
    owner: 'a1000000-0000-4000-8000-000000000001',
    customer: 'a1000000-0000-4000-8000-000000000002',
    other: 'a1000000-0000-4000-8000-000000000003',
    staff: 'a1000000-0000-4000-8000-000000000004',
    admin: 'a1000000-0000-4000-8000-000000000005',
    ownerB: 'a1000000-0000-4000-8000-000000000006',
  };
  const laundryA = 'a2000000-0000-4000-8000-000000000001';
  const laundryB = 'a2000000-0000-4000-8000-000000000002';
  const key = process.env.REGISTRATION_HMAC_KEY;
  beforeAll(async () => {
    process.env.REGISTRATION_HMAC_KEY =
      'staff-tests-only-key-with-more-than-32-bytes';
    const database = await registrationDatabase();
    db = database.db;
    const directory = join(__dirname, '../migrations');
    for (const name of readdirSync(directory)
      .filter((name) => name.endsWith('.sql'))
      .sort())
      await db.exec(readFileSync(join(directory, name), 'utf8'));
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(POSTGRES_POOL)
      .useValue(database.pool)
      .overrideProvider(StaffMailer)
      .useValue({
        send: (email: string) => {
          if (mailFails)
            return Promise.reject(new Error('private mail failure'));
          deliveries.push(email);
          return Promise.resolve();
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }, 30000);
  beforeEach(async () => {
    deliveries = [];
    mailFails = false;
    await db.exec(
      'TRUNCATE accounts,laundries,auth_attempts,registration_events CASCADE',
    );
    for (const [name, id] of Object.entries(ids)) {
      await db.query(
        'INSERT INTO accounts(id,email,display_name,platform_role) VALUES($1,$2,$3,$4)',
        [
          id,
          `${name}@example.test`,
          name,
          name === 'admin' ? 'PLATFORM_ADMIN' : 'CUSTOMER',
        ],
      );
      await db.query(
        'INSERT INTO account_credentials(account_id,password_hash) VALUES($1,$2)',
        [id, passwordHash],
      );
    }
    await db.query(
      "INSERT INTO laundries(id,name) VALUES($1,'Prueba A'),($2,'Prueba B')",
      [laundryA, laundryB],
    );
    await db.query(
      "INSERT INTO laundry_memberships(laundry_id,account_id,role) VALUES($1,$2,'OWNER'),($1,$3,'STAFF'),($4,$5,'OWNER')",
      [laundryA, ids.owner, ids.staff, laundryB, ids.ownerB],
    );
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await db?.close();
      if (key === undefined) delete process.env.REGISTRATION_HMAC_KEY;
      else process.env.REGISTRATION_HMAC_KEY = key;
    }
  });
  async function token(accountId = ids.customer) {
    return (
      await app
        .get(DatabaseService)
        .transaction((client) =>
          app.get(SessionService).issue(client, accountId, 'android'),
        )
    ).sessionToken;
  }
  const get = (path: string, t: string) =>
    request(app.getHttpServer()).get(path).auth(t, { type: 'bearer' });
  const invite = (
    t: string,
    body: object = { email: 'customer@example.test' },
    laundry = laundryA,
  ) =>
    request(app.getHttpServer())
      .post(`/laundries/${laundry}/staff-invitations`)
      .auth(t, { type: 'bearer' })
      .send(body);
  const accept = (t: string, id: string, body: object = { confirm: true }) =>
    request(app.getHttpServer())
      .post(`/staff/invitations/${id}/accept`)
      .auth(t, { type: 'bearer' })
      .send(body);
  async function pending() {
    return (
      (await invite(await token(ids.owner)).expect(201)).body as { id: string }
    ).id;
  }

  it('requires a session and OWNER of this laundry, rejecting role and ID injection', async () => {
    await request(app.getHttpServer()).get('/staff/invitations').expect(401);
    for (const account of [ids.customer, ids.staff, ids.admin, ids.ownerB])
      await invite(await token(account)).expect(403);
    const owner = await token(ids.owner);
    await invite(owner, {
      email: 'customer@example.test',
      role: 'OWNER',
    }).expect(400);
    await invite(owner, { email: 'invalid' }).expect(400);
    await invite(owner, {
      email: 'customer@example.test',
      laundryId: laundryB,
    }).expect(400);
    expect(
      (await db.query('SELECT * FROM staff_invitations')).rows,
    ).toHaveLength(0);
  });
  it('normalizes email and grants nothing until acceptance; only the recipient sees it', async () => {
    const owner = await token(ids.owner),
      customer = await token();
    const id = (
      (await invite(owner, { email: '  CUSTOMER@EXAMPLE.TEST  ' }).expect(201))
        .body as { id: string }
    ).id;
    expect(deliveries).toEqual(['customer@example.test']);
    expect(
      (
        (await get('/staff/invitations', customer).expect(200)).body as {
          items: { id: string }[];
        }
      ).items.map((x) => x.id),
    ).toEqual([id]);
    expect(
      (
        (await get('/staff/invitations', await token(ids.other)).expect(200))
          .body as { items: unknown[] }
      ).items,
    ).toEqual([]);
    await accept(await token(ids.other), id).expect(404);
    await get('/customer/access', customer).expect(200);
    await get(`/laundries/${laundryA}/access`, customer).expect(403);
    await get('/staff/invitations?laundryId=' + laundryA, customer).expect(400);
  });
  it('converts the same account, preserves credentials and data, rotates all sessions and denies customer capabilities', async () => {
    const id = await pending(),
      old = await token(),
      otherSession = await token();
    await accept(old, id, { role: 'OWNER' }).expect(400);
    const grant = (await accept(old, id).expect(200)).body as SessionGrant;
    await get('/auth/me', old).expect(401);
    await get('/auth/me', otherSession).expect(401);
    const profile = (await get('/auth/me', grant.sessionToken).expect(200))
      .body as {
      id: string;
      email: string;
      displayName: string;
      accountKind: string;
      memberships: { role: string }[];
    };
    expect(profile).toMatchObject({
      id: ids.customer,
      email: 'customer@example.test',
      displayName: 'customer',
      accountKind: 'LAUNDRY',
      memberships: [{ role: 'STAFF' }],
    });
    await get('/customer/access', grant.sessionToken).expect(403);
    await get('/platform/access', grant.sessionToken).expect(403);
    await get(`/laundries/${laundryA}/access`, grant.sessionToken).expect(200);
    await get(`/laundries/${laundryB}/access`, grant.sessionToken).expect(403);
    expect(
      (
        await db.query(
          'SELECT password_hash FROM account_credentials WHERE account_id=$1',
          [ids.customer],
        )
      ).rows,
    ).toEqual([{ password_hash: passwordHash }]);
    const login = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'customer@example.test', password })
        .expect(200)
    ).body as SessionGrant;
    await get('/customer/access', login.sessionToken).expect(403);
    await accept(grant.sessionToken, id).expect(409);
    expect(
      (
        await db.query(
          "SELECT action FROM laundry_access_events WHERE action='STAFF_ACCEPTED'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it('cancels only within the owner laundry, is idempotent and rejects cancelled invitations', async () => {
    const id = await pending(),
      owner = await token(ids.owner);
    await request(app.getHttpServer())
      .delete(`/laundries/${laundryB}/staff-invitations/${id}`)
      .auth(await token(ids.ownerB), { type: 'bearer' })
      .expect(404);
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .delete(`/laundries/${laundryA}/staff-invitations/${id}`)
        .auth(owner, { type: 'bearer' })
        .expect(204);
    await accept(await token(), id).expect(409);
    expect(
      (
        await db.query(
          "SELECT action FROM laundry_access_events WHERE action='INVITATION_CANCELLED'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it('rejects expired invitations without converting the account', async () => {
    const id = await pending();
    await db.query(
      "UPDATE staff_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",
      [id],
    );
    const t = await token();
    await accept(t, id).expect(409);
    await get('/customer/access', t).expect(200);
  });
  it('rechecks the inviting owner before accepting', async () => {
    const id = await pending();
    await db.query('DELETE FROM laundry_memberships WHERE account_id=$1', [
      ids.owner,
    ]);
    const t = await token();
    await accept(t, id).expect(403);
    await get('/customer/access', t).expect(200);
  });
  it('serializes concurrent accepts and produces exactly one membership and audit', async () => {
    const id = await pending(),
      a = await token(),
      b = await token();
    const responses = await Promise.all([accept(a, id), accept(b, id)]);
    expect(responses.map((x) => x.status).sort()).toEqual([200, 401]);
    expect(
      (
        await db.query(
          'SELECT role FROM laundry_memberships WHERE account_id=$1',
          [ids.customer],
        )
      ).rows,
    ).toEqual([{ role: 'STAFF' }]);
    expect(
      (
        await db.query(
          "SELECT action FROM laundry_access_events WHERE action='STAFF_ACCEPTED'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it('rolls conversion, sessions, consumption and audit back if issuing the work session fails', async () => {
    const id = await pending(),
      t = await token();
    const issue = jest
      .spyOn(app.get(SessionService), 'issue')
      .mockRejectedValueOnce(new Error('private database failure'));
    try {
      const response = await accept(t, id).expect(503);
      expect(JSON.stringify(response.body)).not.toContain('private database');
    } finally {
      issue.mockRestore();
    }
    await get('/customer/access', t).expect(200);
    expect(
      (
        await db.query(
          'SELECT accepted_at FROM staff_invitations WHERE id=$1',
          [id],
        )
      ).rows,
    ).toEqual([{ accepted_at: null }]);
    expect(
      (
        await db.query(
          'SELECT * FROM laundry_memberships WHERE account_id=$1',
          [ids.customer],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "SELECT * FROM laundry_access_events WHERE action='STAFF_ACCEPTED'",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it('records delivery failures without granting access and retries the same invitation after cooldown', async () => {
    mailFails = true;
    const owner = await token(ids.owner);
    await invite(owner).expect(503);
    const row = (
      await db.query<{ id: string }>('SELECT id FROM staff_invitations')
    ).rows[0];
    await accept(await token(), row.id).expect(409);
    await invite(owner).expect(409);
    await db.query(
      "UPDATE staff_invitations SET last_delivery_at=now()-interval '2 minutes' WHERE id=$1",
      [row.id],
    );
    await db.exec(
      "UPDATE registration_events SET created_at=created_at-interval '2 minutes'",
    );
    mailFails = false;
    const resent = await invite(owner).expect(201);
    expect((resent.body as { id: string }).id).toBe(row.id);
    expect(
      (await db.query('SELECT id FROM staff_invitations')).rows,
    ).toHaveLength(1);
  });
  it('never downgrades an existing OWNER or grants staff to platform administrators', async () => {
    const owner = await token(ids.owner);
    await invite(owner, { email: 'owner@example.test' }).expect(409);
    const id = (
      (await invite(owner, { email: 'admin@example.test' }).expect(201))
        .body as { id: string }
    ).id;
    await accept(await token(ids.admin), id).expect(403);
  });
  it('keeps a work account exclusive after its last membership is removed', async () => {
    const id = await pending();
    const grant = (await accept(await token(), id).expect(200))
      .body as SessionGrant;
    await db.query('DELETE FROM laundry_memberships WHERE account_id=$1', [
      ids.customer,
    ]);
    await get('/customer/access', grant.sessionToken).expect(403);
    await expect(
      db.query("UPDATE accounts SET account_kind='CUSTOMER' WHERE id=$1", [
        ids.customer,
      ]),
    ).rejects.toThrow();
  });
  it('bounds invitations per laundry even if earlier invitations were cancelled', async () => {
    for (let i = 0; i < 20; i++)
      await db.query(
        'INSERT INTO staff_invitations(laundry_id,invited_by,email,cancelled_at) VALUES($1,$2,$3,now())',
        [laundryA, ids.owner, `quota${i}@example.test`],
      );
    await invite(await token(ids.owner)).expect(429);
    expect(deliveries).toHaveLength(0);
  });

  it('shares the global email budget with registration and recovery', async () => {
    await db.exec(
      "INSERT INTO registration_events(kind,email_key,ip_key) SELECT 'send','other','other' FROM generate_series(1,100)",
    );
    await invite(await token(ids.owner)).expect(429);
    expect(deliveries).toHaveLength(0);
    expect(
      (await db.query('SELECT id FROM staff_invitations')).rows,
    ).toHaveLength(0);
  });

  it('paginates owner invitation history without exposing another laundry or accepting its cursor', async () => {
    for (let i = 0; i < 21; i++)
      await db.query(
        'INSERT INTO staff_invitations(laundry_id,invited_by,email) VALUES($1,$2,$3)',
        [laundryA, ids.owner, `page${i}@example.test`],
      );
    const foreign = (
      await db.query<{ id: string }>(
        'INSERT INTO staff_invitations(laundry_id,invited_by,email) VALUES($1,$2,$3) RETURNING id',
        [laundryB, ids.ownerB, 'private@example.test'],
      )
    ).rows[0].id;
    const t = await token(ids.owner),
      path = `/laundries/${laundryA}/staff-invitations`;
    const first = (await get(path, t).expect(200)).body as {
      items: { id: string; laundryId: string }[];
      nextCursor: string;
    };
    expect(first.items).toHaveLength(20);
    expect(first.items.every((x) => x.laundryId === laundryA)).toBe(true);
    const second = (
      await get(`${path}?cursor=${first.nextCursor}`, t).expect(200)
    ).body as { items: { id: string }[]; nextCursor: null };
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(
      new Set([...first.items, ...second.items].map((x) => x.id)).size,
    ).toBe(21);
    expect(
      (
        (await get(`${path}?cursor=${foreign}`, t).expect(200)).body as {
          items: unknown[];
        }
      ).items,
    ).toEqual([]);
    await get(path, await token(ids.staff)).expect(403);
  });
});

describe('US-003.01 migration 008 existing work accounts', () => {
  it('preserves identities and memberships, classifies existing operators and revokes only their sessions', async () => {
    const { db } = await registrationDatabase();
    try {
      const directory = join(__dirname, '../migrations');
      for (const name of readdirSync(directory)
        .filter((x) => x.endsWith('.sql') && x < '008')
        .sort())
        await db.exec(readFileSync(join(directory, name), 'utf8'));
      await db.exec(`
        INSERT INTO accounts(id,email,display_name) VALUES
        ('b1000000-0000-4000-8000-000000000001','legacy-owner@example.test','Owner'),
        ('b1000000-0000-4000-8000-000000000002','legacy-staff@example.test','Staff'),
        ('b1000000-0000-4000-8000-000000000003','legacy-client@example.test','Customer');
        INSERT INTO laundries(id,name) VALUES('b2000000-0000-4000-8000-000000000001','Legacy');
        INSERT INTO laundry_memberships(laundry_id,account_id,role) VALUES
        ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','OWNER'),
        ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','STAFF');
        INSERT INTO auth_sessions(account_id,token_hash,expires_at)
        SELECT id,encode(digest(id::text,'sha256'),'hex'),now()+interval '7 days' FROM accounts;
      `);
      const before = (
        await db.query(
          'SELECT id,email,display_name,created_at FROM accounts ORDER BY id',
        )
      ).rows;
      const memberships = (
        await db.query('SELECT * FROM laundry_memberships ORDER BY account_id')
      ).rows;
      await db.exec(
        readFileSync(
          join(directory, '008_staff_invitations_and_account_kind.sql'),
          'utf8',
        ),
      );
      expect(
        (
          await db.query(
            'SELECT id,email,display_name,created_at FROM accounts ORDER BY id',
          )
        ).rows,
      ).toEqual(before);
      expect(
        (
          await db.query(
            'SELECT * FROM laundry_memberships ORDER BY account_id',
          )
        ).rows,
      ).toEqual(memberships);
      expect(
        (
          await db.query(
            'SELECT account_kind,revoked_at IS NOT NULL AS revoked FROM accounts a JOIN auth_sessions s ON s.account_id=a.id ORDER BY a.id',
          )
        ).rows,
      ).toEqual([
        { account_kind: 'LAUNDRY', revoked: true },
        { account_kind: 'LAUNDRY', revoked: true },
        { account_kind: 'CUSTOMER', revoked: false },
      ]);
    } finally {
      await db.close();
    }
  }, 30000);
});
