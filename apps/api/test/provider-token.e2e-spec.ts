import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { ProviderTokenService } from '../src/auth/provider-token.service';

describe('Provider token cryptographic validation', () => {
  let verifier: ProviderTokenService;
  let key: Awaited<ReturnType<typeof generateKeyPair>>;
  const previousGoogle = process.env.GOOGLE_WEB_CLIENT_ID;
  beforeAll(async () => {
    process.env.GOOGLE_WEB_CLIENT_ID = 'google-fixture';
    key = await generateKeyPair('RS256');
    const publicKey = await exportJWK(key.publicKey);
    const keys = createLocalJWKSet({
      keys: [{ ...publicKey, kid: 'fixture', alg: 'RS256' }],
    });
    verifier = new ProviderTokenService({ google: keys });
  });
  afterAll(() => {
    if (previousGoogle === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID;
    else process.env.GOOGLE_WEB_CLIENT_ID = previousGoogle;
  });
  const token = (claims: Record<string, unknown> = {}) =>
    new SignJWT({
      nonce: 'server-nonce',
      email: 'verified@example.test',
      email_verified: true,
      ...claims,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
      .setSubject('stable-provider-subject')
      .setIssuer('https://accounts.google.com')
      .setAudience('google-fixture')
      .setIssuedAt()
      .setExpirationTime('5 minutes')
      .sign(key.privateKey);
  it('accepts verified Google identity signed by trusted key', async () => {
    expect(await verifier.verify('google', await token())).toEqual({
      subject: 'stable-provider-subject',
      nonce: 'server-nonce',
      email: 'verified@example.test',
    });
  });
  it('rejects wrong issuer, audience, expired token, missing nonce and tampering', async () => {
    const valid = await token();
    const badIssuer = await new SignJWT({ nonce: 'nonce' })
      .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
      .setSubject('sub')
      .setIssuer('https://attacker.example')
      .setAudience('google-fixture')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(key.privateKey);
    const badAudience = await new SignJWT({ nonce: 'nonce' })
      .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
      .setSubject('sub')
      .setIssuer('https://accounts.google.com')
      .setAudience('other-app')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(key.privateKey);
    const expired = await new SignJWT({ nonce: 'nonce' })
      .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
      .setSubject('sub')
      .setIssuer('https://accounts.google.com')
      .setAudience('google-fixture')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 700)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(key.privateKey);
    for (const value of [
      badIssuer,
      badAudience,
      expired,
      await token({ nonce: undefined }),
      valid.replace(/\.[^.]+$/, '.invalid'),
    ])
      await expect(verifier.verify('google', value)).rejects.toThrow();
  });
  it('never treats an unverified email as verified and fails closed without configured audience', async () => {
    expect(
      (await verifier.verify('google', await token({ email_verified: false })))
        .email,
    ).toBeUndefined();
    const audience = process.env.GOOGLE_WEB_CLIENT_ID;
    delete process.env.GOOGLE_WEB_CLIENT_ID;
    try {
      await expect(verifier.verify('google', 'anything')).rejects.toThrow(
        'Este método de acceso todavía no está configurado.',
      );
    } finally {
      process.env.GOOGLE_WEB_CLIENT_ID = audience;
    }
  });
});
