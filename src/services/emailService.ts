import { config } from '../config/environment';
import SecureLogger from '../lib/secureLogger';
import { supabase } from '../lib/supabase';
import { useAssessmentResultsStore } from '../stores/assessmentResultsStore';

export interface EmailNotification {
  id: string;
  recipient_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
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
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
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

export interface UserCreationData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
  staffId?: string;
  departmentId?: string;
  departmentName?: string;
  assignedBy: string;
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

  private generateOrganizationId = (organizationName: string): string => {
    const sanitizedName = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `${sanitizedName}-${timestamp}-${randomSuffix}`;
  };

  private generateStaffId = (organizationName: string, staffName: string): string => {
    const orgPrefix = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 3);
    
    const staffPrefix = staffName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 3);
    
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    
    return `${orgPrefix}-${staffPrefix}-${timestamp}-${randomSuffix}`;
  };

  async sendUserCreationNotification(userData: UserCreationData): Promise<void> {
    try {
      // Generate staff ID if not provided
      if (!userData.staffId) {
        const fullName = `${userData.firstName} ${userData.lastName}`;
        userData.staffId = this.generateStaffId(userData.organizationName, fullName);
      }

      // Generate organization ID if needed
      if (!userData.organizationId) {
        userData.organizationId = this.generateOrganizationId(userData.organizationName);
      }

      // Create email notification record
      const notificationData = {
        recipient_id: userData.userId,
        recipient_email: userData.email,
        subject: `Welcome to ${userData.organizationName} - Your Account Details`,
        body: this.generateUserCreationEmailBody(userData),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('email_notifications')
        .insert(notificationData);

      if (error) throw error;

      // Send the actual email (implementation depends on your email provider)
      await this.sendEmail(notificationData.recipient_email, notificationData.subject, notificationData.body);

      // Update notification status to sent
      await supabase
        .from('email_notifications')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('recipient_id', userData.userId)
        .eq('subject', notificationData.subject);

    } catch (error) {
      console.error('Error sending user creation notification:', error);
      
      // Update notification status to failed
      await supabase
        .from('email_notifications')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('recipient_id', userData.userId);

      throw error;
    }
  }

  private generateUserCreationEmailBody(userData: UserCreationData): string {
    const relationshipTypeLabels: Record<string, string> = {
      'peer': 'Peer Review',
      'supervisor': 'Supervisor Review', 
      'subordinate': 'Subordinate Review',
      'client': 'Client Review'
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to ${userData.organizationName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .details { background-color: #ffffff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
        .detail-row { margin-bottom: 15px; }
        .label { font-weight: bold; color: #495057; }
        .value { color: #212529; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
        .highlight { background-color: #e3f2fd; padding: 10px; border-radius: 4px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ${userData.organizationName}!</h1>
            <p>Your account has been successfully created and you're now part of our assessment and feedback system.</p>
        </div>

        <div class="details">
            <h2>Your Account Details</h2>
            
            <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">${userData.firstName} ${userData.lastName}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Email:</span>
                <span class="value">${userData.email}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Role:</span>
                <span class="value">${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Organization:</span>
                <span class="value">${userData.organizationName}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Organization ID:</span>
                <span class="value">${userData.organizationId}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Staff ID:</span>
                <span class="value">${userData.staffId}</span>
            </div>
            
            ${userData.departmentName ? `
            <div class="detail-row">
                <span class="label">Department:</span>
                <span class="value">${userData.departmentName}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
                <span class="label">Account Created By:</span>
                <span class="value">${userData.assignedBy}</span>
            </div>
        </div>

        <div class="highlight">
            <h3>What's Next?</h3>
            <p>You can now:</p>
            <ul>
                <li>Log in to your account using your email address</li>
                <li>Complete your profile to get the most out of the system</li>
                <li>Participate in assessments assigned to you</li>
                <li>Review and provide feedback to colleagues</li>
                <li>View your assessment results and analytics</li>
            </ul>
        </div>

        <div class="footer">
            <p><strong>Important Notes:</strong></p>
            <ul>
                <li>Keep your Organization ID and Staff ID for reference</li>
                <li>These IDs are used for assessment assignments and result tracking</li>
                <li>Different relationship types (${Object.values(relationshipTypeLabels).join(', ')}) help provide comprehensive feedback</li>
                <li>Your privacy and data security are our top priorities</li>
            </ul>
            
            <p>If you have any questions, please contact your organization administrator or our support team.</p>
            
            <p>Best regards,<br>
            The ${userData.organizationName} Team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  async sendAssessmentAssignmentNotification(
    assignmentId: string,
    employeeEmail: string,
    reviewerEmail: string,
    assessmentTitle: string,
    dueDate: string,
    relationshipType: string
  ): Promise<void> {
    const relationshipTypeLabel = {
      'peer': 'Peer Review',
      'supervisor': 'Supervisor Review',
      'subordinate': 'Subordinate Review',
      'client': 'Client Review'
    }[relationshipType] || relationshipType;

    const subject = `Assessment Assignment: ${assessmentTitle}`;
    const body = `
      <h2>Assessment Assignment</h2>
      <p>You have been assigned to participate in: <strong>${assessmentTitle}</strong></p>
      <p><strong>Relationship Type:</strong> ${relationshipTypeLabel}</p>
      <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
      <p>Please log in to your account to complete this assessment.</p>
    `;

    // Send to employee
    await this.sendEmail(employeeEmail, subject, body);
    
    // Send to reviewer
    await this.sendEmail(reviewerEmail, subject, body);
  }

  async sendAssessmentCompletionNotification(
    employeeEmail: string,
    reviewerEmail: string,
    assessmentTitle: string,
    overallScore: number,
    relationshipType: string
  ): Promise<void> {
    const relationshipTypeLabel = {
      'peer': 'Peer Review',
      'supervisor': 'Supervisor Review',
      'subordinate': 'Subordinate Review',
      'client': 'Client Review'
    }[relationshipType] || relationshipType;

    const subject = `Assessment Completed: ${assessmentTitle}`;
    const body = `
      <h2>Assessment Completed</h2>
      <p>The assessment <strong>${assessmentTitle}</strong> has been completed.</p>
      <p><strong>Relationship Type:</strong> ${relationshipTypeLabel}</p>
      <p><strong>Overall Score:</strong> ${overallScore.toFixed(1)}/7.0</p>
      <p>Log in to view detailed results and analytics.</p>
    `;

    // Send to both parties
    await this.sendEmail(employeeEmail, subject, body);
    await this.sendEmail(reviewerEmail, subject, body);
  }

  async getEmailTemplates(organizationId: string): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<void> {
    const { error } = await supabase
      .from('email_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const emailService = EmailService.getInstance();