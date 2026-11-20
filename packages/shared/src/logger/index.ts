export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /session_?token/i,
  /refresh_?token/i,
  /auth(?:orization)?/i,
  /secret/i,
  /credential_?blob/i,
  /private_?key/i,
];

/**
 * Recursively redacts sensitive keys and values from objects before logging.
 */
export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact JWT tokens, Bearer strings, and basic auth headers
    let sanitized = data
      .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
      .replace(/"(password|token|session_token)":\s*"[^"]+"/gi, '"$1":"[REDACTED]"');

    // Redact DPAPI base64 blobs (>80 characters continuous base64)
    sanitized = sanitized.replace(/([A-Za-z0-9+/=]{80,})/g, '[REDACTED_BLOB]');

    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = redactSensitiveData(val);
      }
    }
    return cleaned;
  }

  return data;
}

export class Logger {
  private static formatLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? redactSensitiveData(message) : message,
      context: context !== undefined ? redactSensitiveData(context) : undefined,
    };
  }

  public static info(message: string, context?: any): void {
    const entry = this.formatLog('info', message, context);
    console.log(`[${entry.timestamp}] [INFO] ${entry.message}`, entry.context !== undefined ? entry.context : '');
  }

  public static warn(message: string, context?: any): void {
    const entry = this.formatLog('warn', message, context);
    console.warn(`[${entry.timestamp}] [WARN] ${entry.message}`, entry.context !== undefined ? entry.context : '');
  }

  public static error(message: string, context?: any): void {
    const entry = this.formatLog('error', message, context);
    console.error(`[${entry.timestamp}] [ERROR] ${entry.message}`, entry.context !== undefined ? entry.context : '');
  }

  public static debug(message: string, context?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.formatLog('debug', message, context);
      console.debug(`[${entry.timestamp}] [DEBUG] ${entry.message}`, entry.context !== undefined ? entry.context : '');
    }
  }
}
