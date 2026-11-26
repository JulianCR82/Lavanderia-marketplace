import { verify } from 'argon2';
import { RegistrationCrypto } from './registration-crypto.service';
import { RegistrationConfig } from './registration.config';

describe('RegistrationCrypto', () => {
  const crypto = new RegistrationCrypto({
    hmacKey: 'test-only-not-a-production-secret',
  } as RegistrationConfig);

  it('accepts Unicode and spaces without normalizing the credential', async () => {
    const password = '  café y ropa recién lavada 🧺  ';
    const digest = await crypto.hashPassword(password);
    expect(await verify(digest, password)).toBe(true);
    expect(await verify(digest, password.trim())).toBe(false);
    expect(await verify(digest, password.normalize('NFD'))).toBe(false);
  });

  it('accepts 128 Unicode code points and rejects 129', async () => {
    const password = '🧺'.repeat(128);
    expect(await verify(await crypto.hashPassword(password), password)).toBe(
      true,
    );
    await expect(crypto.hashPassword('🧺'.repeat(129))).rejects.toThrow();
  });

  it('binds OTP digest to flow, email and server key', () => {
    const digest = crypto.digest(
      'registration',
      'flow-a',
      'a@example.com',
      '012345',
    );
    expect(crypto.matches('flow-a', 'a@example.com', '012345', digest)).toBe(
      true,
    );
    expect(crypto.matches('flow-b', 'a@example.com', '012345', digest)).toBe(
      false,
    );
    expect(crypto.matches('flow-a', 'b@example.com', '012345', digest)).toBe(
      false,
    );
    expect(crypto.matches('flow-a', 'a@example.com', '012345', 'invalid')).toBe(
      false,
    );
    expect(crypto.code()).toMatch(/^\d{6}$/);
  });
});
