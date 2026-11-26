import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { RegistrationLimits } from '../registration/registration-limits.service';
import { RecoveryMailer } from './recovery-mailer';
import { RecoveryStore } from './recovery.store';

@Injectable()
export class RecoveryDelivery implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private readonly pending = new Set<Promise<void>>();
  private flushing = false;
  constructor(
    private readonly database: DatabaseService,
    private readonly store: RecoveryStore,
    private readonly limits: RegistrationLimits,
    private readonly mailer: RecoveryMailer,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      this.track(this.flushNotifications());
    }, 60_000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    await Promise.allSettled([...this.pending]);
  }
  private track(task: Promise<void>) {
    const safe = task.catch(() => undefined);
    this.pending.add(safe);
    void safe.finally(() => this.pending.delete(safe));
  }
  sendCode(id: string, email: string, code: string) {
    // Provider I/O never delays public responses. OTP is held in memory only;
    // restart/failure requires a resend, not a persisted plaintext code.
    this.track(
      (async () => {
        let state = 'sent';
        try {
          await this.mailer.sendCode(email, code, randomUUID());
        } catch {
          state = 'failed';
        }
        await this.database.query(
          'UPDATE password_recovery_challenges SET delivery_state=$2 WHERE id=$1',
          [id, state],
        );
      })(),
    );
  }
  notifyChanged() {
    this.track(this.flushNotifications());
  }
  async flushNotifications(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const notice = await this.store.locked(async (client) => {
        const { rows } = await client.query<{ id: string; email: string }>(
          `SELECT n.id,a.email FROM password_recovery_notifications n JOIN accounts a ON a.id=n.account_id
      WHERE n.delivered_at IS NULL AND (n.lease_until IS NULL OR n.lease_until<now())
      ORDER BY n.created_at LIMIT 1 FOR UPDATE OF n SKIP LOCKED`,
        );
        if (!rows[0]) return;
        await this.limits.reserveSend(
          client,
          rows[0].email,
          'recovery-notification',
        );
        await client.query(
          "UPDATE password_recovery_notifications SET lease_until=now()+interval '1 minute' WHERE id=$1",
          [rows[0].id],
        );
        return rows[0];
      });
      if (!notice) return;
      try {
        await this.mailer.sendChanged(notice.email, notice.id);
        await this.database.query(
          'UPDATE password_recovery_notifications SET delivered_at=now() WHERE id=$1',
          [notice.id],
        );
      } catch {
        /* Retry after lease expiration, with a stable Resend idempotency key. */
      }
    } finally {
      this.flushing = false;
    }
  }
}
