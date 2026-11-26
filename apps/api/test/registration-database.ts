import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { randomUUID } from 'node:crypto';
import { Pool, QueryResultRow } from 'pg';

interface TestSql {
  exec(text: string): Promise<unknown>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
  close(): Promise<void>;
}

/** Both engines are disposable. Never run destructive test SQL on the app database. */
export async function registrationDatabase(): Promise<{
  db: TestSql;
  pool: Pool;
}> {
  if (process.env.REGISTRATION_TEST_POSTGRES === '1') {
    const admin = new Pool({ max: 1, connectionTimeoutMillis: 5000 });
    const name = `registration_test_${randomUUID().replaceAll('-', '')}`;
    // The identifier comes only from randomUUID, never environment or user input.
    if (!/^registration_test_[a-f0-9]{32}$/.test(name))
      throw new Error('Invalid test database name');
    let created = false;
    const pool = new Pool({
      database: name,
      max: 10,
      connectionTimeoutMillis: 5000,
    });
    const close = async () => {
      if (!pool.ended) await pool.end();
      try {
        if (created) await admin.query(`DROP DATABASE "${name}"`);
      } finally {
        await admin.end();
      }
    };
    try {
      await admin.query(`CREATE DATABASE "${name}"`);
      created = true;
      const result = await pool.query<{ server_version: string }>(
        'SHOW server_version',
      );
      if (!result.rows[0].server_version.startsWith('17.'))
        throw new Error('PostgreSQL 17 required');
      return {
        pool,
        db: {
          exec: (text) => pool.query(text),
          query: (text, values) => pool.query(text, values),
          close,
        },
      };
    } catch (error) {
      await close();
      throw error;
    }
  }

  const db = new PGlite({ extensions: { pgcrypto } });
  let tail = Promise.resolve();
  const query = async (text: string, values?: unknown[]) => {
    const result = await db.query(text, values);
    return {
      ...result,
      rowCount: result.rows.length || result.affectedRows || 0,
    };
  };
  // PGlite has one connection; PostgreSQL above uses independent real connections.
  const pool = {
    query,
    end: () => Promise.resolve(),
    connect: async () => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      return { query, release };
    },
  } as unknown as Pool;
  return { db, pool };
}
