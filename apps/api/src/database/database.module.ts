import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseService, POSTGRES_POOL } from './database.service';

@Module({
  providers: [
    {
      provide: POSTGRES_POOL,
      useFactory: () =>
        new Pool({
          host: process.env.PGHOST ?? 'localhost',
          port: Number(process.env.PGPORT ?? 5432),
          database: process.env.PGDATABASE,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          max: Number(process.env.PGPOOL_MAX ?? 10),
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
        }),
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
