import { emailService } from './emailService';
import { emailNotificationService } from './emailNotificationService';
import { config } from '../config/environment';
import SecureLogger from '../lib/secureLogger';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  category: 'notification' | 'reminder' | 'welcome' | 'assessment' | 'report';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BulkEmailData {
  templateId: string;
  recipients: Array<{
    email: string;
    name: string;
    variables?: Record<string, string>;
  }>;
  organizationId: string;
  sentBy: string;
  priority: 'low' | 'normal' | 'high';
  scheduledAt?: string;
}

export interface BulkEmailResult {
  emailId: string;
  success: boolean;
  recipientEmail: string;
  error?: string;
  sentAt?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  organizationId: string;
  createdBy: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
}

export class EnhancedEmailService {
  private static instance: EnhancedEmailService;
  
  static getInstance(): EnhancedEmailService {
    if (!EnhancedEmailService.instance) {
      EnhancedEmailService.instance = new EnhancedEmailService();
    }
    return EnhancedEmailService.instance;
  }

  /**
   * Send bulk emails with template support
   */
  async sendBulkEmails(data: BulkEmailData): Promise<BulkEmailResult[]> {
    const results: BulkEmailResult[] = [];
    const batchSize = 50; // Process in batches to avoid rate limits

    try {
      // Get template
      const template = await this.getEmailTemplate(data.templateId);
      if (!template) {
        throw new Error('Email template not found');
      }

      // Process recipients in batches
      for (let i = 0; i < data.recipients.length; i += batchSize) {
        const batch = data.recipients.slice(i, i + batchSize);
        const batchResults = await this.processEmailBatch(batch, template, data);
        results.push(...batchResults);

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < data.recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Log bulk email results
      const successfulSends = results.filter(r => r.success).length;
      const failedSends = results.filter(r => !r.success).length;
      
      SecureLogger.info(`Bulk email campaign completed - Template: ${template.name}, Total: ${data.recipients.length}, Success: ${successfulSends}, Failed: ${failedSends}`);

      return results;
    } catch (error) {
      SecureLogger.error('Bulk email campaign failed', error);
      throw new Error(`Bulk email failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process a batch of emails
   */
  private async processEmailBatch(
    recipients: BulkEmailData['recipients'],
    template: EmailTemplate,
    campaignData: BulkEmailData
  ): Promise<BulkEmailResult[]> {
    const results: BulkEmailResult[] = [];

    for (const recipient of recipients) {
      try {
        const emailId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Personalize template
        const personalizedSubject = this.personalizeTemplate(template.subject, recipient.variables || {});
        const personalizedHtmlBody = this.personalizeTemplate(template.htmlBody, recipient.variables || {});
        const personalizedTextBody = this.personalizeTemplate(template.textBody, recipient.variables || {});

        // Send email based on category
        switch (template.category) {
          case 'notification':
            await emailNotificationService.sendCustomNotification({
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              subject: personalizedSubject,
              htmlBody: personalizedHtmlBody,
              textBody: personalizedTextBody,
              organizationId: campaignData.organizationId
            });
            break;

          case 'reminder':
            await emailNotificationService.sendAssessmentReminder({
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              assessmentTitle: recipient.variables?.assessmentTitle || 'Assessment',
              dueDate: recipient.variables?.dueDate || '',
              loginUrl: recipient.variables?.loginUrl || config.app.url
            });
            break;

          case 'welcome':
            await emailNotificationService.sendWelcomeEmail({
              email: recipient.email,
              name: recipient.name,
              role: recipient.variables?.role || 'User',
              organizationName: recipient.variables?.organizationName || 'Organization'
            });
            break;

          case 'assessment':
            await emailNotificationService.sendAssessmentInvitation({
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              assessmentTitle: recipient.variables?.assessmentTitle || 'Assessment',
              assignedBy: recipient.variables?.assignedBy || 'Admin',
              dueDate: recipient.variables?.dueDate || '',
              loginUrl: recipient.variables?.loginUrl || config.app.url
            });
            break;

          default:
            // Use generic email service for other categories
            await emailService.sendEmail({
              to: recipient.email,
              subject: personalizedSubject,
              html: personalizedHtmlBody,
              text: personalizedTextBody
            });
        }

        results.push({
          emailId,
          success: true,
          recipientEmail: recipient.email,
          sentAt: new Date().toISOString()
        });

      } catch (error) {
        results.push({
          emailId: `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          success: false,
          recipientEmail: recipient.email,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Personalize template with variables
   */
  private personalizeTemplate(template: string, variables: Record<string, string>): string {
    let personalized = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      personalized = personalized.replace(new RegExp(placeholder, 'g'), value);
    });

    // Replace common placeholders
    personalized = personalized
      .replace(/\{\{appName\}\}/g, config.app.name)
      .replace(/\{\{appUrl\}\}/g, config.app.url)
      .replace(/\{\{currentDate\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{currentYear\}\}/g, new Date().getFullYear().toString());

    return personalized;
  }

  /**
   * Get email template by ID
   */
  async getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await import('../lib/supabase').then(({ supabase }) => 
        supabase
          .from('email_templates')
          .select('*')
          .eq('id', templateId)
          .eq('is_active', true)
          .single()
      );

      if (error) throw error;
      return data;
    } catch (error) {
      SecureLogger.error('Failed to get email template', error);
      return null;
    }
  }

  /**
   * Create email campaign
   */
  async createEmailCampaign(campaign: Omit<EmailCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailCampaign> {
    try {
      const { data, error } = await import('../lib/supabase').then(({ supabase }) =>
        supabase
          .from('email_campaigns')
          .insert({
            name: campaign.name,
            template_id: campaign.templateId,
            organization_id: campaign.organizationId,
            created_by: campaign.createdBy,
            status: campaign.status,
            total_recipients: campaign.totalRecipients,
            sent_count: campaign.sentCount,
            failed_count: campaign.failedCount,
            scheduled_at: campaign.scheduledAt,
            started_at: campaign.startedAt,
            completed_at: campaign.completedAt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
      );

      if (error) throw error;
      return data;
    } catch (error) {
      SecureLogger.error('Failed to create email campaign', error);
      throw new Error('Failed to create email campaign');
    }
  }

  /**
   * Update email campaign status
   */
  async updateCampaignStatus(campaignId: string, status: EmailCampaign['status'], data?: Partial<EmailCampaign>): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (data?.startedAt) updateData.started_at = data.startedAt;
      if (data?.completedAt) updateData.completed_at = data.completedAt;
      if (data?.sentCount !== undefined) updateData.sent_count = data.sentCount;
      if (data?.failedCount !== undefined) updateData.failed_count = data.failedCount;

      const { error } = await import('../lib/supabase').then(({ supabase }) =>
        supabase
          .from('email_campaigns')
          .update(updateData)
          .eq('id', campaignId)
      );

      if (error) throw error;
    } catch (error) {
      SecureLogger.error('Failed to update campaign status', error);
      throw new Error('Failed to update campaign status');
    }
  }

  /**
   * Get email analytics for organization
   */
  async getEmailAnalytics(
    organizationId: string,
    period: EmailAnalytics['period'] = 'month',
    startDate?: string,
    endDate?: string
  ): Promise<EmailAnalytics> {
    try {
      const start = startDate || this.getPeriodStartDate(period);
      const end = endDate || new Date().toISOString();

      const { data, error } = await import('../lib/supabase').then(({ supabase }) =>
        supabase
          .from('email_events')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', start)
          .lte('created_at', end)
      );

      if (error) throw error;

      const events = data || [];
      const totalSent = events.filter(e => e.event_type === 'sent').length;
      const totalDelivered = events.filter(e => e.event_type === 'delivered').length;
      const totalOpened = events.filter(e => e.event_type === 'opened').length;
      const totalClicked = events.filter(e => e.event_type === 'clicked').length;
      const totalBounced = events.filter(e => e.event_type === 'bounced').length;
      const totalUnsubscribed = events.filter(e => e.event_type === 'unsubscribed').length;

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalUnsubscribed,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
        bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        unsubscribeRate: totalDelivered > 0 ? (totalUnsubscribed / totalDelivered) * 100 : 0,
        period,
        startDate: start,
        endDate: end
      };
    } catch (error) {
      SecureLogger.error('Failed to get email analytics', error);
      throw new Error('Failed to get email analytics');
    }
  }

  /**
   * Get period start date
   */
  private getPeriodStartDate(period: EmailAnalytics['period']): string {
    const now = new Date();
    
    switch (period) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).toISOString();
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1).toISOString();
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString();
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  }

  /**
   * Track email event
   */
  async trackEmailEvent(event: {
    emailId: string;
    eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
    recipientEmail: string;
    organizationId: string;
    campaignId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await import('../lib/supabase').then(({ supabase }) =>
        supabase
          .from('email_events')
          .insert({
            email_id: event.emailId,
            event_type: event.eventType,
            recipient_email: event.recipientEmail,
            organization_id: event.organizationId,
            campaign_id: event.campaignId,
            metadata: event.metadata,
            created_at: new Date().toISOString()
          })
      );

      if (error) throw error;
    } catch (error) {
      SecureLogger.error('Failed to track email event', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Send scheduled emails
   */
  async processScheduledEmails(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const { data: campaigns, error } = await import('../lib/supabase').then(({ supabase }) =>
        supabase
          .from('email_campaigns')
          .select('*')
          .eq('status', 'scheduled')
          .lte('scheduled_at', now)
      );

      if (error) throw error;

      for (const campaign of campaigns || []) {
        try {
          // Update campaign status to sending
          await this.updateCampaignStatus(campaign.id, 'sending', {
            startedAt: now
          });

          // Process campaign (this would involve getting recipients and sending emails)
          // Implementation depends on how recipients are stored
          
          // Update campaign status to completed
          await this.updateCampaignStatus(campaign.id, 'completed', {
            completedAt: new Date().toISOString()
          });

        } catch (campaignError) {
          SecureLogger.error('Failed to process scheduled campaign', campaignError);
          await this.updateCampaignStatus(campaign.id, 'failed');
        }
      }
    } catch (error) {
      SecureLogger.error('Failed to process scheduled emails', error);
    }
  }

  /**
   * Get default email templates
   */
  getDefaultTemplates(): EmailTemplate[] {
    return [
      {
        id: 'welcome-template',
        name: 'Welcome Email',
        subject: 'Welcome to {{appName}} - Get Started Today',
        htmlBody: `
          <h2>Welcome to {{appName}}, {{name}}!</h2>
          <p>We're excited to have you on board. Your account has been created with the role of <strong>{{role}}</strong>.</p>
          <p>To get started, please log in to your account and complete your profile.</p>
          <a href="{{loginUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Login Now</a>
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
        `,
        textBody: `
          Welcome to {{appName}}, {{name}}!
          
          We're excited to have you on board. Your account has been created with the role of {{role}}.
          
          To get started, please visit: {{loginUrl}}
          
          If you have any questions, please don't hesitate to contact our support team.
        `,
        variables: ['name', 'role', 'loginUrl'],
        category: 'welcome',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'assessment-reminder',
        name: 'Assessment Reminder',
        subject: 'Reminder: Complete Your Assessment - Due {{dueDate}}',
        htmlBody: `
          <h2>Assessment Reminder</h2>
          <p>Hi {{name}},</p>
          <p>This is a friendly reminder that your <strong>{{assessmentTitle}}</strong> assessment is due on <strong>{{dueDate}}</strong>.</p>
          <p>Please complete your assessment as soon as possible to ensure timely feedback.</p>
          <a href="{{loginUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Complete Assessment</a>
          <p>If you have any technical issues, please contact support.</p>
        `,
        textBody: `
          Assessment Reminder
          
          Hi {{name}},
          
          This is a friendly reminder that your {{assessmentTitle}} assessment is due on {{dueDate}}.
          
          Please complete your assessment as soon as possible: {{loginUrl}}
          
          If you have any technical issues, please contact support.
        `,
        variables: ['name', 'assessmentTitle', 'dueDate', 'loginUrl'],
        category: 'reminder',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

// Export singleton instance
export const enhancedEmailService = EnhancedEmailService.getInstance(); 