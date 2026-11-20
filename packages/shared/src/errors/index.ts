export type ErrorCode =
  | 'APP_NOT_FOUND'
  | 'APP_ALREADY_EXISTS'
  | 'APP_NOT_INSTALLED'
  | 'EXECUTABLE_NOT_FOUND'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_NAME_REQUIRED'
  | 'INVALID_INPUT'
  | 'SECURITY_VAULT_ERROR'
  | 'CREDENTIAL_NOT_FOUND'
  | 'DPAPI_ENCRYPTION_FAILED'
  | 'INVALID_SESSION_DATA'
  | 'DATABASE_ERROR'
  | 'DATABASE_MIGRATION_ERROR'
  | 'IPC_VALIDATION_FAILED'
  | 'UNAUTHORIZED_ACCESS';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
