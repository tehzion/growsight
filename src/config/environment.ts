export interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  email: {
    provider: 'sendgrid' | 'mailgun' | 'aws-ses' | 'smtp' | 'demo';
    apiKey: string;
    fromEmail: string;
    fromName: string;
    domain?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUsername?: string;
    smtpPassword?: string;
  };
  app: {
    name: string;
    url: string;
    supportEmail: string;
    environment: 'development' | 'staging' | 'production';
    version: string;
  };
  features: {
    emailNotifications: boolean;
    pdfExports: boolean;
    analytics: boolean;
    realTimeUpdates: boolean;
    advancedReporting: boolean;
  };
  security: {
    sessionTimeout: number;
    maxFileSize: number;
    passwordMinLength: number;
    maxLoginAttempts: number;
  };
  performance: {
    cacheTimeout: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
  };
}

// Check if we're in demo mode
export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || 
                         !import.meta.env.VITE_SUPABASE_ANON_KEY || 
                         import.meta.env.VITE_SUPABASE_URL === 'https://demo.supabase.co' || 
                         import.meta.env.VITE_SUPABASE_ANON_KEY === 'demo-key';

const getConfig = (): AppConfig => {
  const isDevelopment = import.meta.env.DEV;
  const isStaging = import.meta.env.VITE_NODE_ENV === 'staging';
  const isProduction = import.meta.env.PROD && !isStaging;
  
  return {
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key',
    },
    email: {
      provider: isDevelopment || isDemoMode ? 'demo' : (import.meta.env.VITE_EMAIL_PROVIDER || 'smtp'),
      apiKey: import.meta.env.VITE_SENDGRID_API_KEY || import.meta.env.VITE_MAILGUN_API_KEY || '',
      fromEmail: import.meta.env.VITE_EMAIL_FROM_ADDRESS || 'noreply@growsight.com',
      fromName: import.meta.env.VITE_EMAIL_FROM_NAME || 'Growsight',
      domain: import.meta.env.VITE_MAILGUN_DOMAIN,
      smtpHost: import.meta.env.VITE_SMTP_HOST,
      smtpPort: parseInt(import.meta.env.VITE_SMTP_PORT || '587'),
      smtpSecure: import.meta.env.VITE_SMTP_SECURE === 'true',
      smtpUsername: import.meta.env.VITE_SMTP_USERNAME,
      smtpPassword: import.meta.env.VITE_SMTP_PASSWORD,
    },
    app: {
      name: import.meta.env.VITE_APP_NAME || 'Growsight',
      url: import.meta.env.VITE_APP_URL || (isDevelopment ? 'http://localhost:3000' : 'https://your-domain.com'),
      supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@growsight.com',
      environment: isDevelopment ? 'development' : isStaging ? 'staging' : 'production',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    },
    features: {
      emailNotifications: import.meta.env.VITE_ENABLE_EMAIL_NOTIFICATIONS !== 'false',
      pdfExports: import.meta.env.VITE_ENABLE_PDF_EXPORTS !== 'false',
      analytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
      realTimeUpdates: import.meta.env.VITE_ENABLE_REALTIME !== 'false',
      advancedReporting: import.meta.env.VITE_ENABLE_ADVANCED_REPORTING !== 'false',
    },
    security: {
      sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600000'), // 1 hour
      maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760'), // 10MB
      passwordMinLength: parseInt(import.meta.env.VITE_PASSWORD_MIN_LENGTH || '8'),
      maxLoginAttempts: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || '5'),
    },
    performance: {
      cacheTimeout: parseInt(import.meta.env.VITE_CACHE_TIMEOUT || '300000'), // 5 minutes
      maxConcurrentRequests: parseInt(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS || '10'),
      requestTimeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '30000'), // 30 seconds
    },
  };
};

export const config = getConfig();

// Environment validation
export const validateEnvironment = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!isDemoMode) {
    if (!config.supabase.url || config.supabase.url === 'https://demo.supabase.co') {
      errors.push('VITE_SUPABASE_URL is required for production');
    }
    
    if (!config.supabase.anonKey || config.supabase.anonKey === 'demo-key') {
      errors.push('VITE_SUPABASE_ANON_KEY is required for production');
    }
    
    if (config.features.emailNotifications) {
      if (config.email.provider === 'smtp') {
        if (!config.email.smtpHost) {
          errors.push('SMTP host is required when using SMTP email provider');
        }
        if (!config.email.smtpPort) {
          errors.push('SMTP port is required when using SMTP email provider');
        }
        if (!config.email.smtpUsername) {
          errors.push('SMTP username is required when using SMTP email provider');
        }
      } else if (config.email.provider === 'sendgrid' || config.email.provider === 'mailgun' || config.email.provider === 'aws-ses') {
        if (!config.email.apiKey) {
          errors.push(`API key is required when using ${config.email.provider} email provider`);
        }
      }
    }
  }
  
  if (config.security.passwordMinLength < 8) {
    errors.push('Password minimum length should be at least 8 characters');
  }
  
  if (config.security.sessionTimeout < 300000) { // 5 minutes
    errors.push('Session timeout should be at least 5 minutes for security');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Feature flags helper
export const isFeatureEnabled = (feature: keyof AppConfig['features']): boolean => {
  return config.features[feature];
};

// Environment helpers
export const isProduction = () => config.app.environment === 'production';
export const isStaging = () => config.app.environment === 'staging';
export const isDevelopment = () => config.app.environment === 'development';