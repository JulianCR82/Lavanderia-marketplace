import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import {
  AccountProfile,
  ClientPlatform,
  SessionContext,
  SessionGrant,
  SessionSummary,
} from './session.types';

interface SessionRow {
  id: string;
  client_platform: ClientPlatform | null;
  created_at: Date;
  expires_at: Date;
}

@Injectable()
export class SessionService {
  constructor(private readonly database: DatabaseService) {}

  digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Used inside account creation transactions: never commit a provisional session. */
  async issue(
    client: PoolClient,
    accountId: string,
    platform: ClientPlatform | null = null,
  ): Promise<SessionGrant> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    await client.query(
      'INSERT INTO auth_sessions(account_id,token_hash,expires_at,client_platform) VALUES ($1,$2,$3,$4)',
      [accountId, this.digest(token), expiresAt, platform],
    );
    return { sessionToken: token, expiresAt: expiresAt.toISOString() };
  }

  async resolve(token: string): Promise<SessionContext> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Sesión inválida o vencida.',
      });
    const { rows } = await this.database.query<{
      session_id: string;
      session_created_at: Date;
      id: string;
      email: string | null;
      display_name: string | null;
      platform_role: AccountProfile['platformRole'];
      account_kind: AccountProfile['accountKind'];
      is_development_fixture: boolean;
    }>(
      `
      SELECT s.id AS session_id,s.created_at AS session_created_at,a.id,a.email,a.display_name,a.platform_role,a.account_kind,a.is_development_fixture
      FROM auth_sessions s JOIN accounts a ON a.id=s.account_id
      WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
      [this.digest(token)],
    );
    const account = rows[0];
    if (
      !account ||
      (account.is_development_fixture &&
        !['development', 'test'].includes(process.env.NODE_ENV ?? ''))
    )
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Sesión inválida o vencida.',
      });
    const memberships = await this.database.query<{
      laundryId: string;
      laundryName: string;
      role: 'OWNER' | 'STAFF';
    }>(
      `
      SELECT m.laundry_id AS "laundryId",l.name AS "laundryName",m.role
      FROM laundry_memberships m JOIN laundries l ON l.id=m.laundry_id WHERE m.account_id=$1 ORDER BY l.name,m.laundry_id`,
      [account.id],
    );
    return {
      sessionId: account.session_id,
      createdAt: account.session_created_at,
      profile: {
        id: account.id,
        email: account.email,
        displayName: account.display_name,
        platformRole: account.platform_role,
        accountKind: account.account_kind,
        memberships: memberships.rows,
      },
    };
  }

  async list(context: SessionContext, cursor?: string) {
    const current = await this.database.query<SessionRow>(
      `SELECT id,client_platform,created_at,expires_at FROM auth_sessions
       WHERE id=$1 AND account_id=$2 AND revoked_at IS NULL AND expires_at>now()`,
      [context.sessionId, context.profile.id],
    );
    if (!current.rows[0])
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Sesión inválida o vencida.',
      });
    const result = await this.database.query<SessionRow>(
      `SELECT id,client_platform,created_at,expires_at FROM auth_sessions
       WHERE account_id=$1 AND id<>$2 AND revoked_at IS NULL AND expires_at>now()
       AND ($3::uuid IS NULL OR (created_at,id)<
         (SELECT created_at,id FROM auth_sessions WHERE id=$3 AND account_id=$1))
       ORDER BY created_at DESC,id DESC LIMIT 21`,
      [context.profile.id, context.sessionId, cursor ?? null],
    );
    const rows = result.rows.slice(0, 20);
    const last = rows.at(-1);
    const summary = (row: SessionRow): SessionSummary => ({
      id: row.id,
      platform: row.client_platform,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      isCurrent: row.id === context.sessionId,
    });
    return {
      currentSession: summary(current.rows[0]),
      sessions: rows.map(summary),
      nextCursor: result.rows.length > 20 && last ? last.id : null,
    };
  }

  async revoke(
    context: SessionContext,
    targetId = context.sessionId,
    action: 'SESSION_REVOKED' | 'SESSION_LOGOUT' = 'SESSION_REVOKED',
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      const changed = await client.query(
        'UPDATE auth_sessions SET revoked_at=now() WHERE id=$1 AND account_id=$2 AND revoked_at IS NULL RETURNING id',
        [targetId, context.profile.id],
      );
      if (!changed.rowCount) {
        const own = await client.query(
          'SELECT id FROM auth_sessions WHERE id=$1 AND account_id=$2',
          [targetId, context.profile.id],
        );
        if (!own.rowCount)
          throw new NotFoundException({
            code: 'SESSION_NOT_FOUND',
            message: 'No encontramos esa sesión.',
          });
        return;
      }
      await client.query(
        'INSERT INTO account_security_events(account_id,action,actor_session_id,target_session_id) VALUES ($1,$2,$3,$4)',
        [context.profile.id, action, context.sessionId, targetId],
      );
    });
  }
}
