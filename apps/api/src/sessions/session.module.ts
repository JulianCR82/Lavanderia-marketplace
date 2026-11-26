import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';
import { SessionController } from './session.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SessionController],
  providers: [SessionService, { provide: APP_GUARD, useClass: SessionGuard }],
  exports: [SessionService],
})
export class SessionModule {}
