import crypto from 'crypto';
import { DatabaseConnection } from '../connection';
import {
  ActivityLogEntry,
  ActivityAction,
  ActivityEntityType,
  AuditLogVerificationResult,
} from '@quickswap/shared';

export interface ActivityLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  details: string | null;
  prev_hash?: string;
  entry_hash?: string;
  created_at: string;
}

export class ActivityLogRepository {
  private static mapRow(row: ActivityLogRow): ActivityLogEntry {
    return {
      id: row.id,
      action: row.action as ActivityAction,
      entityType: row.entity_type as ActivityEntityType,
      entityId: row.entity_id,
      title: row.title,
      details: row.details,
      prevHash: row.prev_hash,
      entryHash: row.entry_hash,
      createdAt: row.created_at,
    };
  }

  public static create(entry: {
    id: string;
    action: ActivityAction;
    entityType: ActivityEntityType;
    entityId?: string | null;
    title: string;
    details?: string | null;
  }): void {
    const db = DatabaseConnection.getInstance();

    // 1. Fetch previous hash from the most recent audit entry
    let prevHash = 'GENESIS';
    try {
      const latest = db
        .prepare('SELECT entry_hash FROM activity_logs ORDER BY created_at DESC, rowid DESC LIMIT 1')
        .get() as { entry_hash?: string } | undefined;

      if (latest && latest.entry_hash) {
        prevHash = latest.entry_hash;
      }
    } catch {
      prevHash = 'GENESIS';
    }

    const now = new Date().toISOString();
    const entityId = entry.entityId || '';
    const details = entry.details || '';

    // 2. Compute cryptographic entry hash linking to previous entry
    const entryHash = crypto
      .createHash('sha256')
      .update(`${prevHash}|${entry.id}|${entry.action}|${entry.entityType}|${entityId}|${entry.title}|${details}|${now}`)
      .digest('hex');

    db.prepare(`
      INSERT INTO activity_logs (id, action, entity_type, entity_id, title, details, prev_hash, entry_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      entry.title,
      entry.details || null,
      prevHash,
      entryHash,
      now
    );
  }

  public static list(limit: number = 50): ActivityLogEntry[] {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare(`
      SELECT * FROM activity_logs
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `).all(limit) as unknown as ActivityLogRow[];

    return rows.map(this.mapRow);
  }

  public static clear(): void {
    const db = DatabaseConnection.getInstance();
    db.prepare('DELETE FROM activity_logs').run();
  }

  /**
   * Cryptographically verifies the integrity of the audit log hash chain.
   * Ensures that no entries have been added, deleted, or modified.
   */
  public static verifyIntegrityChain(): AuditLogVerificationResult {
    const db = DatabaseConnection.getInstance();
    const rows = db
      .prepare('SELECT * FROM activity_logs ORDER BY created_at ASC, rowid ASC')
      .all() as unknown as ActivityLogRow[];

    if (rows.length === 0) {
      return {
        valid: true,
        totalChecked: 0,
        message: 'Audit log is empty. Integrity verified.',
      };
    }

    let expectedPrevHash = 'GENESIS';

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const actualPrevHash = r.prev_hash || 'GENESIS';

      if (actualPrevHash !== expectedPrevHash) {
        return {
          valid: false,
          totalChecked: i,
          brokenIndex: i,
          brokenEntryId: r.id,
          message: `Audit log tamper detected at entry index ${i} (${r.id}): Previous hash mismatch. Expected ${expectedPrevHash}, found ${actualPrevHash}.`,
        };
      }

      const entityId = r.entity_id || '';
      const details = r.details || '';
      const recomputedHash = crypto
        .createHash('sha256')
        .update(`${actualPrevHash}|${r.id}|${r.action}|${r.entity_type}|${entityId}|${r.title}|${details}|${r.created_at}`)
        .digest('hex');

      if (r.entry_hash !== recomputedHash) {
        return {
          valid: false,
          totalChecked: i,
          brokenIndex: i,
          brokenEntryId: r.id,
          message: `Audit log tamper detected at entry index ${i} (${r.id}): Entry hash corrupted. Data content has been tampered with.`,
        };
      }

      expectedPrevHash = r.entry_hash;
    }

    return {
      valid: true,
      totalChecked: rows.length,
      message: `Audit log integrity fully verified. All ${rows.length} entries have unbroken cryptographic hash signatures.`,
    };
  }
}
