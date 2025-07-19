/**
 * Security Initialization
 * Centralizes all security feature initialization
 */

import { initializeSecurityHeaders, defaultSecurityConfig } from './securityHeaders';
import { sessionEncryption } from './sessionEncryption';
import { gdprCompliance } from '../compliance/gdpr';
import { config } from '../../config/environment';
import SecureLogger from '../secureLogger';

export interface SecurityInitOptions {
  environment?: 'development' | 'staging' | 'production';
  domain?: string;
  allowedOrigins?: string[];
  enableGDPR?: boolean;
  enableSessionEncryption?: boolean;
  enableSecurityHeaders?: boolean;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private initialized = false;
  private options: SecurityInitOptions = {};

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Initialize all security features
   */
  async initialize(options: SecurityInitOptions = {}): Promise<void> {
    if (this.initialized) {
      console.warn('Security manager already initialized');
      return;
    }

    this.options = {
      environment: config.environment,
      domain: config.app.domain,
      allowedOrigins: [config.app.url, config.api.url],
      enableGDPR: true,
      enableSessionEncryption: true,
      enableSecurityHeaders: true,
      ...options
    };

    try {
      // Initialize session encryption
      if (this.options.enableSessionEncryption) {
        await this.initializeSessionEncryption();
      }

      // Initialize security headers
      if (this.options.enableSecurityHeaders) {
        await this.initializeSecurityHeaders();
      }

      // Initialize GDPR compliance (if enabled)
      if (this.options.enableGDPR) {
        await this.initializeGDPRCompliance();
      }

      // Set up security monitoring
      await this.initializeSecurityMonitoring();

      this.initialized = true;
      
      SecureLogger.info('Security manager initialized successfully', {
        type: 'security',
        context: 'initialization',
        features: {
          sessionEncryption: this.options.enableSessionEncryption,
          securityHeaders: this.options.enableSecurityHeaders,
          gdprCompliance: this.options.enableGDPR
        }
      });

    } catch (error) {
      SecureLogger.error('Security initialization failed', { error });
      throw new Error(`Security initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize session encryption
   */
  private async initializeSessionEncryption(): Promise<void> {
    try {
      await sessionEncryption.initialize();
      console.debug('✅ Session encryption initialized');
    } catch (error) {
      console.error('❌ Session encryption initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize security headers
   */
  private async initializeSecurityHeaders(): Promise<void> {
    try {
      const securityConfig = {
        ...defaultSecurityConfig,
        environment: this.options.environment || 'development',
        domain: this.options.domain || 'localhost',
        allowedOrigins: this.options.allowedOrigins || ['http://localhost:5173']
      };

      initializeSecurityHeaders(securityConfig);
      console.debug('✅ Security headers initialized');
    } catch (error) {
      console.error('❌ Security headers initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize GDPR compliance features
   */
  private async initializeGDPRCompliance(): Promise<void> {
    try {
      // GDPR compliance is initialized on-demand
      // Just verify it's available
      if (gdprCompliance) {
        console.debug('✅ GDPR compliance features available');
      }
    } catch (error) {
      console.error('❌ GDPR compliance initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize security monitoring
   */
  private async initializeSecurityMonitoring(): Promise<void> {
    try {
      // Set up global error handler for security events
      window.addEventListener('error', (event) => {
        if (this.isSecurityRelatedError(event.error)) {
          SecureLogger.error('Security-related error detected', {
            type: 'security',
            context: 'global_error_handler',
            error: event.error?.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          });
        }
      });

      // Set up unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        if (this.isSecurityRelatedError(event.reason)) {
          SecureLogger.error('Security-related unhandled rejection', {
            type: 'security',
            context: 'unhandled_rejection',
            reason: event.reason?.message || event.reason
          });
        }
      });

      // Monitor for CSP violations
      document.addEventListener('securitypolicyviolation', (event) => {
        SecureLogger.error('Content Security Policy violation', {
          type: 'security',
          context: 'csp_violation',
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          originalPolicy: event.originalPolicy,
          documentURI: event.documentURI,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber,
          columnNumber: event.columnNumber
        });
      });

      console.debug('✅ Security monitoring initialized');
    } catch (error) {
      console.error('❌ Security monitoring initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if an error is security-related
   */
  private isSecurityRelatedError(error: any): boolean {
    if (!error) return false;
    
    const securityKeywords = [
      'csrf', 'xss', 'injection', 'unauthorized', 'forbidden',
      'authentication', 'authorization', 'session', 'token',
      'security', 'cors', 'csp', 'integrity'
    ];
    
    const errorMessage = (error.message || '').toLowerCase();
    return securityKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Get security status
   */
  getSecurityStatus(): {
    initialized: boolean;
    features: Record<string, boolean>;
    environment: string;
  } {
    return {
      initialized: this.initialized,
      features: {
        sessionEncryption: this.options.enableSessionEncryption || false,
        securityHeaders: this.options.enableSecurityHeaders || false,
        gdprCompliance: this.options.enableGDPR || false
      },
      environment: this.options.environment || 'unknown'
    };
  }

  /**
   * Validate current security configuration
   */
  validateSecurityConfig(): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if in production with development settings
    if (this.options.environment === 'production') {
      if (this.options.allowedOrigins?.includes('http://localhost:5173')) {
        issues.push('Localhost origins allowed in production');
      }
      
      if (!this.options.enableSessionEncryption) {
        issues.push('Session encryption disabled in production');
      }
      
      if (!this.options.enableSecurityHeaders) {
        issues.push('Security headers disabled in production');
      }
      
      if (!this.options.enableGDPR) {
        recommendations.push('Consider enabling GDPR compliance for European users');
      }
    }

    // Check for missing security features
    if (!this.options.enableSessionEncryption) {
      recommendations.push('Enable session encryption for better security');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();

// Convenience function for easy initialization
export async function initializeSecurity(options?: SecurityInitOptions): Promise<void> {
  await securityManager.initialize(options);
}