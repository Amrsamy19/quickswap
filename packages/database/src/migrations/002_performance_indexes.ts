import { Migration } from './types';

export const migration002: Migration = {
  version: 2,
  name: 'performance_and_audit_indexes',
  up: (db) => {
    db.exec(`
      -- High performance lookup indexes
      CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_last_used ON accounts(last_used_at DESC);
      CREATE INDEX IF NOT EXISTS idx_launch_history_status ON launch_history(status);
    `);
  },
};
