import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProfileService {
  constructor(private readonly database: DatabaseService) {}

  /** Setting a value (including clearing it) is safe to retry after a lost response. */
  async update(accountId: string, displayName: string): Promise<string | null> {
    const { rows } = await this.database.query<{ display_name: string | null }>(
      `UPDATE accounts SET display_name=$2,updated_at=now()
       WHERE id=$1 RETURNING display_name`,
      [accountId, displayName || null],
    );
    if (!rows[0])
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Debes iniciar sesión.',
      });
    return rows[0].display_name;
  }
}
