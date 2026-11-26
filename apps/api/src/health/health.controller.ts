import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Public } from '../sessions/session.guard';

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('database')
  async checkDatabase(): Promise<{ status: 'ok'; database: 'ok' }> {
    try {
      await this.database.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
      });
    }
  }
}
