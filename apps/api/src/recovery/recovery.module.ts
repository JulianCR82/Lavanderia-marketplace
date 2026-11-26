import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountSecurityModule } from '../account-security/account-security.module';
import { RecoveryController } from './recovery.controller';
import { RecoveryService } from './recovery.service';
import { RecoveryStore } from './recovery.store';
import { RecoveryDelivery } from './recovery-delivery.service';
import { RecoveryMailer, ResendRecoveryMailer } from './recovery-mailer';

@Module({
  imports: [DatabaseModule, AccountSecurityModule],
  controllers: [RecoveryController],
  providers: [
    RecoveryService,
    RecoveryStore,
    RecoveryDelivery,
    { provide: RecoveryMailer, useClass: ResendRecoveryMailer },
  ],
})
export class RecoveryModule {}
