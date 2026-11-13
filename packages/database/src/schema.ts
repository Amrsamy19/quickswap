export const SCHEMA_SQL = `
-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adapter_id TEXT NOT NULL DEFAULT 'generic',
  executable_path TEXT,
  install_path TEXT,
  icon_path TEXT,
  category TEXT NOT NULL DEFAULT 'games',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_applications_favorite ON applications(is_favorite);

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT,
  external_id TEXT,
  region TEXT,
  avatar TEXT,
  auth_method TEXT NOT NULL DEFAULT 'credentials',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  launch_arguments TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounts_application_id ON accounts(application_id);
CREATE INDEX IF NOT EXISTS idx_accounts_favorite ON accounts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_accounts_default ON accounts(is_default);

-- Account Secrets References Table (Stores references only, NEVER raw secret values)
CREATE TABLE IF NOT EXISTS account_secrets (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  secret_type TEXT NOT NULL,
  credential_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_secrets_account_type ON account_secrets(account_id, secret_type);

-- App Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  title TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at DESC);
`;
