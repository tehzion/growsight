# Environment Configuration Example

Copy this configuration to your `.env` file and modify the values for your environment.

## Required Configuration

```bash
# Application URL (REQUIRED for domain-aware CSP)
# This URL is used to automatically generate domain-specific CSP sources
VITE_APP_URL="https://app.leadership360.com"

# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

## CSP Configuration (Domain-Aware)

```bash
# Content Security Policy - Domain sources are automatically generated from VITE_APP_URL
# You only need to add external services beyond your domain

# Script Sources - Allowed script sources
VITE_CSP_SCRIPT_SRC="'self', 'unsafe-inline', https://cdn.yourcompany.com, https://www.google-analytics.com"

# Style Sources - Allowed style sources  
VITE_CSP_STYLE_SRC="'self', 'unsafe-inline', https://fonts.googleapis.com, https://fonts.gstatic.com"

# Image Sources - Allowed image sources
VITE_CSP_IMG_SRC="'self', data:, blob:, https:, https://cdn.yourcompany.com"

# Connect Sources - Allowed API connections (domain and Supabase are auto-added)
VITE_CSP_CONNECT_SRC="'self', https://api.stripe.com"

# Font Sources - Allowed font sources
VITE_CSP_FONT_SRC="'self', https://fonts.googleapis.com, https://fonts.gstatic.com, data:"

# Additional Connect Sources - Additional API endpoints beyond domain and Supabase
VITE_CSP_ADDITIONAL_CONNECT_SRC="https://api.sendgrid.com, https://webhook.site"

# CSP Report Only Mode - Set to "true" for development/testing
VITE_CSP_REPORT_ONLY="false"

# CSP Report URI - URI for CSP violation reports
VITE_CSP_REPORT_URI="https://your-csp-reporter.com/report"

# CSP Upgrade Insecure Requests - Set to "false" to disable HTTPS upgrade
VITE_CSP_UPGRADE_INSECURE_REQUESTS="true"
```

## Application Configuration

```bash
# Application Name
VITE_APP_NAME="Leadership 360"

# Support Email
VITE_SUPPORT_EMAIL="support@leadership360.com"

# Application Version
VITE_APP_VERSION="1.0.0"
```

## Feature Flags

```bash
# Enable/disable features
VITE_ENABLE_EMAIL_NOTIFICATIONS="true"
VITE_ENABLE_PDF_EXPORTS="true"
VITE_ENABLE_ANALYTICS="true"
VITE_ENABLE_REALTIME="true"
VITE_ENABLE_ADVANCED_REPORTING="true"
```

## Security Settings

```bash
# Session timeout in milliseconds (1 hour)
VITE_SESSION_TIMEOUT="3600000"

# Maximum file size in bytes (10MB)
VITE_MAX_FILE_SIZE="10485760"

# Password minimum length
VITE_PASSWORD_MIN_LENGTH="8"

# Maximum login attempts
VITE_MAX_LOGIN_ATTEMPTS="5"
```

## Email Configuration

```bash
# Email provider (sendgrid, mailgun, aws-ses, smtp, demo)
VITE_EMAIL_PROVIDER="smtp"

# Email from address
VITE_EMAIL_FROM_ADDRESS="noreply@leadership360.com"

# Email from name
VITE_EMAIL_FROM_NAME="Leadership 360"

# SMTP Configuration (if using SMTP)
VITE_SMTP_HOST="smtp.yourcompany.com"
VITE_SMTP_PORT="587"
VITE_SMTP_SECURE="true"
VITE_SMTP_USERNAME="your-smtp-username"
VITE_SMTP_PASSWORD="your-smtp-password"

# SendGrid API Key (if using SendGrid)
# VITE_SENDGRID_API_KEY="your-sendgrid-api-key"

# Mailgun API Key (if using Mailgun)
# VITE_MAILGUN_API_KEY="your-mailgun-api-key"
# VITE_MAILGUN_DOMAIN="your-mailgun-domain"
```

## Development vs Production

### Development (.env.development)
```bash
VITE_APP_URL="http://localhost:3000"
VITE_CSP_REPORT_ONLY="true"
VITE_CSP_SCRIPT_SRC="'self', 'unsafe-inline', 'unsafe-eval', https://localhost:3000"
```

### Production (.env.production)
```bash
VITE_APP_URL="https://app.leadership360.com"
VITE_CSP_REPORT_ONLY="false"
VITE_CSP_REPORT_URI="https://your-csp-reporter.com/report"
VITE_CSP_SCRIPT_SRC="'self', https://cdn.yourcompany.com, https://www.google-analytics.com"
```

## Testing CSP Configuration

To test if your CSP is working correctly:

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Look for CSP-related messages
4. Check the Network tab for any blocked requests
5. Import the test utility: `import { testCSPConfiguration } from './lib/security/cspTest'`
6. Run: `testCSPConfiguration()`

## Domain Sources Generated

For `VITE_APP_URL="https://app.leadership360.com"`, the following sources are automatically included:

- `https://app.leadership360.com`
- `wss://app.leadership360.com`
- `https://api.app.leadership360.com`
- `wss://api.app.leadership360.com`
- `https://cdn.app.leadership360.com`
- `wss://cdn.app.leadership360.com`
- `https://static.app.leadership360.com`
- `wss://static.app.leadership360.com`
- `https://assets.app.leadership360.com`
- `wss://assets.app.leadership360.com`
- `https://media.app.leadership360.com`
- `wss://media.app.leadership360.com`
- `https://img.app.leadership360.com`
- `wss://img.app.leadership360.com`
- `https://js.app.leadership360.com`
- `wss://js.app.leadership360.com`
- `https://css.app.leadership360.com`
- `wss://css.app.leadership360.com`
- `https://*.app.leadership360.com`
- `wss://*.app.leadership360.com` 