import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useNotificationStore, Notification } from '../../stores/notificationStore';

interface ToastNotificationProps {
  notification: Notification;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
  index?: number;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onClose,
  autoClose = true,
  duration = 5000,
  index = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), index * 100);
    
    if (autoClose) {
      const closeTimer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => {
        clearTimeout(showTimer);
        clearTimeout(closeTimer);
      };
    }
    
    return () => clearTimeout(showTimer);
  }, [autoClose, duration, index]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for exit animation
  };
  
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };
  
  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 shadow-green-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 shadow-yellow-100';
      case 'error':
        return 'bg-red-50 border-red-200 shadow-red-100';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
    }
  };
  
  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  const getProgressColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };
  
  return (
    <div 
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isClosing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isClosing ? 'scale-95 opacity-0' : 'scale-100'}
        max-w-md w-full shadow-lg rounded-lg pointer-events-auto border-2 
        ${getBackgroundColor()} overflow-hidden backdrop-blur-sm
      `}
      style={{
        minWidth: '320px',
        maxWidth: '400px'
      }}
    >
      {/* Progress bar */}
      {autoClose && (
        <div className="h-1 bg-gray-200">
          <div 
            className={`h-full ${getProgressColor()} transition-all duration-300 ease-linear`}
            style={{
              width: isClosing ? '0%' : '100%',
              transitionDuration: `${duration}ms`
            }}
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${getTextColor()} leading-5`}>
              {notification.title}
            </p>
            {notification.message && (
              <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                {notification.message}
              </p>
            )}
            {notification.link && (
              <a 
                href={notification.link} 
                className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                View details
                <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <div className="flex-shrink-0">
            <button
              className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors p-1"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxNotifications = 5
}) => {
  const { notifications, removeNotification, markAsRead } = useNotificationStore();
  
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };
  
  const handleClose = (id: string) => {
    markAsRead(id);
    removeNotification(id);
  };

  // Filter out read notifications and limit display
  const visibleNotifications = notifications
    .filter(n => !n.isRead)
    .slice(0, maxNotifications);
  
  return (
    <div 
      className={`fixed z-50 ${getPositionClasses()} space-y-3 pointer-events-none`}
      style={{
        maxHeight: 'calc(100vh - 2rem)',
        overflowY: 'auto'
      }}
    >
      {visibleNotifications.map((notification, index) => (
        <div key={notification.id} className="pointer-events-auto">
          <ToastNotification
            notification={notification}
            onClose={() => handleClose(notification.id)}
            index={index}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;