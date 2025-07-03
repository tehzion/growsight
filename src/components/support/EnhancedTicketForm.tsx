import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Upload, X, AlertCircle, CheckCircle, Clock, User, Building, Users } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import FormInput from '../ui/FormInput';
import { useSupportStore } from '../../stores/supportStore';
import { useAuthStore } from '../../stores/authStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { ContactOption, CreateTicketData } from '../../services/supportService';

interface EnhancedTicketFormProps {
  onClose?: () => void;
  prefillAssessmentId?: string;
  prefillAssessmentResultId?: string;
}

const EnhancedTicketForm = ({ 
  onClose, 
  prefillAssessmentId, 
  prefillAssessmentResultId 
}: EnhancedTicketFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createTicket, fetchContactOptions, contactOptions, isLoading, error } = useSupportStore();
  const { userAssessments, fetchUserAssessments } = useAssessmentStore();
  const { userResults, fetchUserResults } = useAssessmentResultsStore();

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'general' as 'technical' | 'assessment' | 'user_management' | 'billing' | 'general' | 'other',
    contactType: 'org_admin' as 'department_admin' | 'org_admin' | 'all_org_admins' | 'super_admin' | 'other',
    assessmentId: prefillAssessmentId || '',
    assessmentResultId: prefillAssessmentResultId || '',
    customRecipients: [] as string[],
    customDepartments: [] as string[]
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showAssessmentSelector, setShowAssessmentSelector] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContactOptions(user.id);
      fetchUserAssessments(user.id);
      fetchUserResults(user.id);
    }
  }, [user, fetchContactOptions, fetchUserAssessments, fetchUserResults]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getSelectedContactOption = (): ContactOption | null => {
    return contactOptions.find(option => option.contactType === formData.contactType) || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const selectedContact = getSelectedContactOption();
    if (!selectedContact) {
      alert('Please select a valid contact option');
      return;
    }

    const ticketData: CreateTicketData = {
      subject: formData.subject,
      description: formData.description,
      priority: formData.priority,
      category: formData.category,
      contactType: formData.contactType,
      contactRecipients: selectedContact.contactRecipients,
      contactDepartments: selectedContact.contactDepartments,
      assessmentId: formData.assessmentId || undefined,
      assessmentResultId: formData.assessmentResultId || undefined
    };

    try {
      await createTicket(user.id, ticketData);
      alert('Support ticket created successfully!');
      onClose?.();
      navigate('/support');
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return '🔧';
      case 'assessment': return '📊';
      case 'user_management': return '👥';
      case 'billing': return '💰';
      case 'general': return '📝';
      case 'other': return '❓';
      default: return '📝';
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

  const selectedContact = getSelectedContactOption();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Create Support Ticket</span>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <FormInput
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="general">📝 General</option>
                  <option value="technical">🔧 Technical</option>
                  <option value="assessment">📊 Assessment</option>
                  <option value="user_management">👥 User Management</option>
                  <option value="billing">💰 Billing</option>
                  <option value="other">❓ Other</option>
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => handleInputChange('priority', priority)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      formData.priority === priority
                        ? `${getPriorityColor(priority)} border-current`
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {priority === 'urgent' && <AlertCircle className="h-4 w-4" />}
                      {priority === 'high' && <Clock className="h-4 w-4" />}
                      {priority === 'medium' && <CheckCircle className="h-4 w-4" />}
                      {priority === 'low' && <Clock className="h-4 w-4" />}
                      <span className="capitalize">{priority}</span>
                    </div>
                  </button>
                ))}
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
                    onClick={() => handleInputChange('contactType', option.contactType)}
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
                      onClick={() => handleInputChange('assessmentId', '')}
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
                            handleInputChange('assessmentId', assessment.id);
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

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Please provide detailed information about your issue..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-input')?.click()}
                    leftIcon={<Upload className="h-4 w-4" />}
                  >
                    Add Files
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Upload className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              {onClose && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                loading={isLoading}
                rightIcon={<Send className="h-4 w-4" />}
              >
                Create Ticket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedTicketForm; 