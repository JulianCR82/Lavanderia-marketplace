import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { hash, argon2id } from 'argon2';
import { dictionary } from '@zxcvbn-ts/language-common';
import { RegistrationConfig } from './registration.config';

@Injectable()
export class RegistrationCrypto {
  private readonly blocked = new Set(
    [
      ...dictionary['passwords-common'],
      '123456789012345',
      '1234567890123456',
      'contraseña123456',
      'contrasena123456',
      'passwordpassword',
    ].map((word) => word.normalize('NFKC').toLowerCase()),
  );

  constructor(private readonly config: RegistrationConfig) {}

  async hashPassword(password: string): Promise<string> {
    const length = Array.from(password).length;
    if (length < 15 || length > 128) {
      throw new BadRequestException({
        code: 'PASSWORD_LENGTH',
        message: 'La contraseña debe tener entre 15 y 128 caracteres.',
      });
    }
    // Normalize only for blocklist comparison, never the actual credential.
    if (this.blocked.has(password.normalize('NFKC').trim().toLowerCase())) {
      throw new BadRequestException({
        code: 'PASSWORD_BLOCKED',
        message: 'Esta contraseña es común o comprometida. Elige otra.',
      });
    }
    return hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  code(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  digest(...parts: string[]): string {
    return createHmac('sha256', this.config.hmacKey)
      .update(JSON.stringify(parts))
      .digest('hex');
  }

  matches(id: string, email: string, code: string, expected: string): boolean {
    const actual = Buffer.from(
      this.digest('registration', id, email, code),
      'hex',
    );
    const stored = Buffer.from(expected, 'hex');
    return actual.length === stored.length && timingSafeEqual(actual, stored);
  }
}
