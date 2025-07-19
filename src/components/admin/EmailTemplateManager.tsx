import React, { useState, useEffect } from 'react';
import { Mail, Plus, Edit2, Trash2, Eye, Save, X, Copy, Download, Upload } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { useEmailServiceStore, EmailTemplate } from '../../stores/emailServiceStore';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';

const EmailTemplateManager: React.FC = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    sendBrandedEmail
  } = useEmailServiceStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'notification' as EmailTemplate['category'],
    variables: [] as string[]
  });

  const [previewData, setPreviewData] = useState({
    email: user?.email || '',
    variables: {} as Record<string, string>
  });

  const canManageTemplates = user?.role === 'super_admin' || user?.role === 'org_admin';

  const resetForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      content: '',
      category: 'notification',
      variables: []
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.content) {
      return;
    }

    createTemplate({
      name: templateForm.name,
      subject: templateForm.subject,
      content: templateForm.content,
      category: templateForm.category,
      variables: templateForm.variables,
      isDefault: false
    });

    resetForm();
  };

  const handleEdit = (template: EmailTemplate) => {
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      category: template.category,
      variables: template.variables
    });
    setEditingId(template.id);
  };

  const handleUpdate = () => {
    if (!editingId || !templateForm.name || !templateForm.subject || !templateForm.content) {
      return;
    }

    updateTemplate(editingId, {
      name: templateForm.name,
      subject: templateForm.subject,
      content: templateForm.content,
      category: templateForm.category,
      variables: templateForm.variables
    });

    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setTemplateForm({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      content: template.content,
      category: template.category,
      variables: template.variables
    });
    setIsCreating(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    // Initialize preview variables with defaults
    const defaultVariables: Record<string, string> = {};
    template.variables.forEach(variable => {
      switch (variable) {
        case 'userName':
          defaultVariables[variable] = user?.firstName + ' ' + user?.lastName || 'John Doe';
          break;
        case 'companyName':
          defaultVariables[variable] = currentOrganization?.name || 'Your Organization';
          break;
        case 'assessmentTitle':
          defaultVariables[variable] = 'Sample Assessment';
          break;
        case 'dueDate':
          defaultVariables[variable] = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
          break;
        case 'appUrl':
          defaultVariables[variable] = window.location.origin;
          break;
        default:
          defaultVariables[variable] = `[${variable}]`;
      }
    });
    setPreviewData(prev => ({
      ...prev,
      variables: defaultVariables
    }));
  };

  const handleSendPreview = async () => {
    if (!previewTemplate || !previewData.email || !currentOrganization?.id) {
      return;
    }

    // Replace variables in content
    let processedContent = previewTemplate.content;
    Object.entries(previewData.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    // Replace variables in subject
    let processedSubject = previewTemplate.subject;
    Object.entries(previewData.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedSubject = processedSubject.replace(regex, value);
    });

    await sendBrandedEmail({
      organizationId: currentOrganization.id,
      to: previewData.email,
      subject: processedSubject,
      content: processedContent,
      templateName: previewTemplate.name,
      variables: previewData.variables
    });
  };

  const extractVariables = (text: string): string[] => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = variableRegex.exec(text)) !== null) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  };

  const updateVariables = () => {
    const subjectVariables = extractVariables(templateForm.subject);
    const contentVariables = extractVariables(templateForm.content);
    const allVariables = [...new Set([...subjectVariables, ...contentVariables])];
    
    setTemplateForm(prev => ({
      ...prev,
      variables: allVariables
    }));
  };

  useEffect(() => {
    updateVariables();
  }, [templateForm.subject, templateForm.content]);

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'notification', label: 'Notification' },
    { value: 'system', label: 'System' }
  ];

  if (!canManageTemplates) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only administrators can manage email templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage email templates for automated communications
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Create Template
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2">
        {categories.map(category => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedCategory === category.value
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingId ? 'Edit Template' : 'Create New Template'}</span>
              <Button
                variant="outline"
                onClick={resetForm}
                leftIcon={<X className="h-4 w-4" />}
              >
                Cancel
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Template Name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Welcome Email"
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value as EmailTemplate['category'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="welcome">Welcome</option>
                    <option value="assessment">Assessment</option>
                    <option value="reminder">Reminder</option>
                    <option value="notification">Notification</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>

              <FormInput
                label="Email Subject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Welcome to {{companyName}}"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Content
                </label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder="Enter your email content with HTML and variables like {{userName}}"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use HTML for formatting and variables like &#123;&#123;userName&#125;&#125; for dynamic content
                </p>
              </div>

              {/* Variables Preview */}
              {templateForm.variables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detected Variables
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {templateForm.variables.map(variable => (
                      <span
                        key={variable}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingId ? handleUpdate : handleCreate}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  {editingId ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      template.category === 'welcome' ? 'bg-green-100 text-green-700' :
                      template.category === 'assessment' ? 'bg-blue-100 text-blue-700' :
                      template.category === 'reminder' ? 'bg-yellow-100 text-yellow-700' :
                      template.category === 'notification' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {template.category}
                    </span>
                    {template.isDefault && (
                      <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-2">{template.subject}</p>
                  
                  <div className="text-sm text-gray-500">
                    <p>Variables: {template.variables.length > 0 ? template.variables.join(', ') : 'None'}</p>
                    <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePreview(template)}
                    leftIcon={<Eye className="h-4 w-4" />}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDuplicate(template)}
                    leftIcon={<Copy className="h-4 w-4" />}
                  >
                    Duplicate
                  </Button>
                  {!template.isDefault && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(template)}
                        leftIcon={<Edit2 className="h-4 w-4" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(template.id)}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">
              {selectedCategory === 'all' 
                ? 'Create your first email template to get started'
                : `No templates found in the ${selectedCategory} category`
              }
            </p>
            <Button
              onClick={() => setIsCreating(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Template
            </Button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Template Preview: {previewTemplate.name}</h2>
              <Button
                variant="outline"
                onClick={() => setPreviewTemplate(null)}
                leftIcon={<X className="h-4 w-4" />}
              >
                Close
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Preview Controls */}
                <div className="space-y-4">
                  <div>
                    <FormInput
                      label="Preview Email Address"
                      value={previewData.email}
                      onChange={(e) => setPreviewData(prev => ({ ...prev, email: e.target.value }))}
                      type="email"
                      placeholder="test@example.com"
                    />
                  </div>
                  
                  {previewTemplate.variables.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Template Variables</h4>
                      <div className="space-y-3">
                        {previewTemplate.variables.map(variable => (
                          <FormInput
                            key={variable}
                            label={variable}
                            value={previewData.variables[variable] || ''}
                            onChange={(e) => setPreviewData(prev => ({
                              ...prev,
                              variables: {
                                ...prev.variables,
                                [variable]: e.target.value
                              }
                            }))}
                            placeholder={`Enter ${variable}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleSendPreview}
                    disabled={!previewData.email}
                    leftIcon={<Mail className="h-4 w-4" />}
                    className="w-full"
                  >
                    Send Preview Email
                  </Button>
                </div>
                
                {/* Preview Content */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Email Preview</h4>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <strong>Subject:</strong> {previewTemplate.subject}
                    </div>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: previewTemplate.content.replace(/\{\{(\w+)\}\}/g, (match, variable) => 
                          previewData.variables[variable] || match
                        )
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateManager;