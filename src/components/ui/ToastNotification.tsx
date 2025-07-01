import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useNotificationStore, Notification } from '../../stores/notificationStore';

interface ToastNotificationProps {
  notification: Notification;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);
  
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-error-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-primary-500" />;
    }
  };
  
  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-success-50 border-success-200';
      case 'warning':
        return 'bg-warning-50 border-warning-200';
      case 'error':
        return 'bg-error-50 border-error-200';
      case 'info':
      default:
        return 'bg-primary-50 border-primary-200';
    }
  };
  
  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-success-800';
      case 'warning':
        return 'text-warning-800';
      case 'error':
        return 'text-error-800';
      case 'info':
      default:
        return 'text-primary-800';
    }
  };
  
  return (
    <div className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border ${getBackgroundColor()} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${getTextColor()}`}>{notification.title}</p>
            <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
            {notification.link && (
              <a 
                href={notification.link} 
                className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                View details
              </a>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right'
}) => {
  const { notifications, removeNotification, markAsRead } = useNotificationStore();
  
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-0 left-0';
      case 'bottom-right':
        return 'bottom-0 right-0';
      case 'bottom-left':
        return 'bottom-0 left-0';
      case 'top-center':
        return 'top-0 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-0 left-1/2 transform -translate-x-1/2';
      case 'top-right':
      default:
        return 'top-0 right-0';
    }
  };
  
  const handleClose = (id: string) => {
    markAsRead(id);
    removeNotification(id);
  };
  
  return (
    <div className={`fixed z-50 p-4 ${getPositionClasses()} space-y-4 pointer-events-none`}>
      {notifications.slice(0, 5).map(notification => (
        <div key={notification.id} className="pointer-events-auto">
          <ToastNotification
            notification={notification}
            onClose={() => handleClose(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;