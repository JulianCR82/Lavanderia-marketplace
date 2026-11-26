import {
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { verify } from 'argon2';
import { DatabaseService } from '../database/database.service';
import { RegistrationCrypto } from '../registration/registration-crypto.service';
import { SessionService } from '../sessions/session.service';
import type { ClientPlatform } from '../sessions/session.types';
import { EmailLoginDto, IdentityProvider, ProviderLoginDto } from './auth.dto';
import { ProviderTokenService } from './provider-token.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  constructor(
    private readonly database: DatabaseService,
    private readonly crypto: RegistrationCrypto,
    private readonly sessions: SessionService,
    private readonly providers: ProviderTokenService,
  ) {}
  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.crypto.hashPassword(
      randomBytes(32).toString('hex'),
    );
  }

  async login(input: EmailLoginDto, platform: ClientPlatform | null = null) {
    const { rows } = await this.database.query<{
      id: string;
      password_hash: string;
      is_development_fixture: boolean;
    }>(
      `SELECT a.id,c.password_hash,a.is_development_fixture FROM accounts a
      JOIN account_credentials c ON c.account_id=a.id WHERE lower(a.email)=$1`,
      [input.email],
    );
    const account = rows[0];
    const valid = await verify(
      account?.password_hash ?? this.dummyHash,
      input.password,
    );
    if (
      !account ||
      !valid ||
      (account.is_development_fixture &&
        !['development', 'test'].includes(process.env.NODE_ENV ?? ''))
    )
      this.invalid();
    return this.database.transaction(async (client) => {
      const current = await client.query<{ password_hash: string }>(
        'SELECT password_hash FROM account_credentials WHERE account_id=$1 FOR UPDATE',
        [account.id],
      );
      if (current.rows[0]?.password_hash !== account.password_hash)
        this.invalid();
      return this.sessions.issue(client, account.id, platform);
    });
  }

  async challenge(provider: IdentityProvider) {
    this.providers.audiences(provider);
    const nonce = randomBytes(32).toString('hex');
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.database.transaction(async (client) => {
      await client.query(
        "DELETE FROM auth_challenges WHERE expires_at < now() - interval '1 day'",
      );
      await client.query(
        'INSERT INTO auth_challenges(id,provider,nonce_digest,account_id,expires_at) VALUES ($1,$2,$3,$4,$5)',
        [id, provider, this.sessions.digest(nonce), null, expiresAt],
      );
    });
    return { challengeId: id, nonce, expiresAt: expiresAt.toISOString() };
  }

  async providerLogin(
    input: ProviderLoginDto,
    platform: ClientPlatform | null = null,
  ) {
    // Every proof attempt commits before remote verification; failures cannot reset this counter.
    const { rows } = await this.database.query<{ nonce_digest: string }>(
      `UPDATE auth_challenges SET attempts=attempts+1
      WHERE id=$1 AND provider=$2 AND account_id IS NULL
      AND consumed_at IS NULL AND attempts<5 AND expires_at>now() RETURNING nonce_digest`,
      [input.challengeId, input.provider],
    );
    if (!rows[0]) this.invalid();
    const identity = await this.providers.verify(
      input.provider,
      input.identityToken,
    );
    if (this.sessions.digest(identity.nonce) !== rows[0].nonce_digest)
      this.invalid();
    return this.database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(74102521)');
      const challenge = await client.query(
        `UPDATE auth_challenges SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL AND expires_at>now() RETURNING id`,
        [input.challengeId],
      );
      if (!challenge.rowCount) this.invalid();
      const existing = await client.query<{
        account_id: string;
        is_development_fixture: boolean;
      }>(
        `SELECT i.account_id,a.is_development_fixture FROM account_identities i JOIN accounts a ON a.id=i.account_id WHERE i.provider=$1 AND i.subject=$2`,
        [input.provider, identity.subject],
      );
      let accountId = existing.rows[0]?.account_id;
      if (
        existing.rows[0]?.is_development_fixture &&
        !['development', 'test'].includes(process.env.NODE_ENV ?? '')
      )
        this.invalid();
      if (!accountId) {
        if (!identity.email) this.invalid();
        const account = await client.query<{ id: string }>(
          "INSERT INTO accounts(email,platform_role) VALUES ($1,'CUSTOMER') ON CONFLICT DO NOTHING RETURNING id",
          [identity.email],
        );
        // Matching email alone never authorizes linking to an existing account.
        if (!account.rowCount)
          throw new ConflictException({
            code: 'ACCOUNT_SIGN_IN_METHOD_MISMATCH',
            message:
              'Ese correo ya tiene una cuenta. Ingresa con el método con el que la creaste; no se permite vincular Google desde el perfil.',
          });
        accountId = account.rows[0].id;
      }
      if (!existing.rowCount)
        await client.query(
          'INSERT INTO account_identities(provider,subject,account_id) VALUES ($1,$2,$3)',
          [input.provider, identity.subject, accountId],
        );
      return this.sessions.issue(client, accountId, platform);
    });
  }

  private invalid(): never {
    throw new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'No pudimos verificar tus credenciales. Intenta de nuevo.',
    });
  }
}
