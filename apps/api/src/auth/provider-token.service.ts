import {
  Injectable,
  Inject,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import { isEmail } from 'class-validator';
import { IdentityProvider } from './auth.dto';

export interface ProviderIdentity {
  subject: string;
  nonce: string;
  email?: string;
}
export const PROVIDER_KEYS = Symbol('PROVIDER_KEYS');

@Injectable()
export class ProviderTokenService {
  private readonly keys: Record<IdentityProvider, JWTVerifyGetKey>;

  constructor(
    @Optional()
    @Inject(PROVIDER_KEYS)
    keys?: Record<IdentityProvider, JWTVerifyGetKey>,
  ) {
    this.keys = keys ?? {
      google: createRemoteJWKSet(
        new URL('https://www.googleapis.com/oauth2/v3/certs'),
        { timeoutDuration: 5000 },
      ),
    };
  }

  audiences(provider: IdentityProvider): string[] {
    // Keep the provider check at this boundary as well as in HTTP validation.
    if (provider !== 'google')
      throw new UnauthorizedException('Proveedor de acceso no admitido.');
    const value = process.env.GOOGLE_WEB_CLIENT_ID;
    if (!value?.trim())
      throw new ServiceUnavailableException({
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Este método de acceso todavía no está configurado.',
      });
    return [value.trim()];
  }

  async verify(
    provider: IdentityProvider,
    token: string,
  ): Promise<ProviderIdentity> {
    const audience = this.audiences(provider);
    try {
      const { payload } = await jwtVerify(token, this.keys[provider], {
        algorithms: ['RS256'],
        audience,
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        requiredClaims: ['sub', 'exp', 'iat', 'nonce'],
        maxTokenAge: '5 minutes',
        clockTolerance: 5,
      });
      if (
        !payload.sub ||
        payload.sub.length > 255 ||
        typeof payload.nonce !== 'string'
      )
        throw new Error('Invalid identity');
      let email: string | undefined;
      if (
        typeof payload.email === 'string' &&
        (payload.email_verified === true || payload.email_verified === 'true')
      ) {
        email = payload.email.trim().toLowerCase();
        if (!isEmail(email) || email.length > 254)
          throw new Error('Invalid email');
      }
      return { subject: payload.sub, nonce: payload.nonce, email };
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_PROVIDER_TOKEN',
        message: 'No pudimos verificar el acceso con el proveedor.',
      });
    }
  }
}
