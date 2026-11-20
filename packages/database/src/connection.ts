import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { MigrationRunner } from './migrations/runner';
import { AppError } from '@quickswap/shared';

export class DatabaseConnection {
  private static instance: DatabaseSync | null = null;
  private static currentDbPath: string | null = null;

  public static initialize(dbPath: string = ':memory:'): DatabaseSync {
    if (this.instance) {
      if (this.currentDbPath === dbPath) {
        return this.instance;
      }
      this.close();
    }

    try {
      if (dbPath !== ':memory:') {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      const db = new DatabaseSync(dbPath);

      // Enforce foreign key constraints and performance pragmas
      db.exec('PRAGMA foreign_keys = ON;');
      if (dbPath !== ':memory:') {
        db.exec('PRAGMA journal_mode = WAL;');
        db.exec('PRAGMA synchronous = NORMAL;');
      }

      // Run versioned database migrations (with automatic snapshot backup)
      MigrationRunner.run(db, dbPath);

      this.instance = db;
      this.currentDbPath = dbPath;
      return db;
    } catch (err: any) {
      throw new AppError('DATABASE_ERROR', `Failed to initialize database at ${dbPath}: ${err.message}`, err);
    }
  }

  public static getInstance(): DatabaseSync {
    if (!this.instance) {
      throw new AppError('DATABASE_ERROR', 'Database has not been initialized. Call initialize() first.');
    }
    return this.instance;
  }

  public static close(): void {
    if (this.instance) {
      try {
        // Optimize indexes and flush WAL checkpoints on clean shutdown
        if (this.currentDbPath && this.currentDbPath !== ':memory:') {
          try {
            this.instance.exec('PRAGMA optimize;');
            this.instance.exec('PRAGMA wal_checkpoint(PASSIVE);');
          } catch {
            // Ignore optimization pragma errors during close
          }
        }
        this.instance.close();
      } catch {
        // Ignore
      }
      this.instance = null;
      this.currentDbPath = null;
    }
  }
}
