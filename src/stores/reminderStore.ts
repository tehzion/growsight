import { create } from 'zustand';
import { reminderService, Reminder, CreateReminderData } from '../services/reminderService';

interface ReminderStore {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchUserReminders: (userId: string) => Promise<void>;
  createReminder: (userId: string, data: CreateReminderData) => Promise<void>;
  updateReminder: (reminderId: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (reminderId: string) => Promise<void>;
  sendReminder: (reminderId: string) => Promise<void>;
  getOverdueAssessments: (userId: string) => Promise<any[]>;
  getDueSoonAssessments: (userId: string, daysThreshold?: number) => Promise<any[]>;
  
  // Utility functions
  getRemindersForAssessment: (assessmentId: string) => Reminder[];
  getPendingReminders: () => Reminder[];
  clearError: () => void;
}

export const useReminderStore = create<ReminderStore>((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,

  fetchUserReminders: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const reminders = await reminderService.getUserReminders(userId);
      set({ reminders, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch reminders',
        isLoading: false 
      });
    }
  },

  createReminder: async (userId: string, data: CreateReminderData) => {
    set({ isLoading: true, error: null });
    try {
      const newReminder = await reminderService.createReminder(userId, data);
      set(state => ({
        reminders: [...state.reminders, newReminder],
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create reminder',
        isLoading: false 
      });
    }
  },

  updateReminder: async (reminderId: string, updates: Partial<Reminder>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedReminder = await reminderService.updateReminder(reminderId, updates);
      set(state => ({
        reminders: state.reminders.map(reminder => 
          reminder.id === reminderId ? updatedReminder : reminder
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update reminder',
        isLoading: false 
      });
    }
  },

  deleteReminder: async (reminderId: string) => {
    set({ isLoading: true, error: null });
    try {
      await reminderService.deleteReminder(reminderId);
      set(state => ({
        reminders: state.reminders.filter(reminder => reminder.id !== reminderId),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete reminder',
        isLoading: false 
      });
    }
  },

  sendReminder: async (reminderId: string) => {
    set({ isLoading: true, error: null });
    try {
      await reminderService.sendReminder(reminderId);
      // Update the reminder status to 'sent'
      await get().updateReminder(reminderId, { status: 'sent' });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to send reminder',
        isLoading: false 
      });
    }
  },

  getOverdueAssessments: async (userId: string) => {
    try {
      return await reminderService.getOverdueAssessments(userId);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch overdue assessments'
      });
      return [];
    }
  },

  getDueSoonAssessments: async (userId: string, daysThreshold: number = 3) => {
    try {
      return await reminderService.getDueSoonAssessments(userId, daysThreshold);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch due soon assessments'
      });
      return [];
    }
  },

  getRemindersForAssessment: (assessmentId: string) => {
    return get().reminders.filter(reminder => reminder.assessmentId === assessmentId);
  },

  getPendingReminders: () => {
    return get().reminders.filter(reminder => reminder.status === 'pending');
  },

  clearError: () => {
    set({ error: null });
  }
})); 