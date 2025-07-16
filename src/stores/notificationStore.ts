import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  link?: string;
  category?: 'system' | 'assessment' | 'user' | 'organization' | 'support' | 'security';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  };
  support?: {
    email?: string;
    phone?: string;
    chat?: string;
  };
  metadata?: {
    userId?: string;
    organizationId?: string;
    assessmentId?: string;
    operation?: string;
    userRole?: string;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  _timeouts: Map<string, NodeJS.Timeout>;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  
  // Enhanced actions
  addSuccessNotification: (title: string, message: string, options?: Partial<Notification>) => void;
  addErrorNotification: (title: string, message: string, options?: Partial<Notification>) => void;
  addWarningNotification: (title: string, message: string, options?: Partial<Notification>) => void;
  addInfoNotification: (title: string, message: string, options?: Partial<Notification>) => void;
  
  // Role-specific notifications
  addRoleSpecificNotification: (
    type: Notification['type'],
    title: string,
    message: string,
    userRole: string,
    options?: Partial<Notification>
  ) => void;
  
  // Utility methods
  getNotificationsByCategory: (category: Notification['category']) => Notification[];
  getNotificationsByPriority: (priority: Notification['priority']) => Notification[];
  getUnreadNotifications: () => Notification[];
  getRecentNotifications: (hours?: number) => Notification[];
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      _timeouts: new Map(),
      
      addNotification: (notification) => {
        const newNotification: Notification = {
          id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          ...notification,
          isRead: false,
          createdAt: new Date().toISOString(),
          category: notification.category || 'system',
          priority: notification.priority || 'medium'
        };
        
        set(state => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
        
        // Auto-remove success notifications after 5 seconds
        if (notification.type === 'success') {
          const timeoutId = setTimeout(() => {
            const currentState = get();
            currentState._timeouts.delete(newNotification.id);
            currentState.removeNotification(newNotification.id);
          }, 5000);
          
          get()._timeouts.set(newNotification.id, timeoutId);
        }
        
        // Auto-remove info notifications after 8 seconds
        if (notification.type === 'info') {
          const timeoutId = setTimeout(() => {
            const currentState = get();
            currentState._timeouts.delete(newNotification.id);
            currentState.removeNotification(newNotification.id);
          }, 8000);
          
          get()._timeouts.set(newNotification.id, timeoutId);
        }
      },
      
      addSuccessNotification: (title, message, options = {}) => {
        get().addNotification({
          title,
          message,
          type: 'success',
          ...options
        });
      },
      
      addErrorNotification: (title, message, options = {}) => {
        get().addNotification({
          title,
          message,
          type: 'error',
          priority: 'high',
          ...options
        });
      },
      
      addWarningNotification: (title, message, options = {}) => {
        get().addNotification({
          title,
          message,
          type: 'warning',
          priority: 'medium',
          ...options
        });
      },
      
      addInfoNotification: (title, message, options = {}) => {
        get().addNotification({
          title,
          message,
          type: 'info',
          priority: 'low',
          ...options
        });
      },
      
      addRoleSpecificNotification: (type, title, message, userRole, options = {}) => {
        const roleSpecificMessage = getRoleSpecificMessage(message, userRole);
        const roleSpecificSupport = getRoleSpecificSupport(userRole);
        
        get().addNotification({
          title,
          message: roleSpecificMessage,
          type,
          support: roleSpecificSupport,
          metadata: {
            ...options.metadata,
            userRole
          },
          ...options
        });
      },
      
      markAsRead: (id) => {
        set(state => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && !notification.isRead) {
            return {
              notifications: state.notifications.map(n => 
                n.id === id ? { ...n, isRead: true } : n
              ),
              unreadCount: state.unreadCount - 1
            };
          }
          return state;
        });
      },
      
      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0
        }));
      },
      
      removeNotification: (id) => {
        const currentState = get();
        const timeoutId = currentState._timeouts.get(id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          currentState._timeouts.delete(id);
        }
        
        set(state => {
          const notification = state.notifications.find(n => n.id === id);
          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: notification && !notification.isRead ? state.unreadCount - 1 : state.unreadCount
          };
        });
      },
      
      clearAll: () => {
        const currentState = get();
        // Clear all timeouts
        currentState._timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        currentState._timeouts.clear();
        
        set({
          notifications: [],
          unreadCount: 0
        });
      },
      
      getNotificationsByCategory: (category) => {
        return get().notifications.filter(n => n.category === category);
      },
      
      getNotificationsByPriority: (priority) => {
        return get().notifications.filter(n => n.priority === priority);
      },
      
      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.isRead);
      },
      
      getRecentNotifications: (hours = 24) => {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return get().notifications.filter(n => new Date(n.createdAt) > cutoff);
      }
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Keep only last 50 notifications
        unreadCount: state.unreadCount
      })
    }
  )
);

// Helper functions for role-specific messaging
const getRoleSpecificMessage = (message: string, userRole: string): string => {
  const roleContext = {
    root: 'As a system administrator,',
    super_admin: 'As a super administrator,',
    org_admin: 'As an organization administrator,',
    user: 'As a user,',
    subscriber: 'As a subscriber,'
  };

  const context = roleContext[userRole as keyof typeof roleContext] || '';
  
  if (context) {
    return `${context} ${message}`;
  }
  
  return message;
};

const getRoleSpecificSupport = (userRole: string) => {
  switch (userRole) {
    case 'root':
    case 'super_admin':
      return {
        email: 'tech-support@company.com',
        phone: '+1-800-TECH-SUP',
        chat: 'https://support.company.com/tech-chat'
      };
    case 'org_admin':
      return {
        email: 'admin-support@company.com',
        phone: '+1-800-ADMIN-SUP',
        chat: 'https://support.company.com/admin-chat'
      };
    default:
      return {
        email: 'user-support@company.com',
        phone: '+1-800-USER-SUP',
        chat: 'https://support.company.com/user-chat'
      };
  }
};

// Predefined notification templates
export const notificationTemplates = {
  // User Management
  userCreated: (userName: string, userRole: string) => ({
    title: 'User Created Successfully',
    message: `${userName} has been added to the system with ${userRole} role.`,
    category: 'user' as const,
    type: 'success' as const
  }),
  
  userUpdated: (userName: string) => ({
    title: 'User Updated',
    message: `${userName}'s information has been updated successfully.`,
    category: 'user' as const,
    type: 'success' as const
  }),
  
  userDeleted: (userName: string) => ({
    title: 'User Deleted',
    message: `${userName} has been removed from the system.`,
    category: 'user' as const,
    type: 'info' as const
  }),
  
  // Assessment Management
  assessmentCreated: (assessmentName: string) => ({
    title: 'Assessment Created',
    message: `Assessment "${assessmentName}" has been created successfully.`,
    category: 'assessment' as const,
    type: 'success' as const
  }),

  assessmentInvitation: (assessmentName: string, assignedToName: string) => ({
    title: 'Assessment Invitation',
    message: `You have been invited to complete the "${assessmentName}" assessment.`, 
    category: 'assessment' as const,
    type: 'info' as const,
    link: '/my-assessments'
  }),
  
  assessmentAssigned: (assessmentName: string, participantCount: number) => ({
    title: 'Assessment Assigned',
    message: `Assessment "${assessmentName}" has been assigned to ${participantCount} participants.`,
    category: 'assessment' as const,
    type: 'success' as const
  }),
  
  assessmentCompleted: (assessmentName: string, employeeName: string) => ({
    title: 'Assessment Completed',
    message: `The assessment "${assessmentName}" for ${employeeName} has been completed.`,
    category: 'assessment' as const,
    type: 'success' as const
  }),
  
  // Organization Management
  organizationCreated: (orgName: string) => ({
    title: 'Organization Created',
    message: `Organization "${orgName}" has been created successfully.`,
    category: 'organization' as const,
    type: 'success' as const
  }),
  
  organizationUpdated: (orgName: string) => ({
    title: 'Organization Updated',
    message: `Organization "${orgName}" has been updated successfully.`,
    category: 'organization' as const,
    type: 'success' as const
  }),
  
  // System Notifications
  systemMaintenance: (duration: string) => ({
    title: 'System Maintenance',
    message: `Scheduled maintenance will begin in ${duration}. Some features may be temporarily unavailable.`,
    category: 'system' as const,
    type: 'warning' as const,
    priority: 'high' as const
  }),
  
  securityAlert: (description: string) => ({
    title: 'Security Alert',
    message: description,
    category: 'security' as const,
    type: 'error' as const,
    priority: 'critical' as const
  }),
  
  // Support Notifications
  supportTicketCreated: (ticketId: string) => ({
    title: 'Support Ticket Created',
    message: `Your support ticket #${ticketId} has been created and is being reviewed.`,
    category: 'support' as const,
    type: 'info' as const
  }),
  
  supportTicketUpdated: (ticketId: string, status: string) => ({
    title: 'Support Ticket Updated',
    message: `Your support ticket #${ticketId} status has been updated to: ${status}`,
    category: 'support' as const,
    type: 'info' as const
  })
};