import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

export interface SubscriberNotification {
  id: string;
  userId: string;
  type: 'assignment_created' | 'deadline_reminder' | 'assessment_completed' | 'results_available' | 'system_update';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface EmailNotificationData {
  assessmentTitle: string;
  dueDate: string;
  assignedBy: string;
  organizationName: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  priority: 'low' | 'medium' | 'high';
  daysUntilDue: number;
}

class SubscriberNotificationService {
  private user = useAuthStore.getState().user;

  // Create notification for assessment assignment
  async createAssignmentNotification(assignmentData: {
    assessmentId: string;
    assessmentTitle: string;
    userId: string;
    assignedBy: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
  }): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const notification: Omit<SubscriberNotification, 'id'> = {
      userId: assignmentData.userId,
      type: 'assignment_created',
      title: 'New Assessment Assigned',
      message: `You have been assigned "${assignmentData.assessmentTitle}" by ${assignmentData.assignedBy}`,
      priority: assignmentData.priority,
      read: false,
      actionUrl: `/subscriber-assessments/${assignmentData.assessmentId}`,
      createdAt: new Date().toISOString(),
      expiresAt: assignmentData.dueDate
    };

    try {
      const { error } = await supabase
        .from('notifications')
        .insert([notification]);

      if (error) throw error;

      // Also send email notification
      await this.sendEmailNotification('assignment_created', {
        assessmentTitle: assignmentData.assessmentTitle,
        dueDate: assignmentData.dueDate,
        assignedBy: assignmentData.assignedBy,
        organizationName: user.organizationId,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userEmail: user.email,
        priority: assignmentData.priority,
        daysUntilDue: Math.ceil((new Date(assignmentData.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      });
    } catch (error) {
      console.error('Error creating assignment notification:', error);
    }
  }

  // Create deadline reminder notifications
  async createDeadlineReminder(assessmentData: {
    assessmentId: string;
    assessmentTitle: string;
    userId: string;
    dueDate: string;
    daysUntilDue: number;
  }): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const urgencyLevel = assessmentData.daysUntilDue <= 1 ? 'urgent' : 
                        assessmentData.daysUntilDue <= 3 ? 'high' : 'medium';

    const notification: Omit<SubscriberNotification, 'id'> = {
      userId: assessmentData.userId,
      type: 'deadline_reminder',
      title: 'Assessment Due Soon',
      message: `"${assessmentData.assessmentTitle}" is due in ${assessmentData.daysUntilDue} day${assessmentData.daysUntilDue !== 1 ? 's' : ''}`,
      priority: urgencyLevel,
      read: false,
      actionUrl: `/subscriber-assessments/${assessmentData.assessmentId}`,
      createdAt: new Date().toISOString(),
      expiresAt: assessmentData.dueDate
    };

    try {
      const { error } = await supabase
        .from('notifications')
        .insert([notification]);

      if (error) throw error;

      // Send email reminder for urgent deadlines
      if (urgencyLevel === 'urgent') {
        await this.sendEmailNotification('deadline_reminder', {
          assessmentTitle: assessmentData.assessmentTitle,
          dueDate: assessmentData.dueDate,
          assignedBy: 'Your Organization',
          organizationName: user.organizationId,
          userFirstName: user.firstName,
          userLastName: user.lastName,
          userEmail: user.email,
          priority: 'high',
          daysUntilDue: assessmentData.daysUntilDue
        });
      }
    } catch (error) {
      console.error('Error creating deadline reminder:', error);
    }
  }

  // Create results available notification
  async createResultsAvailableNotification(assessmentData: {
    assessmentId: string;
    assessmentTitle: string;
    userId: string;
    completedAt: string;
  }): Promise<void> {
    const notification: Omit<SubscriberNotification, 'id'> = {
      userId: assessmentData.userId,
      type: 'results_available',
      title: 'Assessment Results Ready',
      message: `Results for "${assessmentData.assessmentTitle}" are now available`,
      priority: 'medium',
      read: false,
      actionUrl: `/my-results?assessment=${assessmentData.assessmentId}`,
      createdAt: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('notifications')
        .insert([notification]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating results notification:', error);
    }
  }

  // Send email notifications
  private async sendEmailNotification(type: string, data: EmailNotificationData): Promise<void> {
    try {
      const emailContent = this.generateEmailContent(type, data);
      
      // In a real application, this would integrate with an email service
      // For demo purposes, we'll just log the email content
      console.log('Email notification would be sent:', {
        to: data.userEmail,
        subject: emailContent.subject,
        body: emailContent.body,
        priority: data.priority
      });

      // You would integrate with services like:
      // - SendGrid
      // - Mailgun
      // - AWS SES
      // - Nodemailer
      
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Generate email content templates
  private generateEmailContent(type: string, data: EmailNotificationData): { subject: string; body: string } {
    switch (type) {
      case 'assignment_created':
        return {
          subject: `New Assessment: ${data.assessmentTitle}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">New Assessment Assigned</h2>
              <p>Dear ${data.userFirstName} ${data.userLastName},</p>
              <p>You have been assigned a new assessment:</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #1f2937;">${data.assessmentTitle}</h3>
                <p style="margin: 5px 0;"><strong>Assigned by:</strong> ${data.assignedBy}</p>
                <p style="margin: 5px 0;"><strong>Due date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Priority:</strong> ${data.priority.charAt(0).toUpperCase() + data.priority.slice(1)}</p>
              </div>
              <p>Please log in to your account to complete this assessment.</p>
              <a href="${process.env.VITE_APP_URL}/subscriber-assessments" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
                View Assessment
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This email was sent by ${data.organizationName}. If you have any questions, please contact your organization administrator.
              </p>
            </div>
          `
        };

      case 'deadline_reminder':
        return {
          subject: `Reminder: ${data.assessmentTitle} Due ${data.daysUntilDue <= 1 ? 'Soon' : `in ${data.daysUntilDue} days`}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Assessment Due Soon</h2>
              <p>Dear ${data.userFirstName} ${data.userLastName},</p>
              <p>This is a reminder that your assessment is due soon:</p>
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <h3 style="margin: 0 0 10px 0; color: #1f2937;">${data.assessmentTitle}</h3>
                <p style="margin: 5px 0;"><strong>Due date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Time remaining:</strong> ${data.daysUntilDue} day${data.daysUntilDue !== 1 ? 's' : ''}</p>
              </div>
              <p style="color: #dc2626; font-weight: 600;">Please complete this assessment as soon as possible to avoid missing the deadline.</p>
              <a href="${process.env.VITE_APP_URL}/subscriber-assessments" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
                Complete Assessment
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This email was sent by ${data.organizationName}. If you have any questions, please contact your organization administrator.
              </p>
            </div>
          `
        };

      default:
        return {
          subject: 'GrowSight Notification',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Notification</h2>
              <p>Dear ${data.userFirstName} ${data.userLastName},</p>
              <p>You have a new notification from GrowSight.</p>
              <p>Please log in to your account to view the details.</p>
            </div>
          `
        };
    }
  }

  // Batch process deadline reminders (would be called by a cron job)
  async processDeadlineReminders(): Promise<void> {
    try {
      const { data: assignments, error } = await supabase
        .from('assessment_assignments')
        .select(`
          *,
          assessments(id, title),
          users(id, firstName, lastName, email)
        `)
        .eq('status', 'pending')
        .not('dueDate', 'is', null);

      if (error) throw error;

      for (const assignment of assignments || []) {
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send reminders at 7 days, 3 days, 1 day, and on due date
        if ([7, 3, 1, 0].includes(daysUntilDue)) {
          await this.createDeadlineReminder({
            assessmentId: assignment.assessmentId,
            assessmentTitle: assignment.assessments.title,
            userId: assignment.userId,
            dueDate: assignment.dueDate,
            daysUntilDue
          });
        }
      }
    } catch (error) {
      console.error('Error processing deadline reminders:', error);
    }
  }

  // Get notifications for current user
  async getNotifications(userId: string, limit: number = 10): Promise<SubscriberNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('userId', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('expiresAt', new Date().toISOString());

      if (error) throw error;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }
}

export const subscriberNotificationService = new SubscriberNotificationService();