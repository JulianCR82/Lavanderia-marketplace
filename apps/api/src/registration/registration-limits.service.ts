import { HttpException, Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { RegistrationConfig } from './registration.config';
import { RegistrationCrypto } from './registration-crypto.service';
import { RegistrationStore } from './registration.store';

@Injectable()
export class RegistrationLimits {
  constructor(
    private readonly store: RegistrationStore,
    private readonly config: RegistrationConfig,
    private readonly crypto: RegistrationCrypto,
  ) {}

  async request(ip: string): Promise<void> {
    const ipKey = this.crypto.digest('ip', ip);
    await this.store.locked(async (client) => {
      const { rows } = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM registration_events WHERE kind = 'request' AND ip_key = $1 AND created_at > now() - interval '1 hour'",
        [ipKey],
      );
      if (rows[0].count >= this.config.requestLimit) this.exceeded(3600);
      await client.query(
        "INSERT INTO registration_events(kind,email_key,ip_key) VALUES ('request','',$1)",
        [ipKey],
      );
    });
  }

  async reserveSend(
    client: PoolClient,
    email: string,
    ip: string,
  ): Promise<void> {
    const emailKey = this.crypto.digest('email', email);
    const ipKey = this.crypto.digest('ip', ip);
    const { rows } = await client.query<{
      email_count: number;
      ip_count: number;
      hourly_count: number;
      daily_count: number;
      last_sent: Date | null;
    }>(
      `
      SELECT count(*) FILTER (WHERE email_key = $1 AND created_at > now() - interval '1 hour')::int AS email_count,
        count(*) FILTER (WHERE ip_key = $2 AND created_at > now() - interval '1 hour')::int AS ip_count,
        count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS hourly_count,
        count(*)::int AS daily_count,
        max(created_at) FILTER (WHERE email_key = $1) AS last_sent
      FROM registration_events WHERE kind = 'send' AND created_at > now() - interval '24 hours'`,
      [emailKey, ipKey],
    );
    const usage = rows[0];
    if (usage.last_sent) {
      const remaining =
        usage.last_sent.getTime() + this.config.cooldownMs - Date.now();
      if (remaining > 0) this.exceeded(Math.ceil(remaining / 1000));
    }
    if (
      usage.email_count >= this.config.emailLimit ||
      usage.ip_count >= this.config.ipLimit ||
      usage.hourly_count >= this.config.globalHourlyLimit ||
      usage.daily_count >= this.config.globalDailyLimit
    )
      this.exceeded(3600);
    // Reserve before contacting the provider; ambiguous failures still consume budget.
    await client.query(
      "INSERT INTO registration_events(kind,email_key,ip_key) VALUES ('send',$1,$2)",
      [emailKey, ipKey],
    );
  }

  exceeded(seconds: number): never {
    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Espera antes de volver a intentarlo.',
        retryAfterSeconds: seconds,
      },
      429,
    );
  }
}
