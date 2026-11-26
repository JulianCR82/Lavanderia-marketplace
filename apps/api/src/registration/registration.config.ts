import { Injectable } from '@nestjs/common';

@Injectable()
export class RegistrationConfig {
  readonly otpLifetimeMs = 10 * 60_000;
  readonly cooldownMs = 60_000;
  readonly emailLimit = this.positive('REGISTRATION_EMAIL_HOURLY_LIMIT', 5);
  readonly ipLimit = this.positive('REGISTRATION_IP_HOURLY_LIMIT', 30);
  readonly globalHourlyLimit = this.positive(
    'REGISTRATION_GLOBAL_HOURLY_LIMIT',
    100,
  );
  readonly globalDailyLimit = this.positive(
    'REGISTRATION_GLOBAL_DAILY_LIMIT',
    100,
  );
  readonly requestLimit = this.positive(
    'REGISTRATION_REQUEST_IP_HOURLY_LIMIT',
    120,
  );

  get hmacKey(): string {
    const key = process.env.REGISTRATION_HMAC_KEY;
    if (!key || Buffer.byteLength(key) < 32) {
      throw new Error('Configure REGISTRATION_HMAC_KEY con al menos 32 bytes.');
    }
    return key;
  }

  private positive(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`Configuración inválida: ${name}`);
    return value;
  }
}
