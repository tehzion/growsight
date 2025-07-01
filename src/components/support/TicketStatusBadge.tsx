import React from 'react';
import { TicketStatus } from '../../types';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusClasses = () => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'escalated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = () => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      case 'escalated':
        return 'Escalated';
      default:
        return status;
    }
  };
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-2.5 py-0.5 text-xs';
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${getStatusClasses()} ${sizeClasses}`}>
      {getStatusLabel()}
    </span>
  );
};

export default TicketStatusBadge;