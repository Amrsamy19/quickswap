const SECRET_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /cookie/i,
  /auth_header/i,
  /credential_blob/i,
];

export class SecuritySanitizer {
  /**
   * Sanitizes an object before logging or saving to activity logs, replacing sensitive fields.
   */
  public static sanitize(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') {
      // Redact potential inline passwords/secrets like password=XYZ, password: XYZ, or direct values
      return data.replace(/(password|secret|token|bearer)\s*[:=]\s*([^\s,;]+)/gi, '$1=[REDACTED]');
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }
    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (SECRET_FIELD_PATTERNS.some((pattern) => pattern.test(key))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitize(value);
        } else if (typeof value === 'string') {
          sanitized[key] = this.sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return data;
  }

  /**
   * Asserts that an object does not contain obvious raw secret strings or tokens in unredacted fields.
   */
  public static assertSafeMetadata(data: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && SECRET_FIELD_PATTERNS.some((p) => p.test(key))) {
        if (value !== '[REDACTED]' && !key.includes('Ref') && !key.includes('Id')) {
          throw new Error(`Security breach: Plaintext secret field "${key}" detected in metadata payload!`);
        }
      }
    }
  }
}
