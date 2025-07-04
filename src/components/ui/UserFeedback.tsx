import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle, 
  HelpCircle, 
  ExternalLink,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface FeedbackMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'loading';
  title: string;
  message: string;
  suggestion?: string;
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
  autoDismiss?: boolean;
  dismissAfter?: number;
}

interface UserFeedbackProps {
  message: FeedbackMessage;
  onDismiss: (id: string) => void;
  className?: string;
}

const UserFeedback: React.FC<UserFeedbackProps> = ({
  message,
  onDismiss,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto dismiss if configured
    if (message.autoDismiss && message.dismissAfter) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, message.dismissAfter);
      
      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    }
    
    return () => clearTimeout(showTimer);
  }, [message.autoDismiss, message.dismissAfter]);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss(message.id);
    }, 300);
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-50 border-green-200 shadow-green-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 shadow-yellow-100';
      case 'error':
        return 'bg-red-50 border-red-200 shadow-red-100';
      case 'loading':
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
    }
  };

  const getSupportContact = () => {
    const role = user?.role || 'user';
    
    switch (role) {
      case 'root':
      case 'super_admin':
        return {
          email: 'tech-support@company.com',
          phone: '+1-800-TECH-SUP',
          chat: 'https://support.company.com/chat'
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

  const supportInfo = message.support || getSupportContact();

  return (
    <div 
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isDismissing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isDismissing ? 'scale-95 opacity-0' : 'scale-100'}
        max-w-lg w-full shadow-lg rounded-lg border-2 
        ${getBackgroundColor()} overflow-hidden backdrop-blur-sm
        ${className}
      `}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 leading-5">
              {message.title}
            </h3>
            
            <p className="mt-1 text-sm text-gray-700 leading-relaxed">
              {message.message}
            </p>
            
            {message.suggestion && (
              <p className="mt-2 text-sm text-gray-600">
                💡 <strong>Suggestion:</strong> {message.suggestion}
              </p>
            )}
            
            {/* Action Buttons */}
            {message.action && (
              <div className="mt-3">
                <button
                  onClick={message.action.onClick}
                  className={`
                    inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                    ${message.action.variant === 'primary' 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : message.action.variant === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {message.action.label}
                </button>
              </div>
            )}
            
            {/* Support Options */}
            {message.type === 'error' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Need help?</p>
                <div className="flex flex-wrap gap-2">
                  {supportInfo.email && (
                    <a
                      href={`mailto:${supportInfo.email}?subject=Support Request: ${message.title}`}
                      className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Email Support
                    </a>
                  )}
                  
                  {supportInfo.phone && (
                    <a
                      href={`tel:${supportInfo.phone}`}
                      className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call Support
                    </a>
                  )}
                  
                  {supportInfo.chat && (
                    <a
                      href={supportInfo.chat}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Live Chat
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors p-1"
            >
              <span className="sr-only">Dismiss</span>
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeedbackContainerProps {
  messages: FeedbackMessage[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxMessages?: number;
  className?: string;
}

export const FeedbackContainer: React.FC<FeedbackContainerProps> = ({
  messages,
  onDismiss,
  position = 'top-right',
  maxMessages = 5,
  className = ''
}) => {
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

  const visibleMessages = messages.slice(0, maxMessages);

  return (
    <div 
      className={`fixed z-50 ${getPositionClasses()} space-y-3 pointer-events-none ${className}`}
      style={{
        maxHeight: 'calc(100vh - 2rem)',
        overflowY: 'auto'
      }}
    >
      {visibleMessages.map((message, index) => (
        <div key={message.id} className="pointer-events-auto">
          <UserFeedback
            message={message}
            onDismiss={onDismiss}
            className={`transform transition-all duration-300`}
            style={{
              transform: `translateX(${index * 20}px)`
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Utility functions for creating feedback messages
export const createFeedbackMessage = (
  type: FeedbackMessage['type'],
  title: string,
  message: string,
  options: Partial<Omit<FeedbackMessage, 'id' | 'type' | 'title' | 'message'>> = {}
): FeedbackMessage => {
  return {
    id: `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    title,
    message,
    ...options
  };
};

export const createSuccessMessage = (
  title: string,
  message: string,
  options: Partial<Omit<FeedbackMessage, 'id' | 'type' | 'title' | 'message'>> = {}
): FeedbackMessage => {
  return createFeedbackMessage('success', title, message, {
    autoDismiss: true,
    dismissAfter: 5000,
    ...options
  });
};

export const createErrorMessage = (
  title: string,
  message: string,
  options: Partial<Omit<FeedbackMessage, 'id' | 'type' | 'title' | 'message'>> = {}
): FeedbackMessage => {
  return createFeedbackMessage('error', title, message, {
    autoDismiss: false,
    ...options
  });
};

export const createLoadingMessage = (
  title: string,
  message: string,
  options: Partial<Omit<FeedbackMessage, 'id' | 'type' | 'title' | 'message'>> = {}
): FeedbackMessage => {
  return createFeedbackMessage('loading', title, message, {
    autoDismiss: false,
    ...options
  });
};

export default UserFeedback; 