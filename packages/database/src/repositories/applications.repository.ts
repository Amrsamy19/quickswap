import { DatabaseConnection } from '../connection';
import { Application, ApplicationCategory } from '@quickswap/shared';

export interface ApplicationRow {
  id: string;
  name: string;
  adapter_id: string;
  executable_path: string | null;
  install_path: string | null;
  icon_path: string | null;
  category: string;
  is_favorite: number;
  created_at: string;
  account_count?: number;
}

export class ApplicationsRepository {
  private static mapRow(row: ApplicationRow): Application {
    return {
      id: row.id,
      name: row.name,
      adapterId: row.adapter_id,
      executablePath: row.executable_path,
      installPath: row.install_path,
      iconPath: row.icon_path,
      category: row.category as ApplicationCategory,
      isFavorite: Boolean(row.is_favorite),
      isInstalled: Boolean(row.executable_path),
      accountCount: Number(row.account_count || 0),
      capabilities: {
        credentials: true,
        sessions: row.adapter_id === 'riot' || row.adapter_id === 'steam',
        multipleInstances: false,
        accountIdentification: true,
        sessionValidation: true,
        manualLogin: true,
      },
      createdAt: row.created_at,
    };
  }

  public static list(): Application[] {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare(`
      SELECT a.*, (SELECT COUNT(*) FROM accounts acc WHERE acc.application_id = a.id) as account_count
      FROM applications a
      ORDER BY a.is_favorite DESC, a.name ASC
    `).all() as unknown as ApplicationRow[];

    return rows.map(this.mapRow);
  }

  public static getById(id: string): Application | null {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare(`
      SELECT a.*, (SELECT COUNT(*) FROM accounts acc WHERE acc.application_id = a.id) as account_count
      FROM applications a
      WHERE a.id = ?
    `).get(id) as unknown as ApplicationRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  public static getByExecutablePath(executablePath: string): Application | null {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare(`
      SELECT a.*, (SELECT COUNT(*) FROM accounts acc WHERE acc.application_id = a.id) as account_count
      FROM applications a
      WHERE a.executable_path = ?
    `).get(executablePath) as unknown as ApplicationRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  public static create(app: {
    id: string;
    name: string;
    adapterId?: string;
    executablePath?: string | null;
    installPath?: string | null;
    iconPath?: string | null;
    category?: string;
    isFavorite?: boolean;
    createdAt?: string;
  }): void {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO applications (id, name, adapter_id, executable_path, install_path, icon_path, category, is_favorite, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `).run(
      app.id,
      app.name,
      app.adapterId || 'generic',
      app.executablePath || null,
      app.installPath || null,
      app.iconPath || null,
      app.category || 'games',
      app.isFavorite ? 1 : 0,
      app.createdAt || null
    );
  }

  public static update(id: string, updates: {
    name?: string;
    executablePath?: string | null;
    installPath?: string | null;
    iconPath?: string | null;
    category?: string;
    isFavorite?: boolean;
  }): void {
    const db = DatabaseConnection.getInstance();
    const existing = this.getById(id);
    if (!existing) return;

    db.prepare(`
      UPDATE applications
      SET name = COALESCE(?, name),
          executable_path = COALESCE(?, executable_path),
          install_path = COALESCE(?, install_path),
          icon_path = COALESCE(?, icon_path),
          category = COALESCE(?, category),
          is_favorite = COALESCE(?, is_favorite)
      WHERE id = ?
    `).run(
      updates.name !== undefined ? updates.name : null,
      updates.executablePath !== undefined ? updates.executablePath : null,
      updates.installPath !== undefined ? updates.installPath : null,
      updates.iconPath !== undefined ? updates.iconPath : null,
      updates.category !== undefined ? updates.category : null,
      updates.isFavorite !== undefined ? (updates.isFavorite ? 1 : 0) : null,
      id
    );
  }

  public static delete(id: string): void {
    const db = DatabaseConnection.getInstance();
    db.prepare('DELETE FROM applications WHERE id = ?').run(id);
  }
}
