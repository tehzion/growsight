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
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  _timeouts: Map<string, NodeJS.Timeout>; // Track timeouts for cleanup
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  _cleanup: () => void; // Internal cleanup method
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
          createdAt: new Date().toISOString()
        };
        
        set(state => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
        
        // Auto-remove success notifications after 5 seconds with proper cleanup
        if (notification.type === 'success') {
          const timeoutId = setTimeout(() => {
            const currentState = get();
            // Remove from timeouts map
            currentState._timeouts.delete(newNotification.id);
            // Remove notification
            currentState.removeNotification(newNotification.id);
          }, 5000);
          
          // Store timeout for cleanup
          get()._timeouts.set(newNotification.id, timeoutId);
        }
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
        // Clear any existing timeout for this notification
        const timeoutId = get()._timeouts.get(id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          get()._timeouts.delete(id);
        }
        
        set(state => {
          const notification = state.notifications.find(n => n.id === id);
          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: notification && !notification.isRead 
              ? state.unreadCount - 1 
              : state.unreadCount
          };
        });
      },
      
      clearAllNotifications: () => {
        // Clear all timeouts before clearing notifications
        const timeouts = get()._timeouts;
        timeouts.forEach((timeoutId) => {
          clearTimeout(timeoutId);
        });
        timeouts.clear();
        
        set({
          notifications: [],
          unreadCount: 0
        });
      },
      
      _cleanup: () => {
        // Method to clean up all timeouts - useful for component unmount
        const timeouts = get()._timeouts;
        timeouts.forEach((timeoutId) => {
          clearTimeout(timeoutId);
        });
        timeouts.clear();
      }
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount
        // Don't persist timeouts - they need to be recreated on hydration
      }),
    }
  )
);