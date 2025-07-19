/**
 * Security Headers Configuration
 * Implements comprehensive security headers for enterprise-grade protection
 */

export interface SecurityConfig {
  environment: 'development' | 'staging' | 'production';
  domain: string;
  allowedOrigins: string[];
  cdnDomains: string[];
  reportUri?: string;
}

export class SecurityHeaders {
  private static instance: SecurityHeaders;
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  static getInstance(config?: SecurityConfig): SecurityHeaders {
    if (!SecurityHeaders.instance && config) {
      SecurityHeaders.instance = new SecurityHeaders(config);
    }
    return SecurityHeaders.instance;
  }

  /**
   * Generate Content Security Policy
   */
  generateCSP(): string {
    const { environment, domain, cdnDomains, reportUri } = this.config;
    
    // Base CSP directives
    const directives: Record<string, string[]> = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "'unsafe-eval'", // Required for development tools
        'https://js.stripe.com',
        'https://checkout.stripe.com',
        ...cdnDomains
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS
        'https://fonts.googleapis.com',
        ...cdnDomains
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'data:',
        ...cdnDomains
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        `https://*.${domain}`,
        ...cdnDomains
      ],
      'connect-src': [
        "'self'",
        'https://api.stripe.com',
        `https://*.${domain}`,
        'wss:',
        'ws:',
        ...cdnDomains
      ],
      'frame-src': [
        "'self'",
        'https://js.stripe.com',
        'https://hooks.stripe.com'
      ],
      'worker-src': [
        "'self'",
        'blob:'
      ],
      'child-src': [
        "'self'",
        'blob:'
      ],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'block-all-mixed-content': [],
      'upgrade-insecure-requests': []
    };

    // Adjust for development environment
    if (environment === 'development') {
      directives['script-src'].push("'unsafe-eval'");
      directives['connect-src'].push('ws://localhost:*', 'http://localhost:*');
    }

    // Add report URI if configured
    if (reportUri) {
      directives['report-uri'] = [reportUri];
      directives['report-to'] = ['csp-endpoint'];
    }

    // Convert to CSP string
    return Object.entries(directives)
      .map(([directive, sources]) => 
        sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive
      )
      .join('; ');
  }

  /**
   * Generate Permissions Policy (formerly Feature Policy)
   */
  generatePermissionsPolicy(): string {
    const policies = [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'battery=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=(self)',
      'picture-in-picture=()',
      'publickey-credentials-get=(self)',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()'
    ];

    return policies.join(', ');
  }

  /**
   * Apply all security headers
   */
  applyHeaders(): void {
    if (typeof document === 'undefined') return; // Server-side check

    const headers = this.getAllHeaders();
    
    // Apply meta tags for headers that can be set via HTML
    Object.entries(headers).forEach(([name, value]) => {
      if (this.canBeSetViaMeta(name)) {
        this.setMetaTag(name, value);
      }
    });

    // Log security headers for debugging
    if (this.config.environment === 'development') {
      console.group('🔒 Security Headers Applied');
      Object.entries(headers).forEach(([name, value]) => {
        console.log(`${name}:`, value);
      });
      console.groupEnd();
    }
  }

  /**
   * Get all security headers
   */
  getAllHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': this.generateCSP(),
      'Permissions-Policy': this.generatePermissionsPolicy(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    };
  }

  /**
   * Check if header can be set via meta tag
   */
  private canBeSetViaMeta(headerName: string): boolean {
    const metaSettableHeaders = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'Referrer-Policy'
    ];
    return metaSettableHeaders.includes(headerName);
  }

  /**
   * Set meta tag for security headers
   */
  private setMetaTag(name: string, content: string): void {
    const existingMeta = document.querySelector(`meta[http-equiv="${name}"]`);
    if (existingMeta) {
      existingMeta.setAttribute('content', content);
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  }

  /**
   * Validate current CSP compliance
   */
  validateCSP(): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];
    const csp = this.generateCSP();

    // Check for common CSP issues
    if (csp.includes("'unsafe-inline'") && this.config.environment === 'production') {
      violations.push("Unsafe inline scripts/styles allowed in production");
    }

    if (csp.includes("'unsafe-eval'") && this.config.environment === 'production') {
      violations.push("Unsafe eval allowed in production");
    }

    if (!csp.includes('report-uri') && this.config.environment === 'production') {
      violations.push("No CSP reporting configured");
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  /**
   * Generate CORS configuration for server
   */
  getCORSConfig() {
    const { allowedOrigins, domain } = this.config;

    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        // Check against allowed origins
        const allowed = allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin === '*') return true;
          if (allowedOrigin === origin) return true;
          if (allowedOrigin.startsWith('*.') && origin.endsWith(allowedOrigin.slice(1))) return true;
          return false;
        });

        if (allowed) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token',
        'X-API-Key',
        'Cache-Control'
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset'
      ],
      maxAge: 86400 // 24 hours
    };
  }
}

/**
 * Initialize security headers with environment-specific configuration
 */
export function initializeSecurityHeaders(config: SecurityConfig): void {
  const securityHeaders = SecurityHeaders.getInstance(config);
  securityHeaders.applyHeaders();

  // Validate CSP in development
  if (config.environment === 'development') {
    const validation = securityHeaders.validateCSP();
    if (!validation.compliant) {
      console.warn('⚠️ CSP Violations detected:', validation.violations);
    }
  }
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
  domain: process.env.VITE_APP_DOMAIN || 'localhost',
  allowedOrigins: [
    process.env.VITE_APP_URL || 'http://localhost:5173',
    process.env.VITE_API_URL || 'http://localhost:3000',
    'https://*.growsight.app',
    'https://growsight.app'
  ],
  cdnDomains: [
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ],
  reportUri: process.env.VITE_CSP_REPORT_URI
};