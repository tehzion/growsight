import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import SecureLogger from '../lib/secureLogger';
import { useBrandingStore } from '../stores/brandingStore';
import { useNotificationStore } from '../stores/notificationStore';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  organizationId: string;
  templateName?: string;
  variables?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'smtp' | 'demo';
}

export interface BrandedEmailOptions {
  organizationId: string;
  to: string;
  subject: string;
  content: string;
  templateVariables?: Record<string, any>;
  category?: 'notification' | 'reminder' | 'welcome' | 'assessment' | 'system';
}

export class SMTPEmailService {
  private static instance: SMTPEmailService;
  private transporter: nodemailer.Transporter | null = null;
  private currentConfig: SMTPConfig | null = null;
  private isConfigured = false;

  static getInstance(): SMTPEmailService {
    if (!SMTPEmailService.instance) {
      SMTPEmailService.instance = new SMTPEmailService();
    }
    return SMTPEmailService.instance;
  }

  /**
   * Configure SMTP settings
   */
  async configure(smtpConfig: SMTPConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Validate configuration
      if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.username || !smtpConfig.password) {
        return {
          success: false,
          message: 'All SMTP settings are required (host, port, username, password)'
        };
      }

      // Create transporter
      const transporter = nodemailer.createTransporter({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure, // true for 465, false for other ports
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        },
        // Additional security options
        tls: {
          // Don't fail on invalid certs
          rejectUnauthorized: false
        },
        // Connection timeout
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });

      // Test the connection
      await transporter.verify();

      // If successful, save configuration
      this.transporter = transporter;
      this.currentConfig = smtpConfig;
      this.isConfigured = true;

      SecureLogger.info('SMTP service configured successfully', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.username.replace(/./g, '*') // Mask username
      });

      return {
        success: true,
        message: 'SMTP configuration successful! Email service is ready.'
      };

    } catch (error) {
      SecureLogger.error('SMTP configuration failed', error);
      
      // Reset configuration on failure
      this.transporter = null;
      this.currentConfig = null;
      this.isConfigured = false;

      return {
        success: false,
        message: `SMTP configuration failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Test SMTP connection with current configuration
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return {
        success: false,
        message: 'SMTP service not configured. Please configure SMTP settings first.'
      };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: 'SMTP connection test successful!'
      };
    } catch (error) {
      SecureLogger.error('SMTP connection test failed', error);
      return {
        success: false,
        message: `SMTP connection test failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Send a branded email using organization branding
   */
  async sendBrandedEmail(options: BrandedEmailOptions): Promise<EmailSendResult> {
    try {
      // Get branding for organization
      const brandingStore = useBrandingStore.getState();
      await brandingStore.loadBranding(options.organizationId);
      
      const { webBranding, emailBranding } = brandingStore;

      // Use email branding if available, otherwise fall back to web branding
      const brandingData = emailBranding || {
        sender_name: webBranding?.company_name || config.app.name,
        sender_email: this.currentConfig?.fromEmail || 'noreply@example.com',
        email_header_color: webBranding?.primary_color || '#2563EB',
        template_style: 'modern',
        reply_to_email: this.currentConfig?.fromEmail || 'noreply@example.com'
      };

      // Generate branded HTML email
      const htmlContent = this.generateBrandedHTML({
        content: options.content,
        branding: {
          companyName: brandingData.sender_name,
          primaryColor: brandingData.email_header_color || webBranding?.primary_color || '#2563EB',
          secondaryColor: webBranding?.secondary_color || '#7E22CE',
          logoUrl: webBranding?.logo_url,
          footerText: `© ${new Date().getFullYear()} ${brandingData.sender_name}. All rights reserved.`
        },
        templateVariables: options.templateVariables || {}
      });

      // Generate plain text version
      const textContent = this.stripHTML(options.content);

      // Send email
      return await this.sendEmail({
        to: options.to,
        subject: options.subject,
        html: htmlContent,
        text: textContent,
        organizationId: options.organizationId,
        templateName: options.category
      });

    } catch (error) {
      SecureLogger.error('Failed to send branded email', error);
      return {
        success: false,
        error: (error as Error).message,
        provider: this.isConfigured ? 'smtp' : 'demo'
      };
    }
  }

  /**
   * Send email using configured SMTP
   */
  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    // If SMTP is not configured, use demo mode
    if (!this.isConfigured || !this.transporter || !this.currentConfig) {
      return this.sendDemoEmail(options);
    }

    try {
      const mailOptions = {
        from: `${this.currentConfig.fromName} <${this.currentConfig.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        // Additional headers for better deliverability
        headers: {
          'X-Mailer': config.app.name,
          'X-Organization-ID': options.organizationId,
          ...(options.templateName && { 'X-Template': options.templateName })
        }
      };

      const info = await this.transporter.sendMail(mailOptions);

      SecureLogger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
        organizationId: options.organizationId,
        templateName: options.templateName
      });

      // Add success notification
      const notificationStore = useNotificationStore.getState();
      notificationStore.addSuccessNotification(
        'Email Sent',
        `Email sent successfully to ${options.to}`,
        { category: 'system' }
      );

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp'
      };

    } catch (error) {
      SecureLogger.error('Failed to send email via SMTP', error);

      // Add error notification
      const notificationStore = useNotificationStore.getState();
      notificationStore.addErrorNotification(
        'Email Failed',
        `Failed to send email to ${options.to}: ${(error as Error).message}`,
        { category: 'system' }
      );

      return {
        success: false,
        error: (error as Error).message,
        provider: 'smtp'
      };
    }
  }

  /**
   * Send email in demo mode (for development/testing)
   */
  private sendDemoEmail(options: EmailOptions): EmailSendResult {
    console.log('📧 DEMO EMAIL SENT:');
    console.log('From:', this.currentConfig?.fromEmail || 'demo@example.com');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Organization ID:', options.organizationId);
    console.log('Template:', options.templateName || 'default');
    console.log('HTML Content:', options.html.substring(0, 200) + '...');
    console.log('Text Content:', options.text.substring(0, 200) + '...');
    console.log('Variables:', options.variables);
    console.log('---');

    // Add demo notification
    const notificationStore = useNotificationStore.getState();
    notificationStore.addInfoNotification(
      'Demo Email',
      `Demo email logged to console for ${options.to}`,
      { category: 'system' }
    );

    return {
      success: true,
      messageId: `demo-${Date.now()}`,
      provider: 'demo'
    };
  }

  /**
   * Generate branded HTML email template
   */
  private generateBrandedHTML(data: {
    content: string;
    branding: {
      companyName: string;
      primaryColor: string;
      secondaryColor: string;
      logoUrl?: string;
      footerText: string;
    };
    templateVariables: Record<string, any>;
  }): string {
    // Replace template variables in content
    let processedContent = data.content;
    Object.entries(data.templateVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, String(value));
    });

    // Replace common variables
    processedContent = processedContent
      .replace(/{{appName}}/g, config.app.name)
      .replace(/{{appUrl}}/g, config.app.url)
      .replace(/{{companyName}}/g, data.branding.companyName)
      .replace(/{{currentYear}}/g, new Date().getFullYear().toString())
      .replace(/{{currentDate}}/g, new Date().toLocaleDateString());

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.branding.companyName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: linear-gradient(135deg, ${data.branding.primaryColor}, ${data.branding.secondaryColor});
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .logo {
            max-width: 180px;
            height: auto;
            margin-bottom: 20px;
            border-radius: 8px;
        }
        .email-content {
            padding: 40px 30px;
            background-color: #ffffff;
        }
        .email-content h2 {
            color: ${data.branding.primaryColor};
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: 600;
        }
        .email-content h3 {
            color: ${data.branding.secondaryColor};
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 20px;
            font-weight: 600;
        }
        .email-content p {
            margin-bottom: 16px;
            font-size: 16px;
            line-height: 1.7;
        }
        .email-content ul, .email-content ol {
            margin-bottom: 20px;
            padding-left: 25px;
        }
        .email-content li {
            margin-bottom: 8px;
            font-size: 16px;
            line-height: 1.6;
        }
        .email-footer {
            background: linear-gradient(135deg, ${data.branding.secondaryColor}, ${this.darkenColor(data.branding.secondaryColor, 20)});
            color: white;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            line-height: 1.5;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(135deg, ${data.branding.primaryColor}, ${this.darkenColor(data.branding.primaryColor, 10)});
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }
        .button:hover {
            background: linear-gradient(135deg, ${this.darkenColor(data.branding.primaryColor, 10)}, ${this.darkenColor(data.branding.primaryColor, 20)});
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            transform: translateY(-2px);
        }
        .highlight {
            background: linear-gradient(135deg, ${this.lightenColor(data.branding.primaryColor, 95)}, ${this.lightenColor(data.branding.secondaryColor, 95)});
            padding: 20px;
            border-left: 4px solid ${data.branding.primaryColor};
            border-radius: 8px;
            margin: 25px 0;
        }
        .info-box {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-box h4 {
            color: ${data.branding.primaryColor};
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 18px;
        }
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, ${data.branding.primaryColor}, transparent);
            margin: 30px 0;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 8px;
            }
            .email-header, .email-content, .email-footer {
                padding: 25px 20px;
            }
            .email-header h1 {
                font-size: 24px;
            }
            .email-content h2 {
                font-size: 20px;
            }
            .button {
                display: block;
                text-align: center;
                margin: 20px 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            ${data.branding.logoUrl ? `<img src="${data.branding.logoUrl}" alt="${data.branding.companyName} Logo" class="logo">` : ''}
            <h1>${data.branding.companyName}</h1>
        </div>
        
        <div class="email-content">
            ${processedContent}
        </div>
        
        <div class="email-footer">
            <div class="divider"></div>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">${data.branding.footerText}</p>
            <p style="margin: 10px 0 0 0; opacity: 0.8;">
                This email was sent by ${config.app.name} on behalf of ${data.branding.companyName}
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Strip HTML tags from content to create plain text version
   */
  private stripHTML(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Darken a hex color by a percentage
   */
  private darkenColor(color: string, percent: number): string {
    try {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.max(0, (num >> 16) - amt);
      const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
      const B = Math.max(0, (num & 0x0000FF) - amt);
      return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    } catch {
      return color;
    }
  }

  /**
   * Lighten a hex color by a percentage
   */
  private lightenColor(color: string, percent: number): string {
    try {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.min(255, (num >> 16) + amt);
      const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
      const B = Math.min(255, (num & 0x0000FF) + amt);
      return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    } catch {
      return color;
    }
  }

  /**
   * Get current SMTP configuration (without sensitive data)
   */
  getConfiguration(): Omit<SMTPConfig, 'password'> | null {
    if (!this.currentConfig) return null;
    
    return {
      host: this.currentConfig.host,
      port: this.currentConfig.port,
      secure: this.currentConfig.secure,
      username: this.currentConfig.username,
      fromName: this.currentConfig.fromName,
      fromEmail: this.currentConfig.fromEmail
    };
  }

  /**
   * Check if SMTP is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send test email to verify configuration
   */
  async sendTestEmail(toEmail: string, organizationId: string): Promise<EmailSendResult> {
    const testContent = `
      <h2>SMTP Test Email</h2>
      <p>Congratulations! Your SMTP email service is working correctly.</p>
      <div class="highlight">
        <h3>Test Details:</h3>
        <ul>
          <li><strong>Sent at:</strong> {{currentDate}} {{currentTime}}</li>
          <li><strong>Organization ID:</strong> ${organizationId}</li>
          <li><strong>Service:</strong> ${config.app.name} SMTP Service</li>
          <li><strong>Provider:</strong> ${this.currentConfig?.host || 'Demo Mode'}</li>
        </ul>
      </div>
      <p>If you received this email, your SMTP configuration is working perfectly!</p>
    `;

    return await this.sendBrandedEmail({
      organizationId,
      to: toEmail,
      subject: `${config.app.name} SMTP Test - Configuration Successful`,
      content: testContent,
      templateVariables: {
        currentTime: new Date().toLocaleTimeString()
      },
      category: 'system'
    });
  }

  /**
   * Reset SMTP configuration
   */
  reset(): void {
    if (this.transporter) {
      this.transporter.close();
    }
    this.transporter = null;
    this.currentConfig = null;
    this.isConfigured = false;
    
    SecureLogger.info('SMTP service reset');
  }

  /**
   * Get common SMTP configurations for popular providers
   */
  static getCommonProviders(): Record<string, Partial<SMTPConfig>> {
    return {
      gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false
      },
      outlook: {
        host: 'smtp.office365.com',
        port: 587,
        secure: false
      },
      yahoo: {
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false
      },
      sendgrid: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false
      },
      mailgun: {
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false
      },
      amazon_ses: {
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false
      }
    };
  }
}

// Export singleton instance
export const smtpEmailService = SMTPEmailService.getInstance();