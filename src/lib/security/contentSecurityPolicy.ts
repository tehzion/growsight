/**
 * Content Security Policy (CSP) configuration and utilities
 * Provides protection against XSS attacks by controlling resource loading
 */

import { config } from '../../config/environment';

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
   * Parse environment variable for CSP sources
   * Supports comma-separated values and wildcards
   */
  private static parseEnvSources(envVar: string | undefined, defaultValue: string[] = []): string[] {
    if (!envVar) return defaultValue;
    
    return envVar
      .split(',')
      .map(source => source.trim())
      .filter(source => source.length > 0);
  }

  /**
   * Extract domain from URL for CSP configuration
   */
  private static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Generate domain-specific CSP sources
   */
  private static generateDomainSources(domain: string): string[] {
    if (!domain) return [];
    
    const sources: string[] = [];
    
    // Add the domain itself
    sources.push(`https://${domain}`);
    sources.push(`wss://${domain}`);
    
    // Add common subdomains
    const commonSubdomains = ['api', 'cdn', 'static', 'assets', 'media', 'img', 'js', 'css'];
    commonSubdomains.forEach(subdomain => {
      sources.push(`https://${subdomain}.${domain}`);
      sources.push(`wss://${subdomain}.${domain}`);
    });
    
    // Add wildcard for any subdomain
    sources.push(`https://*.${domain}`);
    sources.push(`wss://*.${domain}`);
    
    return sources;
  }

  /**
   * Get dynamic CSP configuration based on environment variables and domain
   */
  private static getDynamicConfig(): CSPConfig {
    const isDevelopment = config.app.environment === 'development';
    const isProduction = config.app.environment === 'production';
    const appDomain = this.extractDomain(config.app.url);
    
    // Generate domain-specific sources
    const domainSources = this.generateDomainSources(appDomain);
    
    // Parse environment variables for CSP sources
    const allowedScriptSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_SCRIPT_SRC,
      [
        "'self'",
        ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
        ...domainSources,
        "https://fonts.googleapis.com",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com"
      ]
    );

    const allowedStyleSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_STYLE_SRC,
      [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS libraries and inline styles
        ...domainSources,
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ]
    );

    const allowedImageSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_IMG_SRC,
      [
        "'self'",
        "data:", // For base64 encoded images
        "blob:", // For generated images
        "https:", // Allow HTTPS images
        ...domainSources,
        "https://fonts.gstatic.com" // For font icons
      ]
    );

    const allowedConnectSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_CONNECT_SRC,
      [
        "'self'",
        // Domain-specific sources
        ...domainSources,
        // Supabase sources (if configured)
        ...(config.supabase.url ? [
          config.supabase.url,
          config.supabase.url.replace('https://', 'wss://'),
          "https://*.supabase.co",
          "wss://*.supabase.co"
        ] : []),
        // Additional API sources from environment
        ...this.parseEnvSources(import.meta.env.VITE_CSP_ADDITIONAL_CONNECT_SRC),
        "https://www.google-analytics.com"
      ]
    );

    const allowedFontSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_FONT_SRC,
      [
        "'self'",
        ...domainSources,
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "data:" // For base64 encoded fonts
      ]
    );

    const allowedFrameSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_FRAME_SRC,
      ["'none'"] // Prevent iframe embedding by default
    );

    const allowedObjectSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_OBJECT_SRC,
      ["'none'"] // Prevent Flash and other plugins
    );

    const allowedMediaSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_MEDIA_SRC,
      [
        "'self'", 
        "data:", 
        "blob:",
        ...domainSources
      ]
    );

    const allowedWorkerSources = this.parseEnvSources(
      import.meta.env.VITE_CSP_WORKER_SRC,
      [
        "'self'", 
        "blob:",
        ...domainSources
      ]
    );

    const allowedFormActions = this.parseEnvSources(
      import.meta.env.VITE_CSP_FORM_ACTION,
      [
        "'self'",
        ...domainSources
      ]
    );

    const allowedFrameAncestors = this.parseEnvSources(
      import.meta.env.VITE_CSP_FRAME_ANCESTORS,
      ["'none'"] // Prevent clickjacking
    );

    return {
      reportOnly: import.meta.env.VITE_CSP_REPORT_ONLY === 'true',
      reportUri: import.meta.env.VITE_CSP_REPORT_URI,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: allowedScriptSources,
        styleSrc: allowedStyleSources,
        imgSrc: allowedImageSources,
        connectSrc: allowedConnectSources,
        fontSrc: allowedFontSources,
        objectSrc: allowedObjectSources,
        mediaSrc: allowedMediaSources,
        frameSrc: allowedFrameSources,
        childSrc: ["'self'"],
        workerSrc: allowedWorkerSources,
        manifestSrc: ["'self'"],
        baseUri: ["'self'"], // Restrict base URI
        formAction: allowedFormActions,
        frameAncestors: allowedFrameAncestors,
        upgradeInsecureRequests: import.meta.env.VITE_CSP_UPGRADE_INSECURE_REQUESTS !== 'false'
      }
    };
  }

  /**
   * Default CSP configuration for the application (fallback)
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
   * Generate CSP header string from configuration
   */
  static generateCSPHeader(config: CSPConfig = this.getDynamicConfig()): string {
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

    // Add report-uri if specified
    if (config.reportUri) {
      directives.push(`report-uri ${config.reportUri}`);
    }

    return directives.join('; ');
  }

  /**
   * Apply CSP to the current document
   */
  static applyCSP(customConfig?: CSPConfig): void {
    const finalConfig = customConfig || this.getDynamicConfig();
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
    return this.getDynamicConfig();
  }

  /**
   * Validate if a URL is allowed by current CSP
   */
  static isUrlAllowed(url: string, directive: keyof CSPConfig['directives']): boolean {
    const config = this.getConfig();
    const allowedSources = config.directives[directive];

    // Handle upgradeInsecureRequests boolean
    if (directive === 'upgradeInsecureRequests') {
      return allowedSources === true;
    }

    // Handle array of sources
    if (Array.isArray(allowedSources)) {
      return allowedSources.some((source: string) => {
        if (source === "'self'") {
          return url.startsWith(window.location.origin);
        }
        if (source === "'none'") {
          return false;
        }
        if (source.startsWith('https://')) {
          return url.startsWith(source) || url.startsWith(source.replace('https://', 'https://'));
        }
        if (source.startsWith('wss://')) {
          return url.startsWith(source) || url.startsWith(source.replace('wss://', 'ws://'));
        }
        if (source === 'data:') {
          return url.startsWith('data:');
        }
        if (source === 'blob:') {
          return url.startsWith('blob:');
        }
        if (source === 'https:') {
          return url.startsWith('https:');
        }
        return false;
      });
    }

    return false;
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

  /**
   * Get current domain being used for CSP
   */
  static getCurrentDomain(): string {
    return this.extractDomain(config.app.url);
  }

  /**
   * Get domain-specific sources for the current configuration
   */
  static getDomainSources(): string[] {
    return this.generateDomainSources(this.getCurrentDomain());
  }

  /**
   * Get CSP configuration as environment variables for documentation
   */
  static getEnvironmentVariables(): Record<string, string> {
    return {
      'VITE_APP_URL': 'Your application URL (used to generate domain-specific CSP sources)',
      'VITE_CSP_SCRIPT_SRC': 'Comma-separated list of allowed script sources',
      'VITE_CSP_STYLE_SRC': 'Comma-separated list of allowed style sources',
      'VITE_CSP_IMG_SRC': 'Comma-separated list of allowed image sources',
      'VITE_CSP_CONNECT_SRC': 'Comma-separated list of allowed connect sources',
      'VITE_CSP_FONT_SRC': 'Comma-separated list of allowed font sources',
      'VITE_CSP_FRAME_SRC': 'Comma-separated list of allowed frame sources',
      'VITE_CSP_OBJECT_SRC': 'Comma-separated list of allowed object sources',
      'VITE_CSP_MEDIA_SRC': 'Comma-separated list of allowed media sources',
      'VITE_CSP_WORKER_SRC': 'Comma-separated list of allowed worker sources',
      'VITE_CSP_FORM_ACTION': 'Comma-separated list of allowed form action URLs',
      'VITE_CSP_FRAME_ANCESTORS': 'Comma-separated list of allowed frame ancestors',
      'VITE_CSP_ADDITIONAL_CONNECT_SRC': 'Additional connect sources beyond Supabase',
      'VITE_CSP_REPORT_ONLY': 'Set to "true" to enable report-only mode',
      'VITE_CSP_REPORT_URI': 'URI for CSP violation reports',
      'VITE_CSP_UPGRADE_INSECURE_REQUESTS': 'Set to "false" to disable HTTPS upgrade'
    };
  }

  /**
   * Debug method to show current CSP configuration
   */
  static debugCSP(): void {
    const currentDomain = this.getCurrentDomain();
    const domainSources = this.getDomainSources();
    const config = this.getDynamicConfig();
    const cspHeader = this.generateCSPHeader(config);

    console.group('🔒 Content Security Policy Debug Info');
    console.log('Current Domain:', currentDomain);
    console.log('Domain Sources Generated:', domainSources);
    console.log('Environment:', import.meta.env.DEV ? 'development' : 'production');
    console.log('Report Only Mode:', config.reportOnly);
    console.log('CSP Header:', cspHeader);
    console.log('Environment Variables:');
    console.log('- VITE_APP_URL:', import.meta.env.VITE_APP_URL);
    console.log('- VITE_CSP_REPORT_ONLY:', import.meta.env.VITE_CSP_REPORT_ONLY);
    console.log('- VITE_CSP_ADDITIONAL_CONNECT_SRC:', import.meta.env.VITE_CSP_ADDITIONAL_CONNECT_SRC);
    console.groupEnd();
  }
}

export default ContentSecurityPolicy;