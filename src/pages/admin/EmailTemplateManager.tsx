import React, { useState, useEffect } from 'react';
import { PlusCircle, Pencil, Trash2, Mail, Save, X, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { emailService } from '../../services/emailService';
import { EmailTemplate } from '../../types';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useNotificationStore } from '../../stores/notificationStore';

const EmailTemplateManager: React.FC = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    variables: '',
  });

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTemplates();
    }
  }, [isSuperAdmin]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTemplates = await emailService.getEmailTemplates('system'); // Assuming 'system' for global templates
      setTemplates(fetchedTemplates);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch templates');
      addNotification({
        title: 'Error',
        message: 'Failed to fetch email templates.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBodyChange = (value: string) => {
    setFormData(prev => ({ ...prev, body: value }));
  };

  const handleSaveTemplate = async () => {
    setError(null);
    if (!formData.name || !formData.subject || !formData.body) {
      setError('Name, Subject, and Body are required.');
      return;
    }

    setIsLoading(true);
    try {
      const templateData: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name,
        subject: formData.subject,
        body: formData.body,
        variables: formData.variables.split(',').map(v => v.trim()).filter(v => v !== ''),
        organization_id: 'system', // System-wide templates
      };

      if (editingTemplate) {
        await emailService.updateEmailTemplate(editingTemplate.id, templateData);
        addNotification({
          title: 'Success',
          message: 'Email template updated successfully.',
          type: 'success'
        });
      } else {
        await emailService.createEmailTemplate(templateData);
        addNotification({
          title: 'Success',
          message: 'Email template created successfully.',
          type: 'success'
        });
      }
      setShowAddForm(false);
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', body: '', variables: '' });
      fetchTemplates();
    } catch (err) {
      setError((err as Error).message || 'Failed to save template');
      addNotification({
        title: 'Error',
        message: 'Failed to save email template.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setIsLoading(true);
      setError(null);
      try {
        await emailService.deleteEmailTemplate(id);
        addNotification({
          title: 'Success',
          message: 'Email template deleted successfully.',
          type: 'success'
        });
        fetchTemplates();
      } catch (err) {
        setError((err as Error).message || 'Failed to delete template');
        addNotification({
          title: 'Error',
          message: 'Failed to delete email template.',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      variables: template.variables ? template.variables.join(', ') : '',
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', body: '', variables: '' });
    setError(null);
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500">Only Super Admins can manage email templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Mail className="h-6 w-6 mr-3 text-primary-600" />
            Email Template Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system-wide email templates for various notifications.
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          {showAddForm ? 'Cancel' : 'Add New Template'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
          {error}
        </div>
      )}

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormInput
                label="Template Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Welcome Email, Assignment Notification"
                required
              />
              <FormInput
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Email subject line"
                required
              />
              <div>
                <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                  Body (HTML)
                </label>
                <ReactQuill
                  theme="snow"
                  value={formData.body}
                  onChange={handleBodyChange}
                  placeholder="Email body content (HTML allowed)"
                  className="h-40 mb-12"
                />
              </div>
              <FormInput
                label="Variables (comma-separated)"
                name="variables"
                value={formData.variables}
                onChange={handleInputChange}
                placeholder="e.g., {{recipient_name}}, {{assessment_title}}"
                helperText="List variables available in the email body, separated by commas."
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate} isLoading={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing Email Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No email templates found</h3>
              <p className="text-sm text-gray-500">Create your first email template to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variables</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{template.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.variables?.join(', ') || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil className="h-4 w-4" />}
                          onClick={() => handleEditTemplate(template)}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="h-4 w-4" />}
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-error-600 hover:text-error-800 ml-2"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplateManager;