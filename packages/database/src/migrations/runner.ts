import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import { Migration } from './types';
import { migration001 } from './001_initial_schema';
import { migration002 } from './002_performance_indexes';
import { AppError } from '@quickswap/shared';

export const ALL_MIGRATIONS: Migration[] = [
  migration001,
  migration002,
];

export class MigrationRunner {
  /**
   * Automatically creates a backup snapshot of the SQLite database before applying migrations.
   */
  public static backupDatabase(dbPath: string): string | null {
    if (dbPath === ':memory:' || !fs.existsSync(dbPath)) {
      return null;
    }

    try {
      const backupPath = `${dbPath}.bak-${Date.now()}`;
      fs.copyFileSync(dbPath, backupPath);
      return backupPath;
    } catch (err: any) {
      console.warn(`[DatabaseMigration] Failed to create database backup snapshot: ${err.message}`);
      return null;
    }
  }

  /**
   * Initializes the schema_version table and applies all pending migrations in sequence.
   */
  public static run(db: DatabaseSync, dbPath: string): number {
    try {
      // 1. Ensure version tracking table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // 2. Query currently applied version
      const row = db.prepare('SELECT MAX(version) as current_version FROM schema_version').get() as { current_version: number | null };
      const currentVersion = row?.current_version ?? 0;

      // 3. Find pending migrations
      const pending = ALL_MIGRATIONS
        .filter((m) => m.version > currentVersion)
        .sort((a, b) => a.version - b.version);

      if (pending.length === 0) {
        return currentVersion;
      }

      // 4. Create snapshot backup before running any migrations
      this.backupDatabase(dbPath);

      // 5. Execute each migration in order
      for (const mig of pending) {
        db.exec('BEGIN TRANSACTION;');
        try {
          mig.up(db);
          const insertStmt = db.prepare('INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, datetime(\'now\'))');
          insertStmt.run(mig.version, mig.name);
          db.exec('COMMIT;');
        } catch (migErr: any) {
          db.exec('ROLLBACK;');
          throw new AppError(
            'DATABASE_MIGRATION_ERROR',
            `Failed to apply database migration v${mig.version} (${mig.name}): ${migErr.message}`,
            migErr
          );
        }
      }

      return pending[pending.length - 1].version;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError('DATABASE_MIGRATION_ERROR', `Migration runner encountered an error: ${err.message}`, err);
    }
  }

  public static getCurrentVersion(db: DatabaseSync): number {
    try {
      const row = db.prepare('SELECT MAX(version) as current_version FROM schema_version').get() as { current_version: number | null };
      return row?.current_version ?? 0;
    } catch {
      return 0;
    }
  }
}
