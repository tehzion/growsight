# Content Security Policy (CSP) Environment Configuration

This document explains how to configure the Content Security Policy using environment variables, making it flexible and **domain-aware** based on your `VITE_APP_URL` setting.

## Overview

The CSP configuration now reads from environment variables and **automatically generates domain-specific sources** based on your `VITE_APP_URL`, allowing you to:
- Configure different sources for different environments
- Add custom API endpoints beyond Supabase
- Enable/disable specific security features
- Set up CSP violation reporting
- **Automatically include your domain and common subdomains**

## Domain-Aware Configuration

The CSP automatically extracts your domain from `VITE_APP_URL` and generates sources for:
- Your main domain: `https://yourdomain.com`
- WebSocket connections: `wss://yourdomain.com`
- Common subdomains: `api.yourdomain.com`, `cdn.yourdomain.com`, `static.yourdomain.com`, etc.
- Wildcard subdomains: `*.yourdomain.com`

### Example Domain Sources

If your `VITE_APP_URL` is set to `https://app.leadership360.com`, the CSP automatically includes:

```bash
# Automatically generated from VITE_APP_URL
https://app.leadership360.com
wss://app.leadership360.com
https://api.app.leadership360.com
wss://api.app.leadership360.com
https://cdn.app.leadership360.com
wss://cdn.app.leadership360.com
https://static.app.leadership360.com
wss://static.app.leadership360.com
https://assets.app.leadership360.com
wss://assets.app.leadership360.com
https://media.app.leadership360.com
wss://media.app.leadership360.com
https://img.app.leadership360.com
wss://img.leadership360.com
https://js.app.leadership360.com
wss://js.app.leadership360.com
https://css.app.leadership360.com
wss://css.app.leadership360.com
https://*.app.leadership360.com
wss://*.app.leadership360.com
```

## Environment Variables

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_URL` | **Your application URL** (used to generate domain-specific CSP sources) | `https://app.leadership360.com` |

### Basic CSP Directives

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_CSP_SCRIPT_SRC` | Comma-separated list of allowed script sources | `'self', 'unsafe-inline' (dev), 'unsafe-eval' (dev), **domain sources**, Google Fonts, Analytics` |
| `VITE_CSP_STYLE_SRC` | Comma-separated list of allowed style sources | `'self', 'unsafe-inline', **domain sources**, Google Fonts` |
| `VITE_CSP_IMG_SRC` | Comma-separated list of allowed image sources | `'self', data:, blob:, https:, **domain sources**, Google Fonts` |
| `VITE_CSP_CONNECT_SRC` | Comma-separated list of allowed connect sources | `'self', **domain sources**, Supabase URLs (if configured), Analytics` |
| `VITE_CSP_FONT_SRC` | Comma-separated list of allowed font sources | `'self', **domain sources**, Google Fonts, data:` |
| `VITE_CSP_FRAME_SRC` | Comma-separated list of allowed frame sources | `'none'` |
| `VITE_CSP_OBJECT_SRC` | Comma-separated list of allowed object sources | `'none'` |
| `VITE_CSP_MEDIA_SRC` | Comma-separated list of allowed media sources | `'self', data:, blob:, **domain sources**` |
| `VITE_CSP_WORKER_SRC` | Comma-separated list of allowed worker sources | `'self', blob:, **domain sources**` |
| `VITE_CSP_FORM_ACTION` | Comma-separated list of allowed form action URLs | `'self', **domain sources**` |
| `VITE_CSP_FRAME_ANCESTORS` | Comma-separated list of allowed frame ancestors | `'none'` |

### Additional Configuration

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_CSP_ADDITIONAL_CONNECT_SRC` | Additional connect sources beyond Supabase and domain | None |
| `VITE_CSP_REPORT_ONLY` | Set to "true" to enable report-only mode | `false` |
| `VITE_CSP_REPORT_URI` | URI for CSP violation reports | None |
| `VITE_CSP_UPGRADE_INSECURE_REQUESTS` | Set to "false" to disable HTTPS upgrade | `true` |

## Examples

### Basic Configuration with Domain

```bash
# Set your application URL
VITE_APP_URL="https://app.leadership360.com"

# The CSP will automatically include domain sources, so you only need to add external services
VITE_CSP_SCRIPT_SRC="'self', 'unsafe-inline', https://cdn.jsdelivr.net"

# Allow connections to your API (domain sources are automatically included)
VITE_CSP_CONNECT_SRC="'self', https://api.stripe.com"

# Allow images from your CDN (domain sources are automatically included)
VITE_CSP_IMG_SRC="'self', data:, blob:, https://cdn.yourcompany.com"
```

### Advanced Configuration

```bash
# Your domain
VITE_APP_URL="https://app.leadership360.com"

# Multiple external sources with wildcards
VITE_CSP_SCRIPT_SRC="'self', 'unsafe-inline', https://*.yourcompany.com, https://cdn.jsdelivr.net"

# Additional API endpoints (domain sources are automatically included)
VITE_CSP_ADDITIONAL_CONNECT_SRC="https://api.stripe.com, https://api.sendgrid.com, https://webhook.site"

# Enable CSP reporting
VITE_CSP_REPORT_ONLY="true"
VITE_CSP_REPORT_URI="https://your-csp-reporter.com/report"

# Allow specific frames (if needed)
VITE_CSP_FRAME_SRC="'self', https://www.youtube.com, https://player.vimeo.com"
```

### Development vs Production

```bash
# Development (.env.development)
VITE_APP_URL="http://localhost:3000"
VITE_CSP_SCRIPT_SRC="'self', 'unsafe-inline', 'unsafe-eval', https://localhost:3000"
VITE_CSP_REPORT_ONLY="true"

# Production (.env.production)
VITE_APP_URL="https://app.leadership360.com"
VITE_CSP_SCRIPT_SRC="'self', https://cdn.yourcompany.com, https://www.google-analytics.com"
VITE_CSP_REPORT_ONLY="false"
VITE_CSP_REPORT_URI="https://your-csp-reporter.com/report"
```

## Special Values

### CSP Keywords

- `'self'` - Same origin
- `'none'` - Block all sources
- `'unsafe-inline'` - Allow inline scripts/styles (use with caution)
- `'unsafe-eval'` - Allow eval() (use with caution, only in development)

### URL Schemes

- `data:` - Data URLs
- `blob:` - Blob URLs
- `https:` - All HTTPS URLs
- `wss:` - WebSocket Secure URLs

### Wildcards

- `https://*.example.com` - All subdomains of example.com
- `https://api.*.example.com` - All subdomains under api

## Integration with Supabase

The CSP automatically includes Supabase URLs when `VITE_SUPABASE_URL` is configured, **in addition to your domain sources**:

```bash
# Your domain
VITE_APP_URL="https://app.leadership360.com"

# Supabase URLs are automatically added to connect-src
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_CSP_CONNECT_SRC="'self', https://api.yourcompany.com"

# Results in: 'self', [domain sources], https://your-project.supabase.co, 
# wss://your-project.supabase.co, https://*.supabase.co, wss://*.supabase.co, 
# https://api.yourcompany.com
```

## Testing CSP Configuration

You can test your CSP configuration using the browser's developer tools:

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for CSP violation messages
4. Check Network tab for blocked requests

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Scripts not loading | Add source to `VITE_CSP_SCRIPT_SRC` |
| Styles not loading | Add source to `VITE_CSP_STYLE_SRC` |
| API calls failing | Add source to `VITE_CSP_CONNECT_SRC` |
| Images not loading | Add source to `VITE_CSP_IMG_SRC` |
| Fonts not loading | Add source to `VITE_CSP_FONT_SRC` |
| Domain resources blocked | Check that `VITE_APP_URL` is set correctly |

## Security Best Practices

1. **Start with report-only mode** in development
2. **Use specific URLs** instead of wildcards when possible
3. **Avoid 'unsafe-inline'** in production unless necessary
4. **Set up CSP violation reporting** to monitor issues
5. **Test thoroughly** before deploying to production
6. **Verify your domain** is correctly set in `VITE_APP_URL`

## Migration from Hardcoded CSP

If you're migrating from the old hardcoded CSP:

1. Set your `VITE_APP_URL` to your actual domain
2. Copy your current CSP sources to the appropriate environment variables
3. Test in report-only mode first
4. Gradually tighten the policy
5. Monitor for violations
6. Switch to enforcement mode when ready

## Example .env File

```bash
# Application URL (REQUIRED for domain-aware CSP)
VITE_APP_URL="https://app.growsight.com"

# CSP Configuration
VITE_CSP_SCRIPT_SRC="'self', 'unsafe-inline', https://cdn.yourcompany.com, https://www.google-analytics.com"
VITE_CSP_STYLE_SRC="'self', 'unsafe-inline', https://fonts.googleapis.com, https://fonts.gstatic.com"
VITE_CSP_IMG_SRC="'self', data:, blob:, https:, https://cdn.yourcompany.com"
VITE_CSP_CONNECT_SRC="'self', https://api.yourcompany.com"
VITE_CSP_FONT_SRC="'self', https://fonts.googleapis.com, https://fonts.gstatic.com, data:"
VITE_CSP_ADDITIONAL_CONNECT_SRC="https://api.stripe.com, https://webhook.site"
VITE_CSP_REPORT_ONLY="false"
VITE_CSP_REPORT_URI="https://your-csp-reporter.com/report"
VITE_CSP_UPGRADE_INSECURE_REQUESTS="true"
```

## Domain Sources Generated

For the domain `app.growsight.com`, the following sources are automatically included in relevant CSP directives:

- `https://app.growsight.com`
- `wss://app.growsight.com`
- `https://api.app.growsight.com`
- `wss://api.app.growsight.com`
- `https://cdn.app.growsight.com`
- `wss://cdn.app.growsight.com`
- `https://static.app.growsight.com`
- `wss://static.app.growsight.com`
- `https://assets.app.growsight.com`
- `wss://assets.app.growsight.com`
- `https://media.app.growsight.com`
- `wss://media.app.growsight.com`
- `https://img.app.growsight.com`
- `wss://img.growsight.com`
- `https://js.app.growsight.com`
- `wss://js.app.growsight.com`
- `https://css.app.growsight.com`
- `wss://css.app.growsight.com`
- `https://*.app.growsight.com`
- `wss://*.app.growsight.com` 