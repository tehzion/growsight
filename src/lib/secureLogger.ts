import { isDevelopment } from '../config/environment';

// Secure logging utility that prevents sensitive data exposure
export class SecureLogger {
  // List of sensitive keys to redact
  private static readonly SENSITIVE_KEYS = [
    'password', 'token', 'key', 'secret', 'auth', 'credential', 
    'otp', 'email', 'phone', 'ssn', 'id', 'uuid', 'session',
    'access_token', 'refresh_token', 'api_key', 'private_key'
  ];

  // Redact sensitive information from objects
  private static redactSensitiveData(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      // Check if string looks like sensitive data
      if (obj.length > 10 && (obj.includes('@') || obj.match(/^[a-zA-Z0-9-_]{20,}$/))) {
        return '[REDACTED]';
      }
      return obj;
    }
    
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.redactSensitiveData(item));
    }
    
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.SENSITIVE_KEYS.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      );
      
      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = this.redactSensitiveData(value);
      }
    }
    return redacted;
  }

  // Safe development-only logging
  static dev(message: string, data?: unknown): void {
    if (isDevelopment()) {
      const redactedData = data ? this.redactSensitiveData(data) : undefined;
      console.log(`[DEV] ${message}`, redactedData);
    }
  }

  // Error logging (always enabled but with redaction)
  static error(message: string, error?: unknown): void {
    const redactedError = error ? this.redactSensitiveData(error) : undefined;
    console.error(`[ERROR] ${message}`, redactedError);
  }

  // Warning logging (always enabled but with redaction)
  static warn(message: string, data?: unknown): void {
    const redactedData = data ? this.redactSensitiveData(data) : undefined;
    console.warn(`[WARN] ${message}`, redactedData);
  }

  // Info logging (production safe)
  static info(message: string): void {
    console.info(`[INFO] ${message}`);
  }

  // Demo mode logging (sanitized)
  static demo(message: string, action?: string): void {
    if (isDevelopment()) {
      console.log(`[DEMO] ${message}${action ? ` - Action: ${action}` : ''}`);
    }
  }

  // Performance logging
  static perf(label: string, startTime?: number): void {
    if (isDevelopment()) {
      if (startTime) {
        const duration = performance.now() - startTime;
        console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
      } else {
        console.time(`[PERF] ${label}`);
      }
    }
  }

  // Organization access validation
  static validateOrgAccess(userOrgId: string, targetOrgId: string, context: string): boolean {
    if (userOrgId !== targetOrgId) {
      this.warn(`Cross-organization access attempt in ${context}`, {
        userOrg: userOrgId ? '[ORG_ID]' : 'null',
        targetOrg: targetOrgId ? '[ORG_ID]' : 'null'
      });
      return false;
    }
    return true;
  }

  // User access validation
  static validateUserAccess(currentUserId: string, targetUserId: string, context: string): boolean {
    if (currentUserId !== targetUserId) {
      this.dev(`User access validation in ${context}`, {
        currentUser: '[USER_ID]',
        targetUser: '[USER_ID]',
        match: false
      });
      return false;
    }
    return true;
  }
}

export default SecureLogger;