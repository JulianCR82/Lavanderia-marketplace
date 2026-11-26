import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RegistrationConfig } from '../registration/registration.config';
import { RegistrationCrypto } from '../registration/registration-crypto.service';
import { RegistrationLimits } from '../registration/registration-limits.service';
import { RegistrationStore } from '../registration/registration.store';

/** Shared policies/quotas; legacy names preserve the deployed configuration contract. */
@Module({
  imports: [DatabaseModule],
  providers: [
    RegistrationConfig,
    RegistrationCrypto,
    RegistrationLimits,
    RegistrationStore,
  ],
  exports: [
    RegistrationConfig,
    RegistrationCrypto,
    RegistrationLimits,
    RegistrationStore,
  ],
})
export class AccountSecurityModule {}
