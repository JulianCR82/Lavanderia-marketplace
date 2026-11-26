import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { RegistrationCrypto } from '../registration/registration-crypto.service';
import { RegistrationLimits } from '../registration/registration-limits.service';
import { RecoveryDelivery } from './recovery-delivery.service';
import { RequestRecoveryDto, ResetPasswordDto } from './recovery.dto';
import { RecoveryStore, RecoveryChallenge } from './recovery.store';

const LIFETIME = 10 * 60_000;
const GRANT_LIFETIME = 5 * 60_000;
@Injectable()
export class RecoveryService {
  constructor(
    private readonly store: RecoveryStore,
    private readonly crypto: RegistrationCrypto,
    private readonly limits: RegistrationLimits,
    private readonly delivery: RecoveryDelivery,
  ) {}

  async request(input: RequestRecoveryDto, ip: string) {
    const id = randomUUID(),
      code = this.crypto.code();
    const result = await this.store.locked(async (client) => {
      // Reserve even for unknown/Google-only contacts: quotas must not enumerate accounts.
      await this.limits.reserveSend(client, input.email, ip);
      const { rows: accounts } = await client.query<{
        id: string;
        password_hash: string;
      }>(
        `SELECT a.id,c.password_hash FROM accounts a JOIN account_credentials c ON c.account_id=a.id
     WHERE lower(a.email)=$1 AND (NOT a.is_development_fixture OR $2::boolean)`,
        [
          input.email,
          ['development', 'test'].includes(process.env.NODE_ENV ?? ''),
        ],
      );
      const { rows: previous } = await client.query<RecoveryChallenge>(
        'SELECT * FROM password_recovery_challenges WHERE email=$1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE',
        [input.email],
      );
      // Restarting/resending within a process cannot refund failed attempts or its lifetime.
      const active =
        previous[0] && previous[0].created_at.getTime() + LIFETIME > Date.now()
          ? previous[0]
          : undefined;
      const created = active?.created_at ?? new Date();
      const expires = new Date(created.getTime() + LIFETIME);
      await client.query(
        'DELETE FROM password_recovery_challenges WHERE email=$1',
        [input.email],
      );
      await client.query(
        `INSERT INTO password_recovery_challenges(id,email,account_id,credential_hash,otp_digest,failed_attempts,created_at,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id,
          input.email,
          accounts[0]?.id ?? null,
          accounts[0]?.password_hash ?? null,
          this.crypto.digest('password-recovery', id, input.email, code),
          active?.failed_attempts ?? 0,
          created,
          expires,
        ],
      );
      return {
        email: input.email,
        eligible: !!accounts[0] && (active?.failed_attempts ?? 0) < 5,
        expires,
      };
    });
    if (result.eligible) this.delivery.sendCode(id, result.email, code);
    return this.pending(id, result.expires);
  }

  async resend(id: string, ip: string) {
    const code = this.crypto.code();
    const challenge = await this.store.locked(async (client) => {
      const found = await this.store.find(client, id);
      if (
        !found ||
        found.consumed_at ||
        found.grant_digest ||
        found.failed_attempts >= 5 ||
        found.expires_at.getTime() <= Date.now()
      )
        this.invalid();
      await this.limits.reserveSend(client, found.email, ip);
      await client.query(
        "UPDATE password_recovery_challenges SET otp_digest=$2,delivery_state='pending' WHERE id=$1",
        [id, this.crypto.digest('password-recovery', id, found.email, code)],
      );
      return found;
    });
    if (challenge.account_id) this.delivery.sendCode(id, challenge.email, code);
    return this.pending(id, challenge.expires_at);
  }

  async verify(id: string, code: string) {
    const token = randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + GRANT_LIFETIME);
    const valid = await this.store.locked(async (client) => {
      const found = await this.store.find(client, id);
      if (
        !found ||
        found.consumed_at ||
        found.grant_digest ||
        found.failed_attempts >= 5 ||
        found.expires_at.getTime() <= Date.now()
      )
        return false;
      const actual = Buffer.from(
        this.crypto.digest('password-recovery', id, found.email, code),
        'hex',
      );
      const expected = Buffer.from(found.otp_digest, 'hex');
      if (!timingSafeEqual(actual, expected) || !found.account_id) {
        await client.query(
          'UPDATE password_recovery_challenges SET failed_attempts=failed_attempts+1 WHERE id=$1',
          [id],
        );
        return false;
      }
      await client.query(
        'UPDATE password_recovery_challenges SET grant_digest=$2,grant_expires_at=$3 WHERE id=$1',
        [id, this.crypto.digest('password-reset-grant', token), expires],
      );
      return true;
    });
    if (!valid) this.invalid();
    // This is a short-lived, single-purpose capability, never an application session.
    return { resetToken: token, expiresAt: expires.toISOString() };
  }

  async reset(input: ResetPasswordDto) {
    if (input.password !== input.passwordConfirmation)
      throw new BadRequestException({
        code: 'PASSWORD_MISMATCH',
        message: 'Las contraseñas no coinciden.',
      });
    const passwordHash = await this.crypto.hashPassword(input.password);
    const valid = await this.store.locked(async (client) => {
      const { rows } = await client.query<RecoveryChallenge>(
        `SELECT * FROM password_recovery_challenges WHERE grant_digest=$1
     AND consumed_at IS NULL AND grant_expires_at>now() FOR UPDATE`,
        [this.crypto.digest('password-reset-grant', input.resetToken)],
      );
      const found = rows[0];
      if (!found?.account_id) return false;
      // Lock the credential also used by password login. A stale verified password
      // cannot mint a session after this transaction changes the credential.
      const credential = await client.query<{ password_hash: string }>(
        'SELECT password_hash FROM account_credentials WHERE account_id=$1 FOR UPDATE',
        [found.account_id],
      );
      if (credential.rows[0]?.password_hash !== found.credential_hash)
        return false;
      await client.query(
        'UPDATE account_credentials SET password_hash=$2 WHERE account_id=$1',
        [found.account_id, passwordHash],
      );
      await client.query(
        'UPDATE auth_sessions SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL',
        [found.account_id],
      );
      await client.query(
        "UPDATE password_recovery_challenges SET consumed_at=now(),grant_digest=NULL,grant_expires_at=NULL,credential_hash=NULL,otp_digest=repeat('0',64) WHERE account_id=$1",
        [found.account_id],
      );
      await client.query(
        'INSERT INTO password_recovery_notifications(id,account_id) VALUES($1,$2)',
        [randomUUID(), found.account_id],
      );
      await client.query(
        "INSERT INTO account_security_events(account_id,action) VALUES($1,'PASSWORD_RESET')",
        [found.account_id],
      );
      return true;
    });
    if (!valid) this.invalid();
    this.delivery.notifyChanged();
    return {
      status: 'PASSWORD_CHANGED',
      message: 'Tu contraseña fue actualizada. Inicia sesión nuevamente.',
    };
  }

  private pending(id: string, expires: Date) {
    return {
      recoveryId: id,
      expiresAt: expires.toISOString(),
      resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
      message:
        'Si existe una cuenta con contraseña para ese correo, recibirás un código de recuperación.',
    };
  }
  private invalid(): never {
    throw new BadRequestException({
      code: 'RECOVERY_INVALID',
      message:
        'El código o la autorización no es válido, venció o ya fue utilizado. Solicita una nueva recuperación.',
    });
  }
}
