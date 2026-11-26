import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RegistrationConfig } from './registration.config';
import { RegistrationCrypto } from './registration-crypto.service';
import { RegistrationLimits } from './registration-limits.service';
import { RegistrationMailer } from './registration-mailer';
import { RegistrationStore } from './registration.store';
import { StartRegistrationDto } from './registration.dto';
import { SessionService } from '../sessions/session.service';
import type { ClientPlatform } from '../sessions/session.types';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly store: RegistrationStore,
    private readonly crypto: RegistrationCrypto,
    private readonly limits: RegistrationLimits,
    private readonly mailer: RegistrationMailer,
    private readonly config: RegistrationConfig,
    private readonly sessions: SessionService,
  ) {}

  async start(input: StartRegistrationDto, ip: string) {
    const passwordHash = await this.crypto.hashPassword(input.password);
    const id = randomUUID();
    const code = this.crypto.code();
    const expires = new Date(Date.now() + this.config.otpLifetimeMs);
    await this.store.locked(async (client) => {
      if (await this.store.emailExists(client, input.email)) this.duplicate();
      await this.limits.reserveSend(client, input.email, ip);
      // A new flow gets its own credential and proof; it never replaces another flow.
      await client.query(
        `INSERT INTO registration_challenges(id,email,password_hash,otp_digest,expires_at)
        VALUES ($1,$2,$3,$4,$5)`,
        [
          id,
          input.email,
          passwordHash,
          this.crypto.digest('registration', id, input.email, code),
          expires,
        ],
      );
    });
    await this.mailer.send(input.email, code, randomUUID());
    return this.pending(id, expires);
  }

  async resend(id: string, ip: string) {
    const code = this.crypto.code();
    const expires = new Date(Date.now() + this.config.otpLifetimeMs);
    const email = await this.store.locked(async (client) => {
      const challenge = await this.store.find(client, id);
      if (!challenge || challenge.failed_attempts >= 5) this.invalid();
      if (await this.store.emailExists(client, challenge.email))
        this.duplicate();
      await this.limits.reserveSend(client, challenge.email, ip);
      await client.query(
        'UPDATE registration_challenges SET otp_digest=$2, expires_at=$3, sent_at=now() WHERE id=$1',
        [
          id,
          this.crypto.digest('registration', id, challenge.email, code),
          expires,
        ],
      );
      return challenge.email;
    });
    await this.mailer.send(email, code, randomUUID());
    return this.pending(id, expires);
  }

  async verify(
    id: string,
    code: string,
    platform: ClientPlatform | null = null,
  ) {
    const result = await this.store.locked(async (client) => {
      const challenge = await this.store.find(client, id);
      if (!challenge || challenge.failed_attempts >= 5) return 'INVALID_CODE';
      if (challenge.expires_at.getTime() <= Date.now()) return 'CODE_EXPIRED';
      if (
        !this.crypto.matches(id, challenge.email, code, challenge.otp_digest)
      ) {
        // Return an outcome, then throw outside the transaction so failed attempts commit.
        await client.query(
          'UPDATE registration_challenges SET failed_attempts=failed_attempts+1 WHERE id=$1',
          [id],
        );
        return 'INVALID_CODE';
      }
      const account = await client.query<{ id: string }>(
        `INSERT INTO accounts(email,platform_role) VALUES ($1,'CUSTOMER')
        ON CONFLICT DO NOTHING RETURNING id`,
        [challenge.email],
      );
      if (!account.rowCount) return 'EMAIL_REGISTERED';
      await client.query(
        'INSERT INTO account_credentials(account_id,password_hash) VALUES ($1,$2)',
        [account.rows[0].id, challenge.password_hash],
      );
      // Delete every pending flow for this contact. None can replace the verified credential.
      await client.query('DELETE FROM registration_challenges WHERE email=$1', [
        challenge.email,
      ]);
      return this.sessions.issue(client, account.rows[0].id, platform);
    });
    if (result === 'EMAIL_REGISTERED') this.duplicate();
    if (typeof result === 'string') this.invalid(result);
    return {
      status: 'CREATED' as const,
      message: 'Tu cuenta fue creada. Tu correo está verificado.',
      ...result,
    };
  }

  private pending(id: string, expires: Date) {
    return {
      registrationId: id,
      expiresAt: expires.toISOString(),
      resendAvailableAt: new Date(
        Date.now() + this.config.cooldownMs,
      ).toISOString(),
    };
  }

  private invalid(code = 'INVALID_CODE'): never {
    throw new BadRequestException({
      code,
      message:
        code === 'CODE_EXPIRED'
          ? 'El código venció. Solicita uno nuevo.'
          : 'Código inválido o proceso agotado. Revisa el código o inicia otro registro.',
    });
  }

  private duplicate(): never {
    throw new ConflictException({
      code: 'EMAIL_REGISTERED',
      message: 'Este correo ya está registrado.',
    });
  }
}
