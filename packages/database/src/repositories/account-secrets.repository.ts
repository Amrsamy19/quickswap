import { DatabaseConnection } from '../connection';
import { SecretReference, SecretType } from '@quickswap/shared';

export interface SecretReferenceRow {
  id: string;
  account_id: string;
  secret_type: string;
  credential_ref: string;
  created_at: string;
  updated_at: string;
}

export class AccountSecretsRepository {
  private static mapRow(row: SecretReferenceRow): SecretReference {
    return {
      id: row.id,
      accountId: row.account_id,
      secretType: row.secret_type as SecretType,
      credentialRef: row.credential_ref,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public static listByAccountId(accountId: string): SecretReference[] {
    const db = DatabaseConnection.getInstance();
    const rows = db.prepare(`
      SELECT * FROM account_secrets WHERE account_id = ?
    `).all(accountId) as unknown as SecretReferenceRow[];
    return rows.map(this.mapRow);
  }

  public static getByAccountAndType(accountId: string, secretType: SecretType): SecretReference | null {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare(`
      SELECT * FROM account_secrets WHERE account_id = ? AND secret_type = ?
    `).get(accountId, secretType) as unknown as SecretReferenceRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  public static saveReference(ref: {
    id: string;
    accountId: string;
    secretType: SecretType;
    credentialRef: string;
  }): void {
    const db = DatabaseConnection.getInstance();
    db.prepare(`
      INSERT INTO account_secrets (id, account_id, secret_type, credential_ref, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(account_id, secret_type) DO UPDATE SET
        credential_ref = excluded.credential_ref,
        updated_at = datetime('now')
    `).run(ref.id, ref.accountId, ref.secretType, ref.credentialRef);
  }

  public static deleteByAccountAndType(accountId: string, secretType: SecretType): void {
    const db = DatabaseConnection.getInstance();
    db.prepare('DELETE FROM account_secrets WHERE account_id = ? AND secret_type = ?').run(accountId, secretType);
  }

  public static deleteByAccountId(accountId: string): void {
    const db = DatabaseConnection.getInstance();
    db.prepare('DELETE FROM account_secrets WHERE account_id = ?').run(accountId);
  }

  public static count(): number {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT COUNT(*) as count FROM account_secrets').get() as { count: number };
    return row?.count || 0;
  }

  public static countAccountsWithSecrets(): number {
    const db = DatabaseConnection.getInstance();
    const row = db.prepare('SELECT COUNT(DISTINCT account_id) as count FROM account_secrets').get() as { count: number };
    return row?.count || 0;
  }
}
