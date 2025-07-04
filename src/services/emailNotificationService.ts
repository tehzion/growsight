import { emailService } from './emailService';
import { config } from '../config/environment';
import { supabase } from '../lib/supabase';
import SecureLogger from '../lib/secureLogger';

export interface EmailNotificationData {
  type: 'assignment_created' | 'assessment_completed' | 'deadline_reminder' | 'user_created';
  recipientEmail: string;
  recipientName: string;
  data: Record<string, any>;
  organizationId?: string;
}

export class EmailNotificationService {
  private static instance: EmailNotificationService;
  
  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService();
    }
    return EmailNotificationService.instance;
  }

  /**
   * Send assignment creation notification
   */
  async sendAssignmentNotification(assignmentData: {
    assignmentId: string;
    employeeEmail: string;
    reviewerEmail: string;
    employeeName: string;
    reviewerName: string;
    assessmentTitle: string;
    deadline: string;
    relationshipType: string;
    organizationName?: string;
  }): Promise<void> {
    if (!config.features.emailNotifications || config.email.provider === 'demo') {
      console.log('Email notifications disabled or in demo mode');
      return;
    }

    try {
      // Send notification to employee
      await emailService.sendAssessmentAssignmentNotification(
        assignmentData.assignmentId,
        assignmentData.employeeEmail,
        assignmentData.reviewerEmail,
        assignmentData.assessmentTitle,
        assignmentData.deadline,
        assignmentData.relationshipType
      );

      // Send notification to reviewer
      await emailService.sendAssessmentAssignmentNotification(
        assignmentData.assignmentId,
        assignmentData.reviewerEmail,
        assignmentData.employeeEmail,
        assignmentData.assessmentTitle,
        assignmentData.deadline,
        assignmentData.relationshipType
      );

      SecureLogger.info('Assignment notification emails sent successfully', {
        assignmentId: assignmentData.assignmentId,
        employeeEmail: assignmentData.employeeEmail,
        reviewerEmail: assignmentData.reviewerEmail
      });
    } catch (error) {
      SecureLogger.error('Failed to send assignment notification emails', error);
      throw error;
    }
  }

  /**
   * Send assessment completion notification
   */
  async sendAssessmentCompletionNotification(completionData: {
    assignmentId: string;
    employeeEmail: string;
    reviewerEmail: string;
    employeeName: string;
    reviewerName: string;
    assessmentTitle: string;
    overallScore: number;
    relationshipType: string;
    organizationName?: string;
  }): Promise<void> {
    if (!config.features.emailNotifications || config.email.provider === 'demo') {
      console.log('Email notifications disabled or in demo mode');
      return;
    }

    try {
      // Send completion notification to employee
      await emailService.sendAssessmentCompletionNotification(
        completionData.employeeEmail,
        completionData.reviewerEmail,
        completionData.assessmentTitle,
        completionData.overallScore,
        completionData.relationshipType
      );

      // Send completion notification to reviewer
      await emailService.sendAssessmentCompletionNotification(
        completionData.reviewerEmail,
        completionData.employeeEmail,
        completionData.assessmentTitle,
        completionData.overallScore,
        completionData.relationshipType
      );

      SecureLogger.info('Assessment completion notification emails sent successfully', {
        assignmentId: completionData.assignmentId,
        employeeEmail: completionData.employeeEmail,
        reviewerEmail: completionData.reviewerEmail
      });
    } catch (error) {
      SecureLogger.error('Failed to send assessment completion notification emails', error);
      throw error;
    }
  }

  /**
   * Send deadline reminder notification
   */
  async sendDeadlineReminder(reminderData: {
    assignmentId: string;
    email: string;
    name: string;
    assessmentTitle: string;
    deadline: string;
    daysRemaining: number;
    assessmentUrl: string;
  }): Promise<void> {
    if (!config.features.emailNotifications || config.email.provider === 'demo') {
      console.log('Email notifications disabled or in demo mode');
      return;
    }

    try {
      await emailService.sendDeadlineReminder(reminderData);

      SecureLogger.info('Deadline reminder email sent successfully', {
        assignmentId: reminderData.assignmentId,
        email: reminderData.email,
        daysRemaining: reminderData.daysRemaining
      });
    } catch (error) {
      SecureLogger.error('Failed to send deadline reminder email', error);
      throw error;
    }
  }

  /**
   * Send user creation notification
   */
  async sendUserCreationNotification(userData: {
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
  }): Promise<void> {
    if (!config.features.emailNotifications || config.email.provider === 'demo') {
      console.log('Email notifications disabled or in demo mode');
      return;
    }

    try {
      await emailService.sendUserCreationNotification(userData);

      SecureLogger.info('User creation notification email sent successfully', {
        userId: userData.userId,
        email: userData.email,
        role: userData.role
      });
    } catch (error) {
      SecureLogger.error('Failed to send user creation notification email', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(welcomeData: {
    email: string;
    name: string;
    role: string;
    organizationName: string;
  }): Promise<void> {
    if (!config.features.emailNotifications || config.email.provider === 'demo') {
      console.log('Email notifications disabled or in demo mode');
      return;
    }

    try {
      await emailService.sendWelcomeEmail(welcomeData);

      SecureLogger.info('Welcome email sent successfully', {
        email: welcomeData.email,
        role: welcomeData.role
      });
    } catch (error) {
      SecureLogger.error('Failed to send welcome email', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(resetData: {
    email: string;
    name: string;
    resetToken: string;
  }): Promise<void> {
    if (!config.features.emailNotifications || config.email.provider === 'demo') {
      console.log('Email notifications disabled or in demo mode');
      return;
    }

    try {
      await emailService.sendPasswordReset(resetData);

      SecureLogger.info('Password reset email sent successfully', {
        email: resetData.email
      });
    } catch (error) {
      SecureLogger.error('Failed to send password reset email', error);
      throw error;
    }
  }

  /**
   * Process pending email notifications
   */
  async processPendingNotifications(): Promise<void> {
    if (!config.features.emailNotifications || config.email.provider === 'demo') {
      return;
    }

    try {
      // Get pending notifications from database
      const { data: pendingNotifications, error } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('status', 'pending')
        .limit(50); // Process in batches

      if (error) throw error;

      if (!pendingNotifications || pendingNotifications.length === 0) {
        return;
      }

      // Process each notification
      for (const notification of pendingNotifications) {
        try {
          await this.processNotification(notification);
          
          // Mark as sent
          await supabase
            .from('email_notifications')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        } catch (error) {
          // Mark as failed
          await supabase
            .from('email_notifications')
            .update({ 
              status: 'failed', 
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        }
      }
    } catch (error) {
      SecureLogger.error('Failed to process pending notifications', error);
    }
  }

  /**
   * Process a single notification
   */
  private async processNotification(notification: any): Promise<void> {
    const { type, recipient_email, recipient_name, data } = notification;

    switch (type) {
      case 'assignment_created':
        await this.sendAssignmentNotification({
          assignmentId: data.assignmentId,
          employeeEmail: data.employeeEmail,
          reviewerEmail: data.reviewerEmail,
          employeeName: data.employeeName,
          reviewerName: data.reviewerName,
          assessmentTitle: data.assessmentTitle,
          deadline: data.deadline,
          relationshipType: data.relationshipType,
          organizationName: data.organizationName
        });
        break;

      case 'assessment_completed':
        await this.sendAssessmentCompletionNotification({
          assignmentId: data.assignmentId,
          employeeEmail: data.employeeEmail,
          reviewerEmail: data.reviewerEmail,
          employeeName: data.employeeName,
          reviewerName: data.reviewerName,
          assessmentTitle: data.assessmentTitle,
          overallScore: data.overallScore,
          relationshipType: data.relationshipType,
          organizationName: data.organizationName
        });
        break;

      case 'deadline_reminder':
        await this.sendDeadlineReminder({
          assignmentId: data.assignmentId,
          email: recipient_email,
          name: recipient_name,
          assessmentTitle: data.assessmentTitle,
          deadline: data.deadline,
          daysRemaining: data.daysRemaining,
          assessmentUrl: data.assessmentUrl
        });
        break;

      case 'user_created':
        await this.sendUserCreationNotification({
          userId: data.userId,
          email: recipient_email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          organizationId: data.organizationId,
          organizationName: data.organizationName,
          staffId: data.staffId,
          departmentId: data.departmentId,
          departmentName: data.departmentName,
          assignedBy: data.assignedBy
        });
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }

  /**
   * Queue a notification for processing
   */
  async queueNotification(notificationData: EmailNotificationData): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_notifications')
        .insert({
          recipient_id: notificationData.recipientEmail, // Using email as ID for now
          recipient_email: notificationData.recipientEmail,
          subject: this.getNotificationSubject(notificationData.type),
          body: this.getNotificationBody(notificationData.type, notificationData.data),
          status: 'pending',
          notification_type: notificationData.type,
          data: notificationData.data,
          organization_id: notificationData.organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      SecureLogger.info('Email notification queued successfully', {
        type: notificationData.type,
        recipientEmail: notificationData.recipientEmail
      });
    } catch (error) {
      SecureLogger.error('Failed to queue email notification', error);
      throw error;
    }
  }

  /**
   * Get notification subject based on type
   */
  private getNotificationSubject(type: string): string {
    switch (type) {
      case 'assignment_created':
        return 'New Assessment Assignment';
      case 'assessment_completed':
        return 'Assessment Completed';
      case 'deadline_reminder':
        return 'Assessment Deadline Reminder';
      case 'user_created':
        return 'Welcome to Your Organization';
      default:
        return 'Notification';
    }
  }

  /**
   * Get notification body based on type
   */
  private getNotificationBody(type: string, data: Record<string, any>): string {
    switch (type) {
      case 'assignment_created':
        return `You have been assigned a new assessment: ${data.assessmentTitle}. Please complete it by ${data.deadline}.`;
      case 'assessment_completed':
        return `The assessment ${data.assessmentTitle} has been completed with an overall score of ${data.overallScore}.`;
      case 'deadline_reminder':
        return `Reminder: Your assessment ${data.assessmentTitle} is due in ${data.daysRemaining} days.`;
      case 'user_created':
        return `Welcome ${data.firstName} ${data.lastName}! Your account has been created successfully.`;
      default:
        return 'You have a new notification.';
    }
  }
}

export const emailNotificationService = EmailNotificationService.getInstance(); 