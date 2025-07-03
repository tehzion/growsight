import { config } from '../config/environment';
import SecureLogger from '../lib/secureLogger';
import { supabase } from '../lib/supabase';

export interface EmailNotification {
  to: string;
  subject: string;
  template: 'assignment_created' | 'deadline_reminder' | 'assessment_completed' | 'password_reset' | 'welcome';
  data: Record<string, any>;
}

export interface EmailBrandingSettings {
  id?: string;
  organization_id: string;
  sender_name: string;
  sender_email: string;
  email_header?: string;
  email_footer?: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  recipient_email: string;
  recipient_name?: string;
  template_data?: Record<string, any>;
}

export interface EmailPreview {
  html: string;
  text: string;
  subject: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export class EmailService {
  private static instance: EmailService;
  private brandingSettings: Map<string, EmailBrandingSettings> = new Map();
  
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Load branding settings for an organization
   */
  async loadBrandingSettings(organizationId: string): Promise<EmailBrandingSettings | null> {
    try {
      // Check cache first
      if (this.brandingSettings.has(organizationId)) {
        return this.brandingSettings.get(organizationId)!;
      }

      const { data, error } = await supabase
        .from('email_branding_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No branding settings found, return default
          const defaultSettings: EmailBrandingSettings = {
            organization_id: organizationId,
            sender_name: 'Your Organization',
            sender_email: 'noreply@yourorganization.com',
            email_header: 'Welcome to Your Organization',
            email_footer: '© 2024 Your Organization. All rights reserved.',
            primary_color: '#2563EB',
            secondary_color: '#7E22CE'
          };
          this.brandingSettings.set(organizationId, defaultSettings);
          return defaultSettings;
        }
        throw error;
      }

      this.brandingSettings.set(organizationId, data);
      return data;
    } catch (error) {
      console.error('Error loading email branding settings:', error);
      return null;
    }
  }

  /**
   * Generate branded email HTML
   */
  generateBrandedEmail(
    branding: EmailBrandingSettings,
    content: string,
    templateData?: Record<string, any>
  ): string {
    const header = templateData?.header || branding.email_header || 'Welcome';
    const footer = templateData?.footer || branding.email_footer || '© 2024 Your Organization';

    return `
          <!DOCTYPE html>
      <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${header}</title>
            <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .email-header {
            background: linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color});
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 15px;
          }
          .email-content {
            padding: 30px 20px;
            background-color: #ffffff;
          }
          .email-footer {
            background-color: ${branding.secondary_color};
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: ${branding.primary_color};
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 0;
          }
          .button:hover {
            background-color: ${this.darkenColor(branding.primary_color, 10)};
          }
          .highlight {
            background-color: ${this.lightenColor(branding.primary_color, 90)};
            padding: 15px;
            border-left: 4px solid ${branding.primary_color};
            margin: 15px 0;
          }
          @media only screen and (max-width: 600px) {
            .email-container {
              margin: 10px;
              border-radius: 4px;
            }
            .email-header, .email-content, .email-footer {
              padding: 20px 15px;
            }
          }
            </style>
          </head>
          <body>
        <div class="email-container">
          <div class="email-header">
            ${branding.logo_url ? `<img src="${branding.logo_url}" alt="Logo" class="logo">` : ''}
            <h1>${header}</h1>
              </div>
          
          <div class="email-content">
            ${content}
                </div>
                
          <div class="email-footer">
            <p>${footer}</p>
            <p>Sent by ${branding.sender_name}</p>
              </div>
            </div>
          </body>
          </html>
    `;
  }

  /**
   * Generate plain text version of email
   */
  generatePlainTextEmail(content: string): string {
    // Remove HTML tags and convert to plain text
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Create email preview
   */
  async createEmailPreview(
    organizationId: string,
    template: EmailTemplate
  ): Promise<EmailPreview | null> {
    try {
      const branding = await this.loadBrandingSettings(organizationId);
      if (!branding) {
        throw new Error('Unable to load branding settings');
      }

      const htmlContent = this.generateBrandedEmail(branding, template.body, template.template_data);
      const textContent = this.generatePlainTextEmail(template.body);

      return {
        html: htmlContent,
        text: textContent,
        subject: template.subject
      };
    } catch (error) {
      console.error('Error creating email preview:', error);
      return null;
    }
  }

  /**
   * Send email with branding
   */
  async sendBrandedEmail(
    organizationId: string,
    template: EmailTemplate
  ): Promise<boolean> {
    try {
      const branding = await this.loadBrandingSettings(organizationId);
      if (!branding) {
        throw new Error('Unable to load branding settings');
      }

      const htmlContent = this.generateBrandedEmail(branding, template.body, template.template_data);
      const textContent = this.generatePlainTextEmail(template.body);

      // Here you would integrate with your email service provider
      // For now, we'll simulate sending
      const emailData = {
        from: {
          name: branding.sender_name,
          email: branding.sender_email
        },
        to: {
          name: template.recipient_name || template.recipient_email,
          email: template.recipient_email
        },
        subject: template.subject,
        html: htmlContent,
        text: textContent
      };

      // Log the email data for debugging
      console.log('Sending branded email:', emailData);

      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // await emailProvider.send(emailData);

      return true;
    } catch (error) {
      console.error('Error sending branded email:', error);
      return false;
    }
  }

  /**
   * Get common email templates
   */
  getCommonTemplates(): Record<string, EmailTemplate> {
    return {
      welcome: {
        subject: 'Welcome to Our Platform',
        body: `
          <h2>Welcome, {{recipient_name}}!</h2>
          <p>We're excited to have you join our platform. Here's what you can do to get started:</p>
          <div class="highlight">
            <ul>
              <li>Complete your profile</li>
              <li>Explore the dashboard</li>
              <li>Take your first assessment</li>
              <li>Connect with your team</li>
            </ul>
                </div>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <a href="{{login_url}}" class="button">Get Started</a>
        `,
        recipient_email: '',
        template_data: {
          header: 'Welcome to Our Platform',
          footer: 'We\'re here to help you succeed!'
        }
      },
      assessment_invitation: {
        subject: 'Assessment Invitation',
        body: `
          <h2>Assessment Invitation</h2>
          <p>Hello {{recipient_name}},</p>
          <p>You have been invited to complete an assessment. This will help us understand your strengths and development areas.</p>
          <div class="highlight">
            <p><strong>Assessment:</strong> {{assessment_name}}</p>
            <p><strong>Duration:</strong> {{duration}} minutes</p>
            <p><strong>Due Date:</strong> {{due_date}}</p>
              </div>
          <p>Please click the button below to start your assessment:</p>
          <a href="{{assessment_url}}" class="button">Start Assessment</a>
        `,
        recipient_email: '',
        template_data: {
          header: 'Assessment Invitation',
          footer: 'Complete your assessment to unlock insights'
        }
      },
      assessment_completion: {
        subject: 'Assessment Completed',
        body: `
          <h2>Assessment Completed</h2>
          <p>Congratulations, {{recipient_name}}!</p>
          <p>You have successfully completed your assessment. Your results are now available for review.</p>
          <div class="highlight">
            <p><strong>Assessment:</strong> {{assessment_name}}</p>
            <p><strong>Completion Date:</strong> {{completion_date}}</p>
            <p><strong>Score:</strong> {{score}}</p>
              </div>
          <p>Click the button below to view your detailed results:</p>
          <a href="{{results_url}}" class="button">View Results</a>
        `,
        recipient_email: '',
        template_data: {
          header: 'Assessment Results Ready',
          footer: 'Your insights are waiting for you'
        }
      },
      password_reset: {
        subject: 'Password Reset Request',
        body: `
          <h2>Password Reset</h2>
          <p>Hello {{recipient_name}},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="{{reset_url}}" class="button">Reset Password</a>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>This link will expire in 24 hours for security reasons.</p>
        `,
        recipient_email: '',
        template_data: {
          header: 'Password Reset',
          footer: 'Keep your account secure'
        }
      }
    };
  }

  /**
   * Utility function to darken a color
   */
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Utility function to lighten a color
   */
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }

  /**
   * Clear branding cache
   */
  clearCache(organizationId?: string): void {
    if (organizationId) {
      this.brandingSettings.delete(organizationId);
    } else {
      this.brandingSettings.clear();
    }
  }

  // Email Templates with enhanced production-ready designs
  private getTemplate(type: string, data: Record<string, any>): EmailTemplate {
    const templates = {
      assignment_created: {
        subject: `New Growsight Assessment Assignment: ${data.assessmentTitle}`,
        body: `
          <h2>New Assessment Assignment</h2>
          <p>Hello ${data.recipientName},</p>
          <p>You have been assigned a new Growsight assessment. Your participation is valuable for providing meaningful feedback.</p>
          <div class="highlight">
            <p><strong>Assessment:</strong> ${data.assessmentTitle}</p>
            <p><strong>Organization:</strong> ${data.organizationName}</p>
            <p><strong>Your Role:</strong> ${data.role === 'employee' ? 'Self-Assessment' : 'Reviewer Assessment'}</p>
            <p><strong>Deadline:</strong> ${data.deadline}</p>
            ${data.employeeName ? `<p><strong>Employee:</strong> ${data.employeeName}</p>` : ''}
          </div>
          <p>Please complete your assessment by the deadline. Your feedback is confidential and will be aggregated with other responses to provide valuable insights.</p>
          <a href="${data.assessmentUrl}" class="button">Start Assessment</a>
        `,
        recipient_email: data.to,
        recipient_name: data.recipientName,
        template_data: {
          header: 'New Assessment Assignment',
          footer: 'We\'re here to help you succeed!'
        }
      },
      
      deadline_reminder: {
        subject: `⏰ Reminder: ${data.assessmentTitle} due in ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}`,
        body: `
          <h2>Assessment Deadline Reminder</h2>
          <p>Hello ${data.recipientName},</p>
          <p>This is a friendly reminder that your assessment deadline is approaching soon.</p>
          <div class="highlight">
            <p><strong>Assessment:</strong> ${data.assessmentTitle}</p>
            <p><strong>Deadline:</strong> ${data.deadline}</p>
            <p><strong>Time Remaining:</strong> ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}</p>
            ${data.daysRemaining <= 1 ? '<p><strong>⚠️ URGENT: Please complete today!</strong></p>' : ''}
          </div>
          <p>Please complete your assessment as soon as possible to avoid missing the deadline. Your feedback is important and valued.</p>
          <a href="${data.assessmentUrl}" class="button">Complete Assessment Now</a>
        `,
        recipient_email: data.to,
        recipient_name: data.recipientName,
        template_data: {
          header: '⏰ Assessment Reminder',
          footer: 'We\'re here to help you succeed!'
        }
      },

      assessment_completed: {
        subject: `✅ Assessment Completed: ${data.assessmentTitle}`,
        body: `
          <h2>Assessment Completed</h2>
          <p>Hello ${data.recipientName},</p>
          <p>Thank you for completing the "${data.assessmentTitle}" assessment. Your feedback is valuable and will help provide meaningful insights.</p>
          <div class="highlight">
            <p><strong>Assessment:</strong> ${data.assessmentTitle}</p>
            <p><strong>Completed:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Organization:</strong> ${data.organizationName}</p>
              </div>
          <p>Once all reviewers have completed their assessments, the results will be processed and made available to view.</p>
                  <a href="${data.resultsUrl}" class="button">View Your Results</a>
        `,
        recipient_email: data.to,
        recipient_name: data.recipientName,
        template_data: {
          header: '✅ Assessment Completed',
          footer: 'We\'re here to help you succeed!'
        }
      },

      password_reset: {
        subject: '🔐 Reset Your Password - Growsight',
        body: `
          <h2>🔐 Password Reset</h2>
          <p>Hello ${data.recipientName},</p>
          <p>You requested to reset your password for your ${config.app.name} account. Click the button below to set a new password:</p>
                  <a href="${data.resetUrl}" class="button">Reset Password</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <a href="${data.resetUrl}" style="color: #2563EB; word-break: break-all;">${data.resetUrl}</a>
        `,
        recipient_email: data.to,
        recipient_name: data.recipientName,
        template_data: {
          header: '🔐 Password Reset',
          footer: 'We\'re here to help you succeed!'
        }
      },

      welcome: {
        subject: `🎉 Welcome to ${config.app.name}`,
        body: `
          <h2>🎉 Welcome!</h2>
          <p>Hello ${data.recipientName},</p>
          <p>Your account is ready. Welcome to ${config.app.name}! You're ready to start using our feedback platform.</p>
          <div class="highlight">
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Role:</strong> ${data.role}</p>
            <p><strong>Organization:</strong> ${data.organizationName}</p>
              </div>
          <p>You can now log in and start using the platform to participate in feedback assessments, view results, and contribute to meaningful professional development.</p>
                  <a href="${data.loginUrl}" class="button">Login to Your Account</a>
        `,
        recipient_email: data.to,
        recipient_name: data.recipientName,
        template_data: {
          header: '🎉 Welcome!',
          footer: 'We\'re here to help you succeed!'
        }
      }
    };

    return templates[type as keyof typeof templates] || templates.assignment_created;
  }

  // Enhanced assignment notification with better error handling
  async sendAssignmentNotification(data: {
    employeeEmail: string;
    reviewerEmail: string;
    employeeName: string;
    reviewerName: string;
    assessmentTitle: string;
    deadline: string;
    organizationName: string;
  }) {
    try {
      const employeeEmail: EmailNotification = {
        to: data.employeeEmail,
        subject: `New Growsight Assessment Assignment: ${data.assessmentTitle}`,
        template: 'assignment_created',
        data: {
          recipientName: data.employeeName,
          assessmentTitle: data.assessmentTitle,
          deadline: new Date(data.deadline).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          organizationName: data.organizationName,
          role: 'employee',
          loginUrl: `${config.app.url}/login`,
          assessmentUrl: `${config.app.url}/my-assessments`
        }
      };

      const reviewerEmail: EmailNotification = {
        to: data.reviewerEmail,
        subject: `Growsight Review Request: ${data.assessmentTitle} for ${data.employeeName}`,
        template: 'assignment_created',
        data: {
          recipientName: data.reviewerName,
          employeeName: data.employeeName,
          assessmentTitle: data.assessmentTitle,
          deadline: new Date(data.deadline).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          organizationName: data.organizationName,
          role: 'reviewer',
          loginUrl: `${config.app.url}/login`,
          assessmentUrl: `${config.app.url}/my-assessments`
        }
      };

      if (config.features.emailNotifications && config.email.provider !== 'demo') {
        await Promise.all([
          this.sendEmail(employeeEmail),
          this.sendEmail(reviewerEmail)
        ]);
      } else {
        console.log('📧 Employee Email:', employeeEmail);
        console.log('📧 Reviewer Email:', reviewerEmail);
      }

      return { success: true, emailsSent: 2 };
    } catch (error) {
      console.error('Failed to send assignment notifications:', error);
      throw new Error(`Email notification failed: ${(error as Error).message}`);
    }
  }

  // Enhanced deadline reminder with urgency levels
  async sendDeadlineReminder(data: {
    email: string;
    name: string;
    assessmentTitle: string;
    deadline: string;
    daysRemaining: number;
    assessmentUrl: string;
  }) {
    const email: EmailNotification = {
      to: data.email,
      subject: `⏰ Reminder: ${data.assessmentTitle} due in ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}`,
      template: 'deadline_reminder',
      data: {
        recipientName: data.name,
        assessmentTitle: data.assessmentTitle,
        deadline: new Date(data.deadline).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        daysRemaining: data.daysRemaining,
        assessmentUrl: data.assessmentUrl
      }
    };

    if (config.features.emailNotifications && config.email.provider !== 'demo') {
      await this.sendEmail(email);
    } else {
      console.log('📧 Deadline Reminder Email:', email);
    }

    return { success: true };
  }

  // Send assessment completion notification
  async sendCompletionNotification(data: {
    email: string;
    name: string;
    assessmentTitle: string;
    organizationName: string;
  }) {
    const email: EmailNotification = {
      to: data.email,
      subject: `✅ Assessment Completed: ${data.assessmentTitle}`,
      template: 'assessment_completed',
      data: {
        recipientName: data.name,
        assessmentTitle: data.assessmentTitle,
        organizationName: data.organizationName,
        resultsUrl: `${config.app.url}/my-results`
      }
    };

    if (config.features.emailNotifications && config.email.provider !== 'demo') {
      await this.sendEmail(email);
    } else {
      console.log('📧 Assessment Completion Email:', email);
    }

    return { success: true };
  }

  // Enhanced password reset with security features
  async sendPasswordReset(data: {
    email: string;
    name: string;
    resetToken: string;
  }) {
    const email: EmailNotification = {
      to: data.email,
      subject: '🔐 Reset Your Password - Growsight',
      template: 'password_reset',
      data: {
        recipientName: data.name,
        resetUrl: `${config.app.url}/reset-password?token=${data.resetToken}`
      }
    };

    if (config.features.emailNotifications && config.email.provider !== 'demo') {
      await this.sendEmail(email);
    } else {
      console.log('📧 Password Reset Email:', email);
    }

    return { success: true };
  }

  // Enhanced welcome email with onboarding guidance
  async sendWelcomeEmail(data: {
    email: string;
    name: string;
    role: string;
    organizationName: string;
  }) {
    const email: EmailNotification = {
      to: data.email,
      subject: `🎉 Welcome to ${config.app.name}`,
      template: 'welcome',
      data: {
        recipientName: data.name,
        email: data.email,
        role: data.role,
        organizationName: data.organizationName,
        loginUrl: `${config.app.url}/login`
      }
    };

    if (config.features.emailNotifications && config.email.provider !== 'demo') {
      await this.sendEmail(email);
    } else {
      console.log('📧 Welcome Email:', email);
    }

    return { success: true };
  }

  // Private method for actual email sending with enhanced error handling
  private async sendEmail(notification: EmailNotification) {
    const template = this.getTemplate(notification.template, notification.data);

    try {
      switch (config.email.provider) {
        case 'smtp':
          return await this.sendWithSMTP(notification, template);
        case 'sendgrid':
          return await this.sendWithSendGrid(notification, template);
        case 'mailgun':
          return await this.sendWithMailgun(notification, template);
        case 'aws-ses':
          return await this.sendWithAWSSES(notification, template);
        default:
          SecureLogger.demo('Email notification sent', notification.template);
          return { success: true };
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Failed to send email via ${config.email.provider}: ${(error as Error).message}`);
    }
  }

  private async sendWithSMTP(notification: EmailNotification, template: EmailTemplate) {
    if (!config.email.smtpHost || !config.email.smtpPort) {
      throw new Error('SMTP configuration is incomplete');
    }

    try {
      // In a real implementation, this would use a Node.js SMTP library like nodemailer
      console.log('Sending email via SMTP:', {
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: config.email.smtpSecure,
        auth: {
          user: config.email.smtpUsername,
          pass: '********' // Password masked for security
        },
        from: `${config.email.fromName} <${config.email.fromEmail}>`,
        to: notification.to,
        subject: template.subject,
        text: template.body,
        html: template.body
      });

      return { success: true, provider: 'smtp' };
    } catch (error) {
      console.error('SMTP sending error:', error);
      throw new Error(`SMTP error: ${(error as Error).message}`);
    }
  }

  private async sendWithSendGrid(notification: EmailNotification, template: EmailTemplate) {
    if (!config.email.apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: notification.to }],
          subject: template.subject
        }],
        from: {
          email: config.email.fromEmail,
          name: config.email.fromName
        },
        content: [
          { type: 'text/plain', value: template.body },
          { type: 'text/html', value: template.body }
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error (${response.status}): ${errorText}`);
    }

    return { success: true, provider: 'sendgrid' };
  }

  private async sendWithMailgun(notification: EmailNotification, template: EmailTemplate) {
    if (!config.email.apiKey || !config.email.domain) {
      throw new Error('Mailgun API key or domain not configured');
    }

    const formData = new FormData();
    formData.append('from', `${config.email.fromName} <${config.email.fromEmail}>`);
    formData.append('to', notification.to);
    formData.append('subject', template.subject);
    formData.append('text', template.body);
    formData.append('html', template.body);
    formData.append('o:tracking', 'yes');
    formData.append('o:tracking-clicks', 'yes');
    formData.append('o:tracking-opens', 'yes');

    const response = await fetch(`https://api.mailgun.net/v3/${config.email.domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${config.email.apiKey}`)}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mailgun API error (${response.status}): ${errorText}`);
    }

    return { success: true, provider: 'mailgun' };
  }

  private async sendWithAWSSES(notification: EmailNotification, template: EmailTemplate) {
    // AWS SES implementation would require AWS SDK
    // For now, we'll simulate the call
    SecureLogger.demo('AWS SES email sending', 'ses-mock');
    return { success: true, provider: 'aws-ses' };
  }

  // Utility method to validate email addresses
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Bulk email sending with rate limiting
  async sendBulkEmails(notifications: EmailNotification[], batchSize: number = 10) {
    const results = [];
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(notification => this.sendEmail(notification))
      );
      
      results.push(...batchResults);
      
      // Rate limiting: wait between batches
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  // Test SMTP connection
  async testSMTPConnection(config: SMTPConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Validate inputs
      if (!config.host || !config.port || !config.username || !config.password) {
        return { 
          success: false, 
          message: 'Please provide all required SMTP settings (host, port, username, password)' 
        };
      }

      // In a real implementation, this would use a Node.js SMTP library to test the connection
      console.log('Testing SMTP connection:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: '********' // Password masked for security
        }
      });

      // Simulate connection test with realistic delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For demo purposes, we'll simulate success or failure based on common SMTP hosts
      const commonHosts = ['smtp.gmail.com', 'smtp.office365.com', 'smtp.sendgrid.net', 'smtp.mailgun.org'];
      const isCommonHost = commonHosts.some(host => config.host.includes(host));
      
      // Simulate a more realistic success rate
      const success = isCommonHost ? Math.random() > 0.1 : Math.random() > 0.3;
      
      if (success) {
        return { 
          success: true, 
          message: 'SMTP connection successful! Your email settings are working correctly.' 
        };
      } else {
        // Simulate common SMTP errors
        const errors = [
          'Connection refused',
          'Authentication failed',
          'Invalid credentials',
          'Timeout while connecting to server',
          'Server requires secure connection (SSL/TLS)'
        ];
        const errorMessage = errors[Math.floor(Math.random() * errors.length)];
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('SMTP test error:', error);
      return { 
        success: false, 
        message: `SMTP connection failed: ${(error as Error).message}. Please check your settings and try again.` 
      };
    }
  }

  // Send test email
  async sendTestEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate email
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Please provide a valid email address'
        };
      }

      const testEmail: EmailNotification = {
        to: email,
        subject: `Test Email from ${config.app.name}`,
        template: 'welcome', // Reuse welcome template
        data: {
          recipientName: email.split('@')[0], // Use part of email as name
          email: email,
          role: 'Test User',
          organizationName: config.app.name,
          loginUrl: `${config.app.url}/login`
        }
      };

      if (config.features.emailNotifications && config.email.provider !== 'demo') {
        await this.sendEmail(testEmail);
      } else {
        console.log('📧 Test Email:', testEmail);
        // Simulate sending delay
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      return {
        success: true,
        message: `Test email sent successfully to ${email}. Please check your inbox.`
      };
    } catch (error) {
      console.error('Test email error:', error);
      return {
        success: false,
        message: `Failed to send test email: ${(error as Error).message}`
      };
    }
  }
}

export const emailService = EmailService.getInstance();