import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SessionModule } from '../sessions/session.module';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { AccountSecurityModule } from '../account-security/account-security.module';
import {
  RegistrationMailer,
  ResendRegistrationMailer,
} from './registration-mailer';

@Module({
  imports: [DatabaseModule, SessionModule, AccountSecurityModule],
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    { provide: RegistrationMailer, useClass: ResendRegistrationMailer },
  ],
  exports: [AccountSecurityModule],
})
export class RegistrationModule {}
