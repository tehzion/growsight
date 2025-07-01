# 360° Feedback Platform - Deployment Guide

This guide provides detailed instructions for deploying the 360° Feedback Platform to production environments.

## Prerequisites

### 1. Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Run the migration files in `/supabase/migrations/` in order
4. Enable Row Level Security (RLS) on all tables

### 2. Email Service Setup (Choose One)

#### Option A: SendGrid (Recommended)
1. Create account at [sendgrid.com](https://sendgrid.com)
2. Get API key from Settings > API Keys
3. Verify sender identity (domain or single sender)

#### Option B: Mailgun
1. Create account at [mailgun.com](https://mailgun.com)
2. Add and verify your domain
3. Get API key from Settings > API Keys

#### Option C: AWS SES
1. Set up AWS account and SES service
2. Verify domain and get credentials
3. Move out of sandbox mode for production

#### Option D: SMTP
1. Configure SMTP server details
2. Test connection using the built-in test functionality

### 3. Deployment Platform Setup

#### Option A: Netlify (Recommended)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`

#### Option B: Vercel
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`

## Environment Variables

### Required Variables
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email Service (SendGrid example)
VITE_EMAIL_PROVIDER=sendgrid
VITE_SENDGRID_API_KEY=your-sendgrid-api-key
VITE_EMAIL_FROM_NAME=360° Feedback Platform
VITE_EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Application
VITE_APP_NAME=360° Feedback Platform
VITE_APP_URL=https://your-production-domain.com
VITE_SUPPORT_EMAIL=support@yourdomain.com

# Features
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
VITE_ENABLE_PDF_EXPORTS=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ADVANCED_REPORTING=true
```

### Optional Variables
```bash
# Monitoring
VITE_SENTRY_DSN=your-sentry-dsn
VITE_GOOGLE_ANALYTICS_ID=your-ga-id

# Security
VITE_SESSION_TIMEOUT=3600000
VITE_MAX_FILE_SIZE=10485760
VITE_PASSWORD_MIN_LENGTH=8
VITE_MAX_LOGIN_ATTEMPTS=5
```

## Deployment Steps

### 1. Database Setup

Run migrations in Supabase SQL Editor in order:

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Run each migration file from the `/supabase/migrations/` directory in sequence
4. Verify that all tables have been created and RLS policies are enabled

### 2. Environment Configuration

1. Copy `.env.example` to `.env.production`
2. Update all variables with your actual values
3. Add environment variables to your deployment platform (Netlify/Vercel)

### 3. Build and Deploy

#### Local Testing
```bash
npm install
npm run build
npm run preview
```

#### Deploy via Git
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

#### Manual Deployment
1. Build the application:
   ```bash
   npm run build
   ```
2. Upload the `dist` directory to your hosting provider

### 4. Post-Deployment Testing

#### Authentication Testing
- [ ] Super Admin login works
- [ ] Organization Admin login works
- [ ] Password reset flow works
- [ ] User registration works
- [ ] OTP login works

#### Email Testing
- [ ] Assignment notifications send
- [ ] Deadline reminders work
- [ ] Welcome emails send
- [ ] Password reset emails send
- [ ] Test email functionality works

#### Core Features
- [ ] Assessment creation works
- [ ] Assessment assignment works
- [ ] Assessment completion works
- [ ] Results viewing works
- [ ] PDF exports work
- [ ] Analytics display correctly

#### Permissions Testing
- [ ] Super Admin can access all features
- [ ] Org Admin permissions work correctly
- [ ] Users can only access their data
- [ ] RLS policies prevent unauthorized access

## Multi-Environment Setup

### Staging Environment

1. Create a separate Supabase project for staging
2. Create `.env.staging` with staging-specific variables
3. Deploy using:
   ```bash
   npm run build:staging
   ```

### Development Environment

1. Use local Supabase instance or a development project
2. Use `.env.development` for local development
3. Run the development server:
   ```bash
   npm run dev
   ```

## Monitoring and Maintenance

### Health Checks
- Monitor Supabase dashboard for errors
- Check email delivery rates
- Monitor application performance
- Review error logs regularly

### Security Checklist
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database RLS policies active
- [ ] Email templates don't expose sensitive data
- [ ] File upload limits enforced

### Performance Optimization
- [ ] Enable CDN for static assets
- [ ] Configure proper caching headers
- [ ] Monitor bundle size
- [ ] Optimize images and assets

## Backup and Recovery

### Database Backups
1. Enable automatic backups in Supabase
2. Schedule regular backups
3. Test restoration process

### Environment Variables
1. Keep a secure copy of all environment variables
2. Document any changes to environment variables

### Deployment Rollback
1. Keep previous build artifacts
2. Document rollback procedures
3. Test rollback process

## Troubleshooting

### Common Issues

#### Email Not Sending
1. Check API key validity
2. Verify sender domain/email
3. Check email service quotas
4. Review email templates for errors

#### Database Connection Issues
1. Verify Supabase URL and key
2. Check RLS policies
3. Ensure migrations ran successfully
4. Review database logs

#### Build Failures
1. Check Node.js version (18+)
2. Clear node_modules and reinstall
3. Verify environment variables
4. Check for TypeScript errors

### Support
- Check application logs in deployment platform
- Review Supabase logs and metrics
- Monitor email service delivery reports
- Use browser dev tools for frontend issues

## Production Readiness Checklist

### Security
- [ ] All environment variables secured
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] Rate limiting implemented
- [ ] Input validation active

### Performance
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] Caching configured
- [ ] CDN enabled
- [ ] Database queries optimized

### Monitoring
- [ ] Error tracking setup (Sentry)
- [ ] Analytics configured
- [ ] Uptime monitoring active
- [ ] Performance monitoring enabled
- [ ] Email delivery monitoring

### Backup and Recovery
- [ ] Database backups automated
- [ ] Environment variables backed up
- [ ] Deployment rollback plan ready
- [ ] Data recovery procedures documented

## Scaling Considerations

### Database Scaling
- Monitor database performance
- Consider read replicas for high traffic
- Optimize queries with proper indexing
- Implement connection pooling

### Application Scaling
- Use auto-scaling for deployment platform
- Implement caching for frequently accessed data
- Consider serverless functions for background processing
- Optimize bundle size with code splitting

### Email Scaling
- Use queue-based email sending for high volume
- Implement rate limiting for email notifications
- Monitor email delivery rates and bounces
- Consider dedicated IP addresses for high-volume sending