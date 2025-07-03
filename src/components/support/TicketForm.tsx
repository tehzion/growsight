import React, { useState, useEffect } from 'react';
import { AlertCircle, Send, Paperclip, X, Building, Users, User, CheckCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { useSupportStore } from '../../stores/supportStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { PriorityLevel, TicketCategory } from '../../types';
import { ContactOption } from '../../services/supportService';

interface TicketFormProps {
  onSubmit: (data: {
    subject: string;
    description?: string;
    priority: PriorityLevel;
    category: TicketCategory;
    contactType: string;
    contactRecipients: string[];
    contactDepartments: string[];
    assessmentId?: string;
    assessmentResultId?: string;
    attachments?: File[];
  }) => void;
  onCancel: () => void;
  prefillAssessmentId?: string;
  prefillAssessmentResultId?: string;
}

const TicketForm: React.FC<TicketFormProps> = ({ 
  onSubmit, 
  onCancel, 
  prefillAssessmentId, 
  prefillAssessmentResultId 
}) => {
  const { user } = useAuthStore();
  const { fetchContactOptions, contactOptions, isLoading: contactLoading } = useSupportStore();
  const { userAssessments, fetchUserAssessments } = useAssessmentStore();
  const { userResults, fetchUserResults } = useAssessmentResultsStore();
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'normal' as PriorityLevel,
    category: 'technical_support' as TicketCategory,
    contactType: 'org_admin' as string,
    assessmentId: prefillAssessmentId || '',
    assessmentResultId: prefillAssessmentResultId || ''
  });
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssessmentSelector, setShowAssessmentSelector] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContactOptions(user.id);
      fetchUserAssessments(user.id);
      fetchUserResults(user.id);
    }
  }, [user, fetchContactOptions, fetchUserAssessments, fetchUserResults]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  const handleContactTypeChange = (contactType: string) => {
    setFormData(prev => ({ ...prev, contactType }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getSelectedContactOption = (): ContactOption | null => {
    return contactOptions.find(option => option.contactType === formData.contactType) || null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getContactTypeIcon = (contactType: string) => {
    switch (contactType) {
      case 'department_admin': return <Building className="h-4 w-4" />;
      case 'org_admin': return <Users className="h-4 w-4" />;
      case 'all_org_admins': return <Users className="h-4 w-4" />;
      case 'super_admin': return <User className="h-4 w-4" />;
      case 'other': return <AlertCircle className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
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

    const selectedContact = getSelectedContactOption();
    if (!selectedContact) {
      setValidationError('Please select a valid contact option');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      onSubmit({
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
        contactType: formData.contactType,
        contactRecipients: selectedContact.contactRecipients,
        contactDepartments: selectedContact.contactDepartments,
        assessmentId: formData.assessmentId || undefined,
        assessmentResultId: formData.assessmentResultId || undefined,
        attachments
      });
    } catch (error) {
      console.error('Failed to submit ticket:', error);
      setValidationError((error as Error).message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedContact = getSelectedContactOption();
  
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
                <option value="high">High - Urgent attention needed</option>
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
                <option value="assessment">Assessment Issues</option>
                <option value="user_management">User Management</option>
                <option value="billing">Billing & Payments</option>
                <option value="training_request">Training Request</option>
                <option value="consultation">Consultation</option>
                <option value="general">General Inquiry</option>
              </select>
            </div>
          </div>

          {/* Contact Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact *
            </label>
            <div className="space-y-2">
              {contactOptions.map(option => (
                <button
                  key={option.contactType}
                  type="button"
                  onClick={() => handleContactTypeChange(option.contactType)}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    formData.contactType === option.contactType
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getContactTypeIcon(option.contactType)}
                      <div>
                        <div className="font-medium">{option.contactLabel}</div>
                        <div className="text-sm text-gray-500">
                          {option.contactRecipients.length} recipient{option.contactRecipients.length !== 1 ? 's' : ''}
                          {option.contactDepartments.length > 0 && 
                            ` • ${option.contactDepartments.length} department${option.contactDepartments.length !== 1 ? 's' : ''}`
                          }
                        </div>
                      </div>
                    </div>
                    {formData.contactType === option.contactType && (
                      <CheckCircle className="h-5 w-5 text-primary-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Assessment Linking */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to Assessment (Optional)
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssessmentSelector(!showAssessmentSelector)}
                >
                  {formData.assessmentId ? 'Change Assessment' : 'Select Assessment'}
                </Button>
                {formData.assessmentId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, assessmentId: '', assessmentResultId: '' }))}
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              {formData.assessmentId && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">
                    Selected Assessment: {userAssessments.find(a => a.id === formData.assessmentId)?.title || 'Unknown'}
                  </div>
                  {formData.assessmentResultId && (
                    <div className="text-sm text-blue-600 mt-1">
                      Result ID: {formData.assessmentResultId}
                    </div>
                  )}
                </div>
              )}

              {showAssessmentSelector && (
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {userAssessments.map(assessment => (
                      <button
                        key={assessment.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, assessmentId: assessment.id }));
                          setShowAssessmentSelector(false);
                        }}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="font-medium">{assessment.title}</div>
                        <div className="text-sm text-gray-500">{assessment.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

          {/* Contact Preview */}
          {selectedContact && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Contact Summary</h4>
              <div className="text-sm text-gray-600">
                <div>Type: {selectedContact.contactLabel}</div>
                <div>Recipients: {selectedContact.contactRecipients.length}</div>
                {selectedContact.contactDepartments.length > 0 && (
                  <div>Departments: {selectedContact.contactDepartments.length}</div>
                )}
              </div>
            </div>
          )}
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
          loading={isSubmitting || contactLoading}
          rightIcon={<Send className="h-4 w-4" />}
        >
          Submit Ticket
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TicketForm;