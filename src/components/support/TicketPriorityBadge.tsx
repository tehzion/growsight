import React from 'react';
import { PriorityLevel } from '../../types';
import { AlertTriangle, Clock, ArrowDown } from 'lucide-react';

interface TicketPriorityBadgeProps {
  priority: PriorityLevel;
  size?: 'sm' | 'md';
}

const TicketPriorityBadge: React.FC<TicketPriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const getPriorityClasses = () => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getPriorityIcon = () => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      case 'normal':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'low':
        return <ArrowDown className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };
  
  const getPriorityLabel = () => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Low';
      default:
        return priority;
    }
  };
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-2.5 py-0.5 text-xs';
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${getPriorityClasses()} ${sizeClasses}`}>
      {getPriorityIcon()}
      {getPriorityLabel()}
    </span>
  );
};

export default TicketPriorityBadge;