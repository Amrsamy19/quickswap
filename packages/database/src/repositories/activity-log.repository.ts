import { DatabaseConnection } from '../connection';
import { ActivityLogEntry, ActivityAction, ActivityEntityType } from '@quickswap/shared';

export interface ActivityLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  details: string | null;
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
    db.prepare(`
      INSERT INTO activity_logs (id, action, entity_type, entity_id, title, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      entry.id,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      entry.title,
      entry.details || null
    );
  }

  public static list(limit: number = 50): ActivityLogEntry[] {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare(`
      SELECT * FROM activity_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as unknown as ActivityLogRow[];

    return rows.map(this.mapRow);
  }

  public static clear(): void {
    const db = DatabaseConnection.getInstance();
    db.prepare('DELETE FROM activity_logs').run();
  }
}
