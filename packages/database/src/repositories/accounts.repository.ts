import { DatabaseConnection } from '../connection';
import { Account, AccountFilter, AuthMethod, AuthState } from '@accounthub/shared';

export interface AccountRow {
  id: string;
  application_id: string;
  display_name: string;
  username: string | null;
  external_id: string | null;
  region: string | null;
  avatar: string | null;
  auth_method: string;
  is_favorite: number;
  is_default: number;
  launch_arguments: string | null;
  last_used_at: string | null;
  created_at: string;
  has_credentials?: number;
  has_session?: number;
}

export class AccountsRepository {
  private static mapRow(row: AccountRow): Account {
    const hasCreds = Boolean(row.has_credentials);
    const hasSess = Boolean(row.has_session);

    let authState: AuthState = 'not_configured';
    if (hasSess) {
      authState = 'session_available';
    } else if (hasCreds) {
      authState = 'credentials_saved';
    }

    return {
      id: row.id,
      applicationId: row.application_id,
      displayName: row.display_name,
      username: row.username,
      externalId: row.external_id,
      region: row.region,
      avatar: row.avatar,
      authMethod: row.auth_method as AuthMethod,
      isFavorite: Boolean(row.is_favorite),
      isDefault: Boolean(row.is_default),
      launchArguments: row.launch_arguments,
      authState,
      hasCredentials: hasCreds,
      hasSession: hasSess,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
    };
  }

  public static list(filter?: AccountFilter): Account[] {
    const db = DatabaseConnection.getInstance();
    let sql = `
      SELECT acc.*,
        (SELECT COUNT(*) FROM account_secrets s WHERE s.account_id = acc.id AND s.secret_type = 'password') as has_credentials,
        (SELECT COUNT(*) FROM account_secrets s WHERE s.account_id = acc.id AND s.secret_type = 'session_token') as has_session
      FROM accounts acc
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.applicationId) {
      sql += ' AND acc.application_id = ?';
      params.push(filter.applicationId);
    }

    if (filter?.favoritesOnly) {
      sql += ' AND acc.is_favorite = 1';
    }

    if (filter?.authMethod) {
      sql += ' AND acc.auth_method = ?';
      params.push(filter.authMethod);
    }

    if (filter?.query && filter.query.trim()) {
      sql += ' AND (acc.display_name LIKE ? OR acc.username LIKE ?)';
      const q = `%${filter.query.trim()}%`;
      params.push(q, q);
    }

    sql += ' ORDER BY acc.is_favorite DESC, acc.is_default DESC, acc.display_name ASC';

    const rows = db.prepare(sql).all(...params) as unknown as AccountRow[];
    return rows.map(this.mapRow);
  }

  public static getById(id: string): Account | null {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare(`
      SELECT acc.*,
        (SELECT COUNT(*) FROM account_secrets s WHERE s.account_id = acc.id AND s.secret_type = 'password') as has_credentials,
        (SELECT COUNT(*) FROM account_secrets s WHERE s.account_id = acc.id AND s.secret_type = 'session_token') as has_session
      FROM accounts acc
      WHERE acc.id = ?
    `).get(id) as unknown as AccountRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  public static create(account: {
    id: string;
    applicationId: string;
    displayName: string;
    username?: string | null;
    externalId?: string | null;
    region?: string | null;
    avatar?: string | null;
    authMethod?: string;
    isFavorite?: boolean;
    isDefault?: boolean;
    launchArguments?: string | null;
    lastUsedAt?: string | null;
    createdAt?: string;
  }): void {
    const db = DatabaseConnection.getInstance();

    if (account.isDefault) {
      // Clear previous default account for this application
      db.prepare('UPDATE accounts SET is_default = 0 WHERE application_id = ?').run(account.applicationId);
    }

    db.prepare(`
      INSERT INTO accounts (
        id, application_id, display_name, username, external_id, region,
        avatar, auth_method, is_favorite, is_default, launch_arguments,
        last_used_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `).run(
      account.id,
      account.applicationId,
      account.displayName,
      account.username || null,
      account.externalId || null,
      account.region || null,
      account.avatar || null,
      account.authMethod || 'credentials',
      account.isFavorite ? 1 : 0,
      account.isDefault ? 1 : 0,
      account.launchArguments || null,
      account.lastUsedAt || null,
      account.createdAt || null
    );
  }

  public static update(id: string, updates: {
    displayName?: string;
    username?: string | null;
    externalId?: string | null;
    region?: string | null;
    avatar?: string | null;
    authMethod?: string;
    isFavorite?: boolean;
    isDefault?: boolean;
    launchArguments?: string | null;
    lastUsedAt?: string | null;
  }): void {
    const db = DatabaseConnection.getInstance();
    const existing = this.getById(id);
    if (!existing) return;

    if (updates.isDefault) {
      db.prepare('UPDATE accounts SET is_default = 0 WHERE application_id = ?').run(existing.applicationId);
    }

    db.prepare(`
      UPDATE accounts
      SET display_name = COALESCE(?, display_name),
          username = COALESCE(?, username),
          external_id = COALESCE(?, external_id),
          region = COALESCE(?, region),
          avatar = COALESCE(?, avatar),
          auth_method = COALESCE(?, auth_method),
          is_favorite = COALESCE(?, is_favorite),
          is_default = COALESCE(?, is_default),
          launch_arguments = COALESCE(?, launch_arguments),
          last_used_at = COALESCE(?, last_used_at)
      WHERE id = ?
    `).run(
      updates.displayName !== undefined ? updates.displayName : null,
      updates.username !== undefined ? updates.username : null,
      updates.externalId !== undefined ? updates.externalId : null,
      updates.region !== undefined ? updates.region : null,
      updates.avatar !== undefined ? updates.avatar : null,
      updates.authMethod !== undefined ? updates.authMethod : null,
      updates.isFavorite !== undefined ? (updates.isFavorite ? 1 : 0) : null,
      updates.isDefault !== undefined ? (updates.isDefault ? 1 : 0) : null,
      updates.launchArguments !== undefined ? updates.launchArguments : null,
      updates.lastUsedAt !== undefined ? updates.lastUsedAt : null,
      id
    );
  }

  public static setDefault(id: string): void {
    const existing = this.getById(id);
    if (!existing) return;
    const db = DatabaseConnection.getInstance();
    db.prepare('UPDATE accounts SET is_default = 0 WHERE application_id = ?').run(existing.applicationId);
    db.prepare('UPDATE accounts SET is_default = 1 WHERE id = ?').run(id);
  }

  public static toggleFavorite(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    const nextVal = !existing.isFavorite;
    const db = DatabaseConnection.getInstance();
    db.prepare('UPDATE accounts SET is_favorite = ? WHERE id = ?').run(nextVal ? 1 : 0, id);
    return nextVal;
  }

  public static delete(id: string): void {
    const db = DatabaseConnection.getInstance();
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  }
}
