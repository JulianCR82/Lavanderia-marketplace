import { HttpException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RegistrationCrypto } from '../registration/registration-crypto.service';

@Injectable()
export class AuthLimits {
  constructor(
    private readonly database: DatabaseService,
    private readonly crypto: RegistrationCrypto,
  ) {}
  async take(ip: string, email?: string): Promise<void> {
    const ipDigest = this.crypto.digest('auth-ip', ip);
    const emailDigest = email ? this.crypto.digest('auth-email', email) : null;
    await this.database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(74102520)');
      await client.query(
        "DELETE FROM auth_attempts WHERE created_at < now() - interval '1 day'",
      );
      const { rows } = await client.query<{
        ip_count: number;
        email_count: number;
      }>(
        `
        SELECT count(*) FILTER (WHERE ip_digest=$1)::int AS ip_count,
        count(*) FILTER (WHERE email_digest=$2)::int AS email_count
        FROM auth_attempts WHERE created_at > now() - interval '15 minutes'`,
        [ipDigest, emailDigest],
      );
      if (rows[0].ip_count >= 50 || (emailDigest && rows[0].email_count >= 10))
        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            message: 'Demasiados intentos. Espera antes de volver a ingresar.',
            retryAfterSeconds: 900,
          },
          429,
        );
      // Reserve before expensive hashing/signature checks; concurrent attempts cannot evade limits.
      await client.query(
        'INSERT INTO auth_attempts(ip_digest,email_digest) VALUES ($1,$2)',
        [ipDigest, emailDigest],
      );
    });
  }
}
