import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';

export interface Challenge {
  id: string;
  email: string;
  password_hash: string;
  otp_digest: string;
  failed_attempts: number;
  expires_at: Date;
  sent_at: Date;
}

@Injectable()
export class RegistrationStore {
  constructor(private readonly database: DatabaseService) {}

  async locked<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(async (client) => {
      // Shared serialization also makes global quota reservation race-free.
      // Small MVP traffic: keep remote I/O and password hashing outside this lock.
      await client.query('SELECT pg_advisory_xact_lock(74102519)');
      await client.query(
        "DELETE FROM registration_challenges WHERE created_at < now() - interval '24 hours'",
      );
      await client.query(
        "DELETE FROM registration_events WHERE created_at < now() - interval '24 hours'",
      );
      return work(client);
    });
  }

  async find(client: PoolClient, id: string): Promise<Challenge | undefined> {
    const result = await client.query<Challenge>(
      'SELECT * FROM registration_challenges WHERE id = $1 FOR UPDATE',
      [id],
    );
    return result.rows[0];
  }

  async emailExists(client: PoolClient, email: string): Promise<boolean> {
    const result = await client.query(
      'SELECT 1 FROM accounts WHERE lower(email) = $1',
      [email],
    );
    return Boolean(result.rowCount);
  }
}
