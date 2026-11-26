import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';

export interface RecoveryChallenge {
  id: string;
  email: string;
  account_id: string | null;
  credential_hash: string | null;
  otp_digest: string;
  failed_attempts: number;
  created_at: Date;
  expires_at: Date;
  grant_digest: string | null;
  grant_expires_at: Date | null;
  consumed_at: Date | null;
}
@Injectable()
export class RecoveryStore {
  constructor(private readonly database: DatabaseService) {}
  locked<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(async (client) => {
      // Same lock as registration: a single race-free email budget.
      await client.query('SELECT pg_advisory_xact_lock(74102519)');
      await client.query(
        "DELETE FROM password_recovery_challenges WHERE created_at<now()-interval '24 hours'",
      );
      await client.query(
        "DELETE FROM password_recovery_notifications WHERE created_at<now()-interval '24 hours'",
      );
      await client.query(
        "DELETE FROM registration_events WHERE created_at<now()-interval '24 hours'",
      );
      return work(client);
    });
  }
  async find(
    client: PoolClient,
    id: string,
  ): Promise<RecoveryChallenge | undefined> {
    return (
      await client.query<RecoveryChallenge>(
        'SELECT * FROM password_recovery_challenges WHERE id=$1 FOR UPDATE',
        [id],
      )
    ).rows[0];
  }
}
