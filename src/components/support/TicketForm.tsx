import React, { useState } from 'react';
import { AlertCircle, Send, Paperclip } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { PriorityLevel, TicketCategory } from '../../types';

interface TicketFormProps {
  onSubmit: (data: {
    subject: string;
    description?: string;
    priority: PriorityLevel;
    category: TicketCategory;
    attachments?: File[];
  }) => void;
  onCancel: () => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ onSubmit, onCancel }) => {
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'normal' as PriorityLevel,
    category: 'technical_support' as TicketCategory
  });
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError(null);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim()) {
      setValidationError('Subject is required');
      return;
    }
    
    if (!user) {
      setValidationError('You must be logged in to submit a ticket');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      onSubmit({
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
        attachments
      });
    } catch (error) {
      console.error('Failed to submit ticket:', error);
      setValidationError((error as Error).message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Support Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        {validationError && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder="Brief description of your issue or request"
            required
          />
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Please provide details about your issue or request..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="low">Low - Not time-sensitive</option>
                <option value="normal">Normal - Needs attention soon</option>
                <option value="urgent">Urgent - Requires immediate attention</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="technical_support">Technical Support</option>
                <option value="training_request">Training Request</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments (Optional)
            </label>
            <div className="mt-1 flex items-center">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                <span className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach Files
                </span>
                <input 
                  type="file" 
                  className="sr-only" 
                  multiple 
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <Paperclip className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end space-x-3 border-t border-gray-200 bg-gray-50">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!formData.subject.trim() || isSubmitting}
          leftIcon={<Send className="h-4 w-4" />}
        >
          Submit Ticket
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TicketForm;