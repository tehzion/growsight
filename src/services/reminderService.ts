import { supabase } from '../lib/supabase';

export interface Reminder {
  id: string;
  userId: string;
  assessmentId: string;
  assessmentTitle: string;
  dueDate: string;
  reminderDate: string;
  type: 'email' | 'push' | 'sms';
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderData {
  assessmentId: string;
  assessmentTitle: string;
  dueDate: string;
  reminderDate: string;
  type: 'email' | 'push' | 'sms';
}

class ReminderService {
  async createReminder(userId: string, data: CreateReminderData): Promise<Reminder> {
    const { data: reminder, error } = await supabase
      .from('assessment_reminders')
      .insert({
        user_id: userId,
        assessment_id: data.assessmentId,
        assessment_title: data.assessmentTitle,
        due_date: data.dueDate,
        reminder_date: data.reminderDate,
        type: data.type,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create reminder: ${error.message}`);
    }

    return this.mapReminderFromDB(reminder);
  }

  async getUserReminders(userId: string): Promise<Reminder[]> {
    const { data: reminders, error } = await supabase
      .from('assessment_reminders')
      .select('*')
      .eq('user_id', userId)
      .order('reminder_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch reminders: ${error.message}`);
    }

    return reminders.map(this.mapReminderFromDB);
  }

  async updateReminder(reminderId: string, updates: Partial<Reminder>): Promise<Reminder> {
    const { data: reminder, error } = await supabase
      .from('assessment_reminders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update reminder: ${error.message}`);
    }

    return this.mapReminderFromDB(reminder);
  }

  async deleteReminder(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('assessment_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) {
      throw new Error(`Failed to delete reminder: ${error.message}`);
    }
  }

  async sendReminder(reminderId: string): Promise<void> {
    // This would integrate with your email/SMS/push notification service
    // For now, we'll just update the status
    await this.updateReminder(reminderId, { status: 'sent' });
    
    // Here you would typically:
    // 1. Fetch the reminder details
    // 2. Send email/SMS/push notification
    // 3. Update the status to 'sent'
    // 4. Log the notification
  }

  async getOverdueAssessments(userId: string): Promise<any[]> {
    const { data: assessments, error } = await supabase
      .from('assessment_assignments')
      .select(`
        *,
        assessments (
          id,
          title,
          description
        )
      `)
      .eq('user_id', userId)
      .lt('due_date', new Date().toISOString())
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to fetch overdue assessments: ${error.message}`);
    }

    return assessments || [];
  }

  async getDueSoonAssessments(userId: string, daysThreshold: number = 3): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const { data: assessments, error } = await supabase
      .from('assessment_assignments')
      .select(`
        *,
        assessments (
          id,
          title,
          description
        )
      `)
      .eq('user_id', userId)
      .lte('due_date', thresholdDate.toISOString())
      .gt('due_date', new Date().toISOString())
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to fetch due soon assessments: ${error.message}`);
    }

    return assessments || [];
  }

  private mapReminderFromDB(dbReminder: any): Reminder {
    return {
      id: dbReminder.id,
      userId: dbReminder.user_id,
      assessmentId: dbReminder.assessment_id,
      assessmentTitle: dbReminder.assessment_title,
      dueDate: dbReminder.due_date,
      reminderDate: dbReminder.reminder_date,
      type: dbReminder.type,
      status: dbReminder.status,
      createdAt: dbReminder.created_at,
      updatedAt: dbReminder.updated_at
    };
  }

  // Utility function to calculate optimal reminder dates
  calculateReminderDates(dueDate: string): {
    oneWeekBefore: string;
    threeDaysBefore: string;
    oneDayBefore: string;
    sameDay: string;
  } {
    const due = new Date(dueDate);
    
    return {
      oneWeekBefore: new Date(due.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      threeDaysBefore: new Date(due.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      oneDayBefore: new Date(due.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      sameDay: due.toISOString()
    };
  }

  // Check if a reminder should be sent
  shouldSendReminder(reminder: Reminder): boolean {
    const now = new Date();
    const reminderDate = new Date(reminder.reminderDate);
    return reminder.status === 'pending' && reminderDate <= now;
  }
}

export const reminderService = new ReminderService(); 