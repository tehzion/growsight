import React from 'react';
import { TicketCategory } from '../../types';
import { HelpCircle, BookOpen, Users } from 'lucide-react';

interface TicketCategoryBadgeProps {
  category: TicketCategory;
  size?: 'sm' | 'md';
}

const TicketCategoryBadge: React.FC<TicketCategoryBadgeProps> = ({ category, size = 'md' }) => {
  const getCategoryClasses = () => {
    switch (category) {
      case 'technical_support':
        return 'bg-indigo-100 text-indigo-800';
      case 'training_request':
        return 'bg-green-100 text-green-800';
      case 'consultation':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getCategoryIcon = () => {
    switch (category) {
      case 'technical_support':
        return <HelpCircle className="h-3 w-3 mr-1" />;
      case 'training_request':
        return <BookOpen className="h-3 w-3 mr-1" />;
      case 'consultation':
        return <Users className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };
  
  const getCategoryLabel = () => {
    switch (category) {
      case 'technical_support':
        return 'Technical Support';
      case 'training_request':
        return 'Training Request';
      case 'consultation':
        return 'Consultation';
      default:
        return category;
    }
  };
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-2.5 py-0.5 text-xs';
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${getCategoryClasses()} ${sizeClasses}`}>
      {getCategoryIcon()}
      {getCategoryLabel()}
    </span>
  );
};

export default TicketCategoryBadge;