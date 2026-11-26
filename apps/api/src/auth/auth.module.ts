import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RegistrationModule } from '../registration/registration.module';
import { SessionModule } from '../sessions/session.module';
import { AuthController } from './auth.controller';
import { AccessController } from './access.controller';
import { AuthService } from './auth.service';
import { AuthLimits } from './auth-limits.service';
import { ProviderTokenService } from './provider-token.service';
import { AuthorizationGuard } from './authorization.guard';

@Module({
  imports: [DatabaseModule, RegistrationModule, SessionModule],
  controllers: [AuthController, AccessController],
  providers: [
    AuthService,
    AuthLimits,
    ProviderTokenService,
    AuthorizationGuard,
  ],
})
export class AuthModule {}
