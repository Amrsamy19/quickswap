import { DatabaseConnection } from '../connection';
import { LaunchHistoryEntry } from '@accounthub/shared';

export interface LaunchHistoryRow {
  id: string;
  account_id: string;
  application_id: string;
  status: string;
  error_message: string | null;
  launched_at: string;
  account_display_name?: string;
  application_name?: string;
}

export class LaunchHistoryRepository {
  private static mapRow(row: LaunchHistoryRow): LaunchHistoryEntry {
    return {
      id: row.id,
      accountId: row.account_id,
      applicationId: row.application_id,
      status: row.status as 'success' | 'failed',
      errorMessage: row.error_message,
      launchedAt: row.launched_at,
      accountDisplayName: row.account_display_name,
      applicationName: row.application_name,
    };
  }

  public static create(entry: {
    id: string;
    accountId: string;
    applicationId: string;
    status: 'success' | 'failed';
    errorMessage?: string | null;
  }): void {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO launch_history (id, account_id, application_id, status, error_message, launched_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      entry.id,
      entry.accountId,
      entry.applicationId,
      entry.status,
      entry.errorMessage || null
    );
  }

  public static list(limit: number = 20): LaunchHistoryEntry[] {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare(`
      SELECT lh.*, acc.display_name as account_display_name, app.name as application_name
      FROM launch_history lh
      LEFT JOIN accounts acc ON acc.id = lh.account_id
      LEFT JOIN applications app ON app.id = lh.application_id
      ORDER BY lh.launched_at DESC
      LIMIT ?
    `).all(limit) as unknown as LaunchHistoryRow[];

    return rows.map(this.mapRow);
  }
}
