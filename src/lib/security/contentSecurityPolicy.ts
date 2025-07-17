/**
 * Content Security Policy (CSP) configuration and utilities
 * Provides protection against XSS attacks by controlling resource loading
 */

export interface CSPConfig {
  reportOnly?: boolean;
  reportUri?: string;
  directives: {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    connectSrc?: string[];
    fontSrc?: string[];
    objectSrc?: string[];
    mediaSrc?: string[];
    frameSrc?: string[];
    childSrc?: string[];
    workerSrc?: string[];
    manifestSrc?: string[];
    baseUri?: string[];
    formAction?: string[];
    frameAncestors?: string[];
    upgradeInsecureRequests?: boolean;
  };
}

export class ContentSecurityPolicy {
  /**
   * Default CSP configuration for the application
   */
  private static readonly DEFAULT_CONFIG: CSPConfig = {
    reportOnly: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React and Vite dev mode
        "'unsafe-eval'", // Required for development mode
        "https://fonts.googleapis.com",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS libraries and inline styles
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:", // For base64 encoded images
        "blob:", // For generated images
        "https:", // Allow HTTPS images
        "https://fonts.gstatic.com" // For font icons
      ],
      connectSrc: [
        "'self'",
        "https://api.supabase.co", // Supabase API
        "https://*.supabase.co", // Supabase subdomains
        "wss://*.supabase.co", // Supabase WebSocket
        "https://www.google-analytics.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "data:" // For base64 encoded fonts
      ],
      objectSrc: ["'none'"], // Prevent Flash and other plugins
      mediaSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'none'"], // Prevent iframe embedding
      childSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"], // For web workers
      manifestSrc: ["'self'"],
      baseUri: ["'self'"], // Restrict base URI
      formAction: ["'self'"], // Restrict form submissions
      frameAncestors: ["'none'"], // Prevent clickjacking
      upgradeInsecureRequests: true // Upgrade HTTP to HTTPS
    }
  };

  /**
   * Production CSP configuration (stricter)
   */
  private static readonly PRODUCTION_CONFIG: CSPConfig = {
    reportOnly: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Still needed for CSS-in-JS
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.supabase.co",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://www.google-analytics.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "data:"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'none'"],
      childSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: true
    }
  };

  /**
   * Generate CSP header string from configuration
   */
  static generateCSPHeader(config: CSPConfig = this.DEFAULT_CONFIG): string {
    const directives: string[] = [];

    for (const [directive, values] of Object.entries(config.directives)) {
      if (directive === 'upgradeInsecureRequests' && values === true) {
        directives.push('upgrade-insecure-requests');
        continue;
      }

      if (Array.isArray(values) && values.length > 0) {
        const kebabDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
        directives.push(`${kebabDirective} ${values.join(' ')}`);
      }
    }

    return directives.join('; ');
  }

  /**
   * Apply CSP to the current document
   */
  static applyCSP(config?: CSPConfig): void {
    const finalConfig = config || (process.env.NODE_ENV === 'production' 
      ? this.PRODUCTION_CONFIG 
      : this.DEFAULT_CONFIG);

    const cspHeader = this.generateCSPHeader(finalConfig);
    const headerName = finalConfig.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

    // Create meta tag for CSP
    const existingMeta = document.querySelector(`meta[http-equiv="${headerName}"]`);
    if (existingMeta) {
      existingMeta.remove();
    }

    const meta = document.createElement('meta');
    meta.httpEquiv = headerName;
    meta.content = cspHeader;
    document.head.appendChild(meta);

    console.info(`Applied ${headerName}:`, cspHeader);
  }

  /**
   * Get CSP configuration for current environment
   */
  static getConfig(): CSPConfig {
    return process.env.NODE_ENV === 'production' 
      ? { ...this.PRODUCTION_CONFIG }
      : { ...this.DEFAULT_CONFIG };
  }

  /**
   * Validate if a URL is allowed by current CSP
   */
  static isUrlAllowed(url: string, directive: keyof CSPConfig['directives']): boolean {
    const config = this.getConfig();
    const allowedSources = config.directives[directive] || [];

    // Check if URL matches any allowed source
    return allowedSources.some(source => {
      if (source === "'self'") {
        return url.startsWith(window.location.origin);
      }
      if (source === "'none'") {
        return false;
      }
      if (source.startsWith('https://')) {
        return url.startsWith(source) || url.startsWith(source.replace('https://', 'https://'));
      }
      if (source === 'data:') {
        return url.startsWith('data:');
      }
      if (source === 'blob:') {
        return url.startsWith('blob:');
      }
      if (source === 'https:') {
        return url.startsWith('https://');
      }
      return false;
    });
  }

  /**
   * Generate nonce for inline scripts/styles
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Add nonce to CSP configuration
   */
  static addNonce(config: CSPConfig, nonce: string): CSPConfig {
    const newConfig = { ...config };
    const nonceValue = `'nonce-${nonce}'`;

    if (newConfig.directives.scriptSrc) {
      newConfig.directives.scriptSrc = [...newConfig.directives.scriptSrc, nonceValue];
    }
    if (newConfig.directives.styleSrc) {
      newConfig.directives.styleSrc = [...newConfig.directives.styleSrc, nonceValue];
    }

    return newConfig;
  }
}

export default ContentSecurityPolicy;