import { Migration } from './types';
import crypto from 'crypto';

export const migration003: Migration = {
  version: 3,
  name: 'tamper_evident_audit_log_and_security_hardening',
  up: (db) => {
    // 1. Add prev_hash and entry_hash columns to activity_logs
    try {
      db.exec(`ALTER TABLE activity_logs ADD COLUMN prev_hash TEXT NOT NULL DEFAULT 'GENESIS';`);
    } catch {}
    try {
      db.exec(`ALTER TABLE activity_logs ADD COLUMN entry_hash TEXT NOT NULL DEFAULT '';`);
    } catch {}

    // 2. Compute cryptographic hash chain for any existing activity logs
    try {
      const rows = db.prepare(`
        SELECT rowid, id, action, entity_type, entity_id, title, details, created_at 
        FROM activity_logs 
        ORDER BY created_at ASC, rowid ASC
      `).all() as any[];

      let prevHash = 'GENESIS';
      const updateStmt = db.prepare('UPDATE activity_logs SET prev_hash = ?, entry_hash = ? WHERE rowid = ?');

      for (const r of rows) {
        const entryHash = crypto
          .createHash('sha256')
          .update(`${prevHash}|${r.id}|${r.action}|${r.entity_type}|${r.entity_id || ''}|${r.title}|${r.details || ''}|${r.created_at}`)
          .digest('hex');
        updateStmt.run(prevHash, entryHash, r.rowid);
        prevHash = entryHash;
      }
    } catch {
      // Table may be empty
    }
  },
};
