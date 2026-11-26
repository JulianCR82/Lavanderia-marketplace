import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  DatabaseService,
  POSTGRES_POOL,
} from '../src/database/database.service';
import { SessionService } from '../src/sessions/session.service';
import type {
  ClientPlatform,
  SessionSummary,
} from '../src/sessions/session.types';
import { registrationDatabase } from './registration-database';

interface Page {
  currentSession: SessionSummary;
  sessions: SessionSummary[];
  nextCursor: string | null;
}

describe('US-001.05 session management HTTP and PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: Awaited<ReturnType<typeof registrationDatabase>>['db'];
  const owner = '81000000-0000-4000-8000-000000000001';
  const other = '81000000-0000-4000-8000-000000000002';
  const admin = '81000000-0000-4000-8000-000000000003';
  const oldKey = process.env.REGISTRATION_HMAC_KEY;
  beforeAll(async () => {
    process.env.REGISTRATION_HMAC_KEY =
      'session-management-test-only-key-32-bytes';
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
    await db.exec('TRUNCATE accounts CASCADE');
    for (const [id, email, role] of [
      [owner, 'session-owner@example.test', 'CUSTOMER'],
      [other, 'session-other@example.test', 'CUSTOMER'],
      [admin, 'session-admin@example.test', 'PLATFORM_ADMIN'],
    ])
      await db.query(
        'INSERT INTO accounts(id,email,platform_role) VALUES ($1,$2,$3)',
        [id, email, role],
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
  async function issue(
    accountId = owner,
    platform: ClientPlatform | null = null,
  ) {
    const grant = await app
      .get(DatabaseService)
      .transaction((client) =>
        app.get(SessionService).issue(client, accountId, platform),
      );
    const context = await app.get(SessionService).resolve(grant.sessionToken);
    return { token: grant.sessionToken, id: context.sessionId };
  }
  const list = (token: string, query = '') =>
    request(app.getHttpServer())
      .get('/auth/sessions' + query)
      .auth(token, { type: 'bearer' });
  const revoke = (token: string, id: string) =>
    request(app.getHttpServer())
      .delete('/auth/sessions/' + id)
      .auth(token, { type: 'bearer' });
  const me = (token: string) =>
    request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' });

  it('requires a valid session for both endpoints', async () => {
    await request(app.getHttpServer()).get('/auth/sessions').expect(401);
    await request(app.getHttpServer())
      .delete('/auth/sessions/' + randomUUID())
      .expect(401);
    const current = await issue();
    await db.query(
      "UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
      [current.id],
    );
    await list(current.token).expect(401);
    await revoke(current.token, current.id).expect(401);
  });
  it('lists only own active sessions and never returns a verifier or token', async () => {
    const current = await issue(owner, 'android');
    const second = await issue(owner, 'web');
    const legacy = await issue();
    const expired = await issue();
    const revoked = await issue();
    await issue(other);
    await db.query(
      "UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
      [expired.id],
    );
    await db.query('UPDATE auth_sessions SET revoked_at=now() WHERE id=$1', [
      revoked.id,
    ]);
    const response = await list(current.token).expect(200);
    const page = response.body as Page;
    expect(response.headers['cache-control']).toBe('no-store');
    expect(page.currentSession).toMatchObject({
      id: current.id,
      platform: 'android',
      isCurrent: true,
    });
    expect(page.sessions.map((item) => item.id).sort()).toEqual(
      [second.id, legacy.id].sort(),
    );
    expect(page.sessions.every((item) => item.isCurrent === false)).toBe(true);
    expect(
      page.sessions.find((item) => item.id === legacy.id)?.platform,
    ).toBeNull();
    for (const item of [page.currentSession, ...page.sessions])
      expect(Object.keys(item).sort()).toEqual([
        'createdAt',
        'expiresAt',
        'id',
        'isCurrent',
        'platform',
      ]);
    expect(JSON.stringify(page)).not.toContain(current.token);
    expect(page.nextCursor).toBeNull();
  });
  it.each([other, admin])(
    'denies foreign revocation even for account %s',
    async (accountId) => {
      const current = await issue(accountId);
      const target = await issue();
      const foreign = await revoke(current.token, target.id).expect(404);
      const missing = await revoke(current.token, randomUUID()).expect(404);
      expect(foreign.body as unknown).toEqual(missing.body as unknown);
      await me(target.token).expect(200);
      expect(
        (await db.query('SELECT * FROM account_security_events')).rows,
      ).toHaveLength(0);
    },
  );
  it('revokes one session, preserves the others and audits exactly once across retries', async () => {
    const current = await issue();
    const target = await issue();
    const unaffected = await issue();
    await revoke(current.token, target.id).expect(204);
    await me(target.token).expect(401);
    await me(current.token).expect(200);
    await me(unaffected.token).expect(200);
    const first = (
      await db.query<{ revoked_at: Date }>(
        'SELECT revoked_at FROM auth_sessions WHERE id=$1',
        [target.id],
      )
    ).rows[0].revoked_at;
    await revoke(current.token, target.id).expect(204);
    expect(
      (
        await db.query<{ revoked_at: Date }>(
          'SELECT revoked_at FROM auth_sessions WHERE id=$1',
          [target.id],
        )
      ).rows[0].revoked_at,
    ).toEqual(first);
    const events = await db.query(
      'SELECT account_id,action,actor_session_id,target_session_id,created_at FROM account_security_events',
    );
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0]).toMatchObject({
      account_id: owner,
      action: 'SESSION_REVOKED',
      actor_session_id: current.id,
      target_session_id: target.id,
    });
    expect(events.rows[0].created_at).toBeInstanceOf(Date);
  });
  it('closes the current session and rejects subsequent calls', async () => {
    const current = await issue();
    await revoke(current.token, current.id).expect(204);
    await list(current.token).expect(401);
    await me(current.token).expect(401);
  });
  it('keeps logout compatible and records its actor and target', async () => {
    const current = await issue();
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(current.token, { type: 'bearer' })
      .send({})
      .expect(204);
    await me(current.token).expect(401);
    expect(
      (
        await db.query(
          'SELECT action,actor_session_id,target_session_id FROM account_security_events',
        )
      ).rows,
    ).toEqual([
      {
        action: 'SESSION_LOGOUT',
        actor_session_id: current.id,
        target_session_id: current.id,
      },
    ]);
  });
  it('does not duplicate audit when revocations race', async () => {
    const current = await issue();
    const target = await issue();
    const responses = await Promise.all([
      revoke(current.token, target.id),
      revoke(current.token, target.id),
    ]);
    expect(responses.map((response) => response.status)).toEqual([204, 204]);
    expect(
      (await db.query('SELECT * FROM account_security_events')).rows,
    ).toHaveLength(1);
  });
  it('paginates exact database timestamps with ties without omissions or foreign records', async () => {
    const current = await issue();
    const ids: string[] = [];
    for (let i = 0; i < 25; i++) ids.push((await issue()).id);
    await db.query(
      "UPDATE auth_sessions SET created_at='2026-11-24 10:00:00.123456+00' WHERE account_id=$1",
      [owner],
    );
    const foreign = await issue(other);
    const first = (await list(current.token).expect(200)).body as Page;
    expect(first.sessions).toHaveLength(20);
    expect(first.currentSession.id).toBe(current.id);
    const second = (
      await list(current.token, '?cursor=' + first.nextCursor).expect(200)
    ).body as Page;
    expect(second.sessions).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    expect(
      [...first.sessions, ...second.sessions].map((item) => item.id).sort(),
    ).toEqual(ids.sort());
    const scoped = (
      await list(current.token, '?cursor=' + foreign.id).expect(200)
    ).body as Page;
    expect(scoped.sessions).toEqual([]);
  });
  it('validates UUIDs, cursor types and unknown query fields', async () => {
    const current = await issue();
    await revoke(current.token, 'invalid').expect(400);
    await list(current.token, '?cursor=invalid').expect(400);
    await list(current.token, '?accountId=' + other).expect(400);
    await list(current.token, '?cursor[x]=1').expect(400);
  });
  it('rolls back revocation if the audit write fails and redacts internal errors', async () => {
    const current = await issue();
    const target = await issue();
    await db.exec(
      "CREATE FUNCTION reject_session_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private audit write failure'; END; $$; CREATE TRIGGER reject_session_audit BEFORE INSERT ON account_security_events FOR EACH ROW EXECUTE FUNCTION reject_session_audit();",
    );
    try {
      const response = await revoke(current.token, target.id).expect(503);
      expect(JSON.stringify(response.body)).not.toContain('private');
      await me(target.token).expect(200);
      expect(
        (await db.query('SELECT * FROM account_security_events')).rows,
      ).toHaveLength(0);
    } finally {
      await db.exec(
        'DROP TRIGGER reject_session_audit ON account_security_events; DROP FUNCTION reject_session_audit();',
      );
    }
  });
});
