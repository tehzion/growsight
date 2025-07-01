import React from 'react';
import { User, Calendar } from 'lucide-react';
import { SupportTicket } from '../../types';
import TicketStatusBadge from './TicketStatusBadge';
import TicketPriorityBadge from './TicketPriorityBadge';
import TicketCategoryBadge from './TicketCategoryBadge';

interface TicketListProps {
  tickets: SupportTicket[];
  onSelectTicket: (ticket: SupportTicket) => void;
  selectedTicketId?: string;
  isLoading?: boolean;
  currentUserId?: string;
  getUserName: (userId: string) => string;
}

const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onSelectTicket,
  selectedTicketId,
  isLoading = false,
  currentUserId,
  getUserName
}) => {
  const getTicketAge = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-12 w-12 mx-auto text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
        <p className="mt-1 text-sm text-gray-500">
          No support tickets match your criteria
        </p>
      </div>
    );
  }
  
  return (
    <div className="divide-y divide-gray-200">
      {tickets.map(ticket => (
        <div
          key={ticket.id}
          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedTicketId === ticket.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
          }`}
          onClick={() => onSelectTicket(ticket)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 line-clamp-1">{ticket.subject}</h3>
              <div className="flex items-center mt-1 space-x-2">
                <TicketStatusBadge status={ticket.status} size="sm" />
                <TicketPriorityBadge priority={ticket.priority} size="sm" />
              </div>
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
              {getTicketAge(ticket.createdAt)}
            </div>
          </div>
          <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center">
              <User className="h-3 w-3 mr-1" />
              <span>
                {ticket.staffMemberId === currentUserId ? 'You' : getUserName(ticket.staffMemberId)}
              </span>
            </div>
            <div>
              <TicketCategoryBadge category={ticket.category} size="sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TicketList;