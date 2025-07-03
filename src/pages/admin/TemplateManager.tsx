import React, { useState, useEffect } from 'react';
import { useTemplateStore, AssessmentTemplate, TemplateQuestion } from '../../stores/templateStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  Settings, 
  Users, 
  FileText, 
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Star,
  Building,
  Eye,
  EyeOff
} from 'lucide-react';

interface TemplateManagerProps {}

const TemplateManager: React.FC<TemplateManagerProps> = () => {
  const { user } = useAuthStore();
  const { organizations, fetchOrganizations } = useOrganizationStore();
  const {
    templates,
    templateQuestions,
    templateAssignments,
    defaultSettings,
    isLoading,
    error,
    fetchTemplates,
    fetchTemplateQuestions,
    fetchTemplateAssignments,
    fetchDefaultSettings,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate,
    setDefaultTemplate,
    assignTemplateToOrganizations,
    unassignTemplateFromOrganizations,
    clearError
  } = useTemplateStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);

  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    questions: [] as Omit<TemplateQuestion, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>[]
  });

  const [cloneForm, setCloneForm] = useState({
    newName: '',
    newDescription: '',
    organizationId: ''
  });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchTemplates();
      fetchOrganizations();
      fetchDefaultSettings();
    }
  }, [user?.role, fetchTemplates, fetchOrganizations, fetchDefaultSettings]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTemplate({
        name: templateForm.name,
        description: templateForm.description,
        questions: templateForm.questions
      });
      setShowCreateForm(false);
      setTemplateForm({ name: '', description: '', questions: [] });
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    try {
      await updateTemplate(selectedTemplate.id, {
        name: templateForm.name,
        description: templateForm.description
      });
      setShowEditForm(false);
      setSelectedTemplate(null);
      setTemplateForm({ name: '', description: '', questions: [] });
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleCloneTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    try {
      await cloneTemplate({
        templateId: selectedTemplate.id,
        newName: cloneForm.newName,
        newDescription: cloneForm.newDescription,
        organizationId: cloneForm.organizationId || undefined
      });
      setShowCloneForm(false);
      setSelectedTemplate(null);
      setCloneForm({ newName: '', newDescription: '', organizationId: '' });
    } catch (error) {
      console.error('Failed to clone template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        await deleteTemplate(templateId);
      } catch (error) {
        console.error('Failed to delete template:', error);
      }
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await setDefaultTemplate(templateId, 'global_default');
    } catch (error) {
      console.error('Failed to set default template:', error);
    }
  };

  const handleAssignToOrganizations = async () => {
    if (!selectedTemplate || selectedOrganizations.length === 0) return;

    try {
      await assignTemplateToOrganizations(selectedTemplate.id, selectedOrganizations);
      setShowAssignmentModal(false);
      setSelectedOrganizations([]);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to assign template:', error);
    }
  };

  const handleUnassignFromOrganizations = async (templateId: string, organizationIds: string[]) => {
    try {
      await unassignTemplateFromOrganizations(templateId, organizationIds);
    } catch (error) {
      console.error('Failed to unassign template:', error);
    }
  };

  const toggleTemplateExpansion = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
      fetchTemplateQuestions(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  const getDefaultTemplate = () => {
    return defaultSettings.find(setting => setting.settingType === 'global_default');
  };

  const getAssignedOrganizations = (templateId: string) => {
    return templateAssignments.filter(assignment => assignment.templateId === templateId);
  };

  const addQuestion = () => {
    setTemplateForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          questionType: 'rating',
          category: '',
          section: '',
          orderIndex: prev.questions.length + 1,
          isRequired: true,
          options: {}
        }
      ]
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setTemplateForm(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const removeQuestion = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only super administrators can access template management.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
          <p className="text-gray-600 mt-1">Manage assessment templates and their assignments</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Create Template
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Default Template Display */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Star className="h-6 w-6 text-yellow-500" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Global Default Template</h3>
                <p className="text-gray-600">
                  {getDefaultTemplate()?.templateName || 'No default template set'}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Used for new organizations without specific assignments
            </div>
          </div>
        </div>
      </Card>

      {/* Templates List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Assessment Templates</h2>
        
        {templates.length === 0 ? (
          <Card>
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">Create your first assessment template to get started.</p>
              <Button onClick={() => setShowCreateForm(true)}>
                Create Template
              </Button>
            </div>
          </Card>
        ) : (
          templates.map(template => (
            <Card key={template.id}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleTemplateExpansion(template.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedTemplates.has(template.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                        {template.isDefault && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                        {!template.isActive && (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-600">{template.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>{template.questionCount || 0} questions</span>
                        <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setTemplateForm({
                          name: template.name,
                          description: template.description || '',
                          questions: []
                        });
                        setShowEditForm(true);
                      }}
                      leftIcon={<Edit className="h-4 w-4" />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setCloneForm({
                          newName: `${template.name} (Copy)`,
                          newDescription: template.description || '',
                          organizationId: ''
                        });
                        setShowCloneForm(true);
                      }}
                      leftIcon={<Copy className="h-4 w-4" />}
                    >
                      Clone
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowAssignmentModal(true);
                      }}
                      leftIcon={<Users className="h-4 w-4" />}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(template.id)}
                      disabled={template.isDefault}
                      leftIcon={<Star className="h-4 w-4" />}
                    >
                      Set Default
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      leftIcon={<Trash2 className="h-4 w-4" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedTemplates.has(template.id) && (
                  <div className="mt-6 space-y-4">
                    {/* Questions */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Questions</h4>
                      <div className="space-y-2">
                        {templateQuestions[template.id]?.map((question, index) => (
                          <div key={question.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{question.questionText}</div>
                                <div className="text-sm text-gray-500">
                                  Type: {question.questionType} | 
                                  Category: {question.category || 'General'} | 
                                  Section: {question.section || 'Default'}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                #{question.orderIndex}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Organization Assignments */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Assigned Organizations</h4>
                      <div className="space-y-2">
                        {getAssignedOrganizations(template.id).map(assignment => (
                          <div key={assignment.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Building className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">{assignment.organizationName}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnassignFromOrganizations(template.id, [assignment.organizationId])}
                            >
                              Unassign
                            </Button>
                          </div>
                        ))}
                        {getAssignedOrganizations(template.id).length === 0 && (
                          <div className="text-gray-500 text-sm">No organizations assigned</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Create New Template</h2>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <FormInput
                label="Template Name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Questions</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addQuestion}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Add Question
                  </Button>
                </div>
                <div className="space-y-3">
                  {templateForm.questions.map((question, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormInput
                          label="Question Text"
                          value={question.questionText}
                          onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                          required
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question Type
                          </label>
                          <select
                            value={question.questionType}
                            onChange={(e) => updateQuestion(index, 'questionType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="rating">Rating</option>
                            <option value="text">Text</option>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="boolean">Yes/No</option>
                          </select>
                        </div>
                        <FormInput
                          label="Category"
                          value={question.category}
                          onChange={(e) => updateQuestion(index, 'category', e.target.value)}
                        />
                        <FormInput
                          label="Section"
                          value={question.section}
                          onChange={(e) => updateQuestion(index, 'section', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={question.isRequired}
                            onChange={(e) => updateQuestion(index, 'isRequired', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Required</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                          leftIcon={<Trash2 className="h-4 w-4" />}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditForm && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Template</h2>
            <form onSubmit={handleUpdateTemplate} className="space-y-4">
              <FormInput
                label="Template Name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Update Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clone Template Modal */}
      {showCloneForm && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Clone Template</h2>
            <form onSubmit={handleCloneTemplate} className="space-y-4">
              <FormInput
                label="New Template Name"
                value={cloneForm.newName}
                onChange={(e) => setCloneForm(prev => ({ ...prev, newName: e.target.value }))}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={cloneForm.newDescription}
                  onChange={(e) => setCloneForm(prev => ({ ...prev, newDescription: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization (Optional)
                </label>
                <select
                  value={cloneForm.organizationId}
                  onChange={(e) => setCloneForm(prev => ({ ...prev, organizationId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Global Template</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCloneForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Clone Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Assign Template to Organizations</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Organizations
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {organizations.map(org => (
                    <label key={org.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedOrganizations.includes(org.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrganizations(prev => [...prev, org.id]);
                          } else {
                            setSelectedOrganizations(prev => prev.filter(id => id !== org.id));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{org.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAssignmentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignToOrganizations}
                  disabled={selectedOrganizations.length === 0}
                >
                  Assign Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager; 