import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SessionModule } from '../sessions/session.module';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffMailer, ResendStaffMailer } from './staff-mailer';
import { AccountSecurityModule } from '../account-security/account-security.module';

@Module({
  imports: [DatabaseModule, SessionModule, AccountSecurityModule],
  controllers: [StaffController],
  providers: [
    StaffService,
    AuthorizationGuard,
    { provide: StaffMailer, useClass: ResendStaffMailer },
  ],
})
export class StaffModule {}
