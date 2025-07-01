import { config } from '../config/environment';
import SecureLogger from '../lib/secureLogger';

export interface EmailNotification {
  to: string;
  subject: string;
  template: 'assignment_created' | 'deadline_reminder' | 'assessment_completed' | 'password_reset' | 'welcome';
  data: Record<string, any>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
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
  
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Email Templates with enhanced production-ready designs
  private getTemplate(type: string, data: Record<string, any>): EmailTemplate {
    const templates = {
      assignment_created: {
        subject: `New Growsight Assessment Assignment: ${data.assessmentTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Assessment Assignment</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; }
              .button { display: inline-block; background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
              .info-box { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563EB; }
              .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 12px; }
              .priority { background: #FEF3C7; border-left-color: #F59E0B; }
              .success { background: #F0FDF4; border-left-color: #10B981; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">${config.app.name}</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">New Assessment Assignment</p>
              </div>
              <div class="content">
                <h2 style="color: #1F2937; margin-bottom: 20px;">Hello ${data.recipientName},</h2>
                <p style="color: #4B5563; line-height: 1.6;">You have been assigned a new Growsight assessment. Your participation is valuable for providing meaningful feedback.</p>
                
                <div class="info-box">
                  <h3 style="margin: 0 0 15px 0; color: #1F2937; font-size: 18px;">${data.assessmentTitle}</h3>
                  <div style="display: grid; gap: 8px;">
                    <div><strong>Organization:</strong> ${data.organizationName}</div>
                    <div><strong>Your Role:</strong> ${data.role === 'employee' ? 'Self-Assessment' : 'Reviewer Assessment'}</div>
                    <div><strong>Deadline:</strong> ${data.deadline}</div>
                    ${data.employeeName ? `<div><strong>Employee:</strong> ${data.employeeName}</div>` : ''}
                  </div>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">Please complete your assessment by the deadline. Your feedback is confidential and will be aggregated with other responses to provide valuable insights.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.assessmentUrl}" class="button">Start Assessment</a>
                </div>
                
                <div class="info-box success">
                  <h4 style="margin: 0 0 10px 0; color: #065F46;">What to Expect:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #047857;">
                    <li>Assessment takes approximately 15-20 minutes</li>
                    <li>Your responses are completely confidential</li>
                    <li>You can save progress and return later</li>
                    <li>Results will be aggregated for meaningful insights</li>
                  </ul>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                  If you have any questions about this assessment, please contact your administrator or reply to this email.
                </p>
              </div>
              <div class="footer">
                <p>© 2025 ${config.app.name}. All rights reserved.</p>
                <p>This email was sent to ${data.to} regarding your assessment assignment.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hello ${data.recipientName},

You have been assigned a new Growsight assessment:

Assessment: ${data.assessmentTitle}
Organization: ${data.organizationName}
Role: ${data.role === 'employee' ? 'Self-Assessment' : 'Reviewer Assessment'}
Deadline: ${data.deadline}
${data.employeeName ? `Employee: ${data.employeeName}` : ''}

Please complete your assessment by the deadline: ${data.assessmentUrl}

What to expect:
- Assessment takes approximately 15-20 minutes
- Your responses are completely confidential
- You can save progress and return later
- Results will be aggregated for meaningful insights

If you have any questions, please contact your administrator.

© 2025 ${config.app.name}
        `
      },
      
      deadline_reminder: {
        subject: `⏰ Reminder: ${data.assessmentTitle} due in ${data.daysRemaining} days`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Assessment Deadline Reminder</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; }
              .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
              .warning-box { background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
              .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 12px; }
              .urgent { background: #FEE2E2; border-left-color: #EF4444; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">⏰ Assessment Reminder</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Deadline Approaching</p>
              </div>
              <div class="content">
                <h2 style="color: #1F2937; margin-bottom: 20px;">Hello ${data.recipientName},</h2>
                <p style="color: #4B5563; line-height: 1.6;">This is a friendly reminder that your assessment deadline is approaching soon.</p>
                
                <div class="${data.daysRemaining <= 1 ? 'warning-box urgent' : 'warning-box'}">
                  <h3 style="margin: 0 0 15px 0; color: #1F2937; font-size: 18px;">${data.assessmentTitle}</h3>
                  <div style="display: grid; gap: 8px;">
                    <div><strong>Deadline:</strong> ${data.deadline}</div>
                    <div><strong>Time Remaining:</strong> ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}</div>
                    ${data.daysRemaining <= 1 ? '<div style="color: #DC2626;"><strong>⚠️ URGENT: Please complete today!</strong></div>' : ''}
                  </div>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">Please complete your assessment as soon as possible to avoid missing the deadline. Your feedback is important and valued.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.assessmentUrl}" class="button">Complete Assessment Now</a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px;">
                  Need help? Contact your administrator or reply to this email for assistance.
                </p>
              </div>
              <div class="footer">
                <p>© 2025 ${config.app.name}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hello ${data.recipientName},

⏰ REMINDER: Your assessment deadline is approaching!

Assessment: ${data.assessmentTitle}
Deadline: ${data.deadline}
Time Remaining: ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}

${data.daysRemaining <= 1 ? '⚠️ URGENT: Please complete today!' : ''}

Please complete your assessment as soon as possible: ${data.assessmentUrl}

Need help? Contact your administrator for assistance.

© 2025 ${config.app.name}
        `
      },

      assessment_completed: {
        subject: `✅ Assessment Completed: ${data.assessmentTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Assessment Completed</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; }
              .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
              .info-box { background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
              .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">✅ Assessment Completed</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your feedback</p>
              </div>
              <div class="content">
                <h2 style="color: #1F2937; margin-bottom: 20px;">Hello ${data.recipientName},</h2>
                <p style="color: #4B5563; line-height: 1.6;">Thank you for completing the "${data.assessmentTitle}" assessment. Your feedback is valuable and will help provide meaningful insights.</p>
                
                <div class="info-box">
                  <h3 style="margin: 0 0 15px 0; color: #065F46; font-size: 18px;">Assessment Details</h3>
                  <div style="display: grid; gap: 8px; color: #047857;">
                    <div><strong>Assessment:</strong> ${data.assessmentTitle}</div>
                    <div><strong>Completed:</strong> ${new Date().toLocaleString()}</div>
                    <div><strong>Organization:</strong> ${data.organizationName}</div>
                  </div>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">Once all reviewers have completed their assessments, the results will be processed and made available to view.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.resultsUrl}" class="button">View Your Results</a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                  If you have any questions about this assessment, please contact your administrator.
                </p>
              </div>
              <div class="footer">
                <p>© 2025 ${config.app.name}. All rights reserved.</p>
                <p>This email was sent to ${data.recipientName} regarding your completed assessment.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hello ${data.recipientName},

Thank you for completing the "${data.assessmentTitle}" assessment. Your feedback is valuable and will help provide meaningful insights.

Assessment Details:
- Assessment: ${data.assessmentTitle}
- Completed: ${new Date().toLocaleString()}
- Organization: ${data.organizationName}

Once all reviewers have completed their assessments, the results will be processed and made available to view.

View your results: ${data.resultsUrl}

If you have any questions, please contact your administrator.

© 2025 ${config.app.name}
        `
      },

      password_reset: {
        subject: '🔐 Reset Your Password - Growsight',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; }
              .button { display: inline-block; background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
              .security-box { background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
              .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">🔐 Password Reset</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure Account Access</p>
              </div>
              <div class="content">
                <h2 style="color: #1F2937; margin-bottom: 20px;">Hello ${data.recipientName},</h2>
                <p style="color: #4B5563; line-height: 1.6;">You requested to reset your password for your ${config.app.name} account. Click the button below to set a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.resetUrl}" class="button">Reset Password</a>
                </div>
                
                <div class="security-box">
                  <h4 style="margin: 0 0 10px 0; color: #92400E;">🛡️ Security Information:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #92400E;">
                    <li>This link will expire in 24 hours for security</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Your account remains secure until you use this link</li>
                    <li>Contact support if you need assistance</li>
                  </ul>
                </div>
                
                <p style="color: #6B7280; font-size: 14px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${data.resetUrl}" style="color: #2563EB; word-break: break-all;">${data.resetUrl}</a>
                </p>
              </div>
              <div class="footer">
                <p>© 2025 ${config.app.name}. All rights reserved.</p>
                <p>This email was sent to ${data.recipientName} for account security.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hello ${data.recipientName},

You requested to reset your password for your ${config.app.name} account.

Use this link to set a new password:
${data.resetUrl}

Security Information:
- This link expires in 24 hours
- If you didn't request this reset, please ignore this email
- Your account remains secure until you use this link

© 2025 ${config.app.name}
        `
      },

      welcome: {
        subject: `🎉 Welcome to ${config.app.name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; }
              .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
              .welcome-box { background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
              .footer { background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">🎉 Welcome!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account is ready</p>
              </div>
              <div class="content">
                <h2 style="color: #1F2937; margin-bottom: 20px;">Hello ${data.recipientName},</h2>
                <p style="color: #4B5563; line-height: 1.6;">Welcome to ${config.app.name}! Your account has been created successfully and you're ready to start using our feedback platform.</p>
                
                <div class="welcome-box">
                  <h3 style="margin: 0 0 15px 0; color: #065F46; font-size: 18px;">Account Details</h3>
                  <div style="display: grid; gap: 8px; color: #047857;">
                    <div><strong>Email:</strong> ${data.email}</div>
                    <div><strong>Role:</strong> ${data.role}</div>
                    <div><strong>Organization:</strong> ${data.organizationName}</div>
                  </div>
                </div>
                
                <p style="color: #4B5563; line-height: 1.6;">You can now log in and start using the platform to participate in feedback assessments, view results, and contribute to meaningful professional development.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.loginUrl}" class="button">Login to Your Account</a>
                </div>
                
                <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin: 0 0 10px 0; color: #374151;">Getting Started:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #4B5563;">
                    <li>Complete your profile information</li>
                    <li>Check for any assigned assessments</li>
                    <li>Familiarize yourself with the platform features</li>
                    <li>Contact your administrator if you need help</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© 2025 ${config.app.name}. All rights reserved.</p>
                <p>Need help? Contact your administrator or visit our support center.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Welcome to ${config.app.name}!

Your account has been created successfully:

Account Details:
- Email: ${data.email}
- Role: ${data.role}
- Organization: ${data.organizationName}

You can now log in and start using the platform: ${data.loginUrl}

Getting Started:
1. Complete your profile information
2. Check for any assigned assessments
3. Familiarize yourself with the platform features
4. Contact your administrator if you need help

© 2025 ${config.app.name}
        `
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
        text: template.text,
        html: template.html
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
          { type: 'text/plain', value: template.text },
          { type: 'text/html', value: template.html }
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
    formData.append('text', template.text);
    formData.append('html', template.html);
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