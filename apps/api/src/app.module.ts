import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { RegistrationModule } from './registration/registration.module';
import { AuthModule } from './auth/auth.module';
import { RecoveryModule } from './recovery/recovery.module';
import { ProfileModule } from './profile/profile.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    DatabaseModule,
    RegistrationModule,
    AuthModule,
    RecoveryModule,
    ProfileModule,
    StaffModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
