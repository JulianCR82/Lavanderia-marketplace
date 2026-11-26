import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { SessionService } from '../sessions/session.service';
import type { ClientPlatform, SessionContext } from '../sessions/session.types';
import { StaffMailer } from './staff-mailer';
import { RegistrationLimits } from '../registration/registration-limits.service';

export interface Invitation {
  id: string;
  laundryId: string;
  laundryName: string;
  email: string;
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED';
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
}
const fields = `i.id,i.laundry_id AS "laundryId",l.name AS "laundryName",i.email,
  i.delivery_status AS "deliveryStatus",i.created_at AS "createdAt",i.expires_at AS "expiresAt",
  i.accepted_at AS "acceptedAt",i.cancelled_at AS "cancelledAt"`;

@Injectable()
export class StaffService {
  constructor(
    private readonly database: DatabaseService,
    private readonly sessions: SessionService,
    private readonly mailer: StaffMailer,
    private readonly limits: RegistrationLimits,
  ) {}

  private async owner(
    client: PoolClient,
    laundryId: string,
    accountId: string,
  ) {
    const result = await client.query(
      "SELECT 1 FROM laundry_memberships WHERE laundry_id=$1 AND account_id=$2 AND role='OWNER' FOR UPDATE",
      [laundryId, accountId],
    );
    if (!result.rowCount)
      throw new ForbiddenException(
        'Solo el propietario puede administrar invitaciones.',
      );
  }
  private async liveSession(client: PoolClient, context: SessionContext) {
    const result = await client.query(
      'SELECT 1 FROM auth_sessions WHERE id=$1 AND account_id=$2 AND revoked_at IS NULL AND expires_at>now()',
      [context.sessionId, context.profile.id],
    );
    if (!result.rowCount)
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Debes iniciar sesión de nuevo.',
      });
  }
  private async event(
    client: PoolClient,
    laundryId: string,
    invitationId: string,
    actor: string,
    action: string,
  ) {
    await client.query(
      'INSERT INTO laundry_access_events(laundry_id,invitation_id,actor_account_id,action) VALUES($1,$2,$3,$4)',
      [laundryId, invitationId, actor, action],
    );
  }

  async invite(
    context: SessionContext,
    laundryId: string,
    email: string,
    ip: string,
  ) {
    const invitation = await this.database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(74102519)');
      const laundry = await client.query<{ name: string }>(
        'SELECT name FROM laundries WHERE id=$1 FOR UPDATE',
        [laundryId],
      );
      await this.owner(client, laundryId, context.profile.id);
      await this.liveSession(client, context);
      const member = await client.query(
        'SELECT 1 FROM laundry_memberships m JOIN accounts a ON a.id=m.account_id WHERE m.laundry_id=$1 AND lower(a.email)=$2',
        [laundryId, email],
      );
      if (member.rowCount)
        throw new ConflictException(
          'Esa cuenta ya pertenece a esta lavandería.',
        );
      const counts = await client.query<{ total: number }>(
        "SELECT count(*)::int AS total FROM staff_invitations WHERE laundry_id=$1 AND created_at>now()-interval '1 day'",
        [laundryId],
      );
      if (counts.rows[0].total >= 20)
        throw new HttpException(
          'Límite de invitaciones alcanzado. Intenta mañana.',
          429,
        );
      await client.query(
        'UPDATE staff_invitations SET cancelled_at=now() WHERE laundry_id=$1 AND email=$2 AND expires_at<=now() AND accepted_at IS NULL AND cancelled_at IS NULL',
        [laundryId, email],
      );
      const previous = await client.query<{ id: string; retry: boolean }>(
        `SELECT id,(delivery_status IN ('FAILED','PENDING') AND last_delivery_at<now()-interval '1 minute') AS retry FROM staff_invitations WHERE laundry_id=$1 AND email=$2 AND accepted_at IS NULL AND cancelled_at IS NULL FOR UPDATE`,
        [laundryId, email],
      );
      if (previous.rows[0]) {
        if (!previous.rows[0].retry)
          throw new ConflictException(
            'Ya hay una invitación pendiente. Si falló el envío, espera un minuto para reintentar.',
          );
        await this.limits.reserveSend(client, email, ip);
        await client.query(
          "UPDATE staff_invitations SET delivery_status='PENDING',last_delivery_at=now() WHERE id=$1",
          [previous.rows[0].id],
        );
        return { id: previous.rows[0].id, laundryName: laundry.rows[0].name };
      }
      const id = randomUUID();
      await this.limits.reserveSend(client, email, ip);
      await client.query(
        'INSERT INTO staff_invitations(id,laundry_id,invited_by,email) VALUES($1,$2,$3,$4)',
        [id, laundryId, context.profile.id, email],
      );
      await this.event(
        client,
        laundryId,
        id,
        context.profile.id,
        'STAFF_INVITED',
      );
      return { id, laundryName: laundry.rows[0].name };
    });
    try {
      await this.mailer.send(
        email,
        invitation.laundryName,
        `staff-invitation-${invitation.id}`,
      );
      await this.database.query(
        "UPDATE staff_invitations SET delivery_status='SENT' WHERE id=$1",
        [invitation.id],
      );
    } catch {
      await this.database.query(
        "UPDATE staff_invitations SET delivery_status='FAILED' WHERE id=$1",
        [invitation.id],
      );
      throw new ServiceUnavailableException(
        'No pudimos enviar la invitación. Espera un minuto y reintenta; todavía no se concedió acceso.',
      );
    }
    return {
      id: invitation.id,
      message:
        'Invitación enviada. El acceso se concede cuando la persona la acepte.',
    };
  }

  async list(context: SessionContext, laundryId?: string, cursor?: string) {
    // UUID cursor is resolved inside the same tenant/recipient scope, retaining PostgreSQL precision.
    const result = await this.database.query<Invitation>(
      `SELECT ${fields} FROM staff_invitations i JOIN laundries l ON l.id=i.laundry_id
      WHERE ($1::uuid IS NOT NULL AND i.laundry_id=$1 OR $1::uuid IS NULL AND i.email=$2 AND i.delivery_status='SENT' AND i.accepted_at IS NULL AND i.cancelled_at IS NULL AND i.expires_at>now())
      AND ($3::uuid IS NULL OR (i.created_at,i.id)<(SELECT created_at,id FROM staff_invitations WHERE id=$3 AND ($1::uuid IS NOT NULL AND laundry_id=$1 OR $1::uuid IS NULL AND email=$2)))
      ORDER BY i.created_at DESC,i.id DESC LIMIT 21`,
      [
        laundryId ?? null,
        context.profile.email?.toLowerCase() ?? '',
        cursor ?? null,
      ],
    );
    const items = result.rows.slice(0, 20);
    return {
      items,
      nextCursor: result.rows.length > 20 ? items.at(-1)!.id : null,
    };
  }

  async cancel(context: SessionContext, laundryId: string, id: string) {
    await this.database.transaction(async (client) => {
      await client.query('SELECT id FROM laundries WHERE id=$1 FOR UPDATE', [
        laundryId,
      ]);
      await this.owner(client, laundryId, context.profile.id);
      await this.liveSession(client, context);
      const row = await client.query<{
        accepted_at: Date | null;
        cancelled_at: Date | null;
      }>(
        'SELECT accepted_at,cancelled_at FROM staff_invitations WHERE id=$1 AND laundry_id=$2 FOR UPDATE',
        [id, laundryId],
      );
      if (!row.rows[0])
        throw new NotFoundException('No encontramos esa invitación.');
      if (row.rows[0].accepted_at)
        throw new ConflictException('La invitación ya fue aceptada.');
      if (row.rows[0].cancelled_at) return;
      await client.query(
        'UPDATE staff_invitations SET cancelled_at=now() WHERE id=$1',
        [id],
      );
      await this.event(
        client,
        laundryId,
        id,
        context.profile.id,
        'INVITATION_CANCELLED',
      );
    });
  }

  async accept(
    context: SessionContext,
    id: string,
    platform: ClientPlatform | null,
  ) {
    const found = await this.database.query<{
      laundry_id: string;
      invited_by: string;
    }>(
      'SELECT laundry_id,invited_by FROM staff_invitations WHERE id=$1 AND email=$2',
      [id, context.profile.email?.toLowerCase() ?? ''],
    );
    if (!found.rows[0])
      throw new NotFoundException('No encontramos esa invitación.');
    return this.database.transaction(async (client) => {
      const { laundry_id: laundryId, invited_by: invitedBy } = found.rows[0];
      await client.query('SELECT id FROM laundries WHERE id=$1 FOR UPDATE', [
        laundryId,
      ]);
      await this.owner(client, laundryId, invitedBy);
      const account = await client.query<{
        email: string;
        platform_role: string;
      }>('SELECT email,platform_role FROM accounts WHERE id=$1 FOR UPDATE', [
        context.profile.id,
      ]);
      await this.liveSession(client, context);
      if (account.rows[0]?.platform_role !== 'CUSTOMER')
        throw new ForbiddenException(
          'Una cuenta de administración no puede aceptar invitaciones de staff.',
        );
      const invitation = await client.query<{
        email: string;
        available: boolean;
      }>(
        "SELECT email,(delivery_status='SENT' AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at>now()) AS available FROM staff_invitations WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (
        !invitation.rows[0]?.available ||
        invitation.rows[0].email !== account.rows[0].email?.toLowerCase()
      )
        throw new ConflictException(
          'La invitación venció, fue cancelada o ya se utilizó.',
        );
      const existing = await client.query(
        'SELECT 1 FROM laundry_memberships WHERE laundry_id=$1 AND account_id=$2',
        [laundryId, context.profile.id],
      );
      if (existing.rowCount)
        throw new ConflictException('Ya tienes acceso a esta lavandería.');
      // The database trigger persists LAUNDRY and revokes client sessions on conversion.
      await client.query(
        "INSERT INTO laundry_memberships(laundry_id,account_id,role) VALUES($1,$2,'STAFF')",
        [laundryId, context.profile.id],
      );
      await client.query(
        'UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=$1',
        [context.profile.id],
      );
      await client.query(
        'UPDATE staff_invitations SET accepted_at=now(),accepted_by=$2 WHERE id=$1',
        [id, context.profile.id],
      );
      await this.event(
        client,
        laundryId,
        id,
        context.profile.id,
        'STAFF_ACCEPTED',
      );
      return this.sessions.issue(client, context.profile.id, platform);
    });
  }
}
