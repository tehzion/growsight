import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

const NotificationDisplay: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-error-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success-50';
      case 'error':
        return 'bg-error-50';
      case 'warning':
        return 'bg-warning-50';
      case 'info':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-success-200';
      case 'error':
        return 'border-error-200';
      case 'warning':
        return 'border-warning-200';
      case 'info':
        return 'border-blue-200';
      default:
        return 'border-gray-200';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-success-800';
      case 'error':
        return 'text-error-800';
      case 'warning':
        return 'text-warning-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg flex items-start space-x-3 border ${getBgColor(notification.type)} ${getBorderColor(notification.type)}`}
          role="alert"
        >
          <div className="flex-shrink-0">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${getTextColor(notification.type)}`}>
              {notification.title}
            </p>
            <p className={`mt-1 text-sm ${getTextColor(notification.type)}`}>
              {notification.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => removeNotification(notification.id)}
              className={`inline-flex ${getTextColor(notification.type)} rounded-md p-1.5 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent`}
            >
              <span className="sr-only">Dismiss</span>
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationDisplay;