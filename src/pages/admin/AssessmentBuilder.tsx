import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, PlusCircle, ArrowLeft, Building2, Trash2, Edit3, CheckCircle, Shield, Lock } from 'lucide-react';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';
import OrganizationSelector from '../../components/assessments/OrganizationSelector';
import QuestionBuilder from '../../components/assessments/QuestionBuilder';
import { QuestionType } from '../../types';

const AssessmentBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentAssessment, 
    fetchAssessment,
    updateAssessment,
    addSection,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    assignOrganizations,
    isLoading,
    error: assessmentError 
  } = useAssessmentStore();
  
  const { organizations, fetchOrganizations } = useOrganizationStore();
  
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const isPresetAssessment = currentAssessment?.assessmentType === 'preset';
  const canEdit = isSuperAdmin || (isOrgAdmin && !isPresetAssessment);
  
  useEffect(() => {
    if (id) {
      fetchAssessment(id);
      if (isSuperAdmin) {
        fetchOrganizations();
      }
    }
  }, [id, fetchAssessment, fetchOrganizations, isSuperAdmin]);
  
  useEffect(() => {
    if (currentAssessment?.assignedOrganizations) {
      setSelectedOrganizations(
        currentAssessment.assignedOrganizations.map(org => org.id)
      );
      setIsPublished(currentAssessment.assignedOrganizations.length > 0);
    }
  }, [currentAssessment?.assignedOrganizations]);
  
  const handleAddSection = async () => {
    if (!id || !newSectionTitle.trim()) {
      setError('Section title is required');
      return;
    }

    if (!canEdit) {
      setError('You do not have permission to edit this assessment');
      return;
    }
    
    try {
      setError(null);
      await addSection(id, {
        title: newSectionTitle.trim(),
        description: newSectionDescription.trim(),
        order: (currentAssessment?.sections.length || 0) + 1
      });
      
      setNewSectionTitle('');
      setNewSectionDescription('');
    } catch (err) {
      setError((err as Error).message || 'Failed to add section');
    }
  };

  const handleAddQuestion = async (sectionId: string) => {
    if (!id) return;

    if (!canEdit) {
      setError('You do not have permission to edit this assessment');
      return;
    }
    
    try {
      setError(null);
      const section = currentAssessment?.sections.find(s => s.id === sectionId);
      await addQuestion(id, sectionId, {
        text: 'New Question',
        order: (section?.questions.length || 0) + 1,
        questionType: 'rating' as QuestionType,
        scaleMax: 5,
        isRequired: true
      });
    } catch (err) {
      setError((err as Error).message || 'Failed to add question');
    }
  };

  const handleUpdateQuestion = async (sectionId: string, questionId: string, data: any) => {
    if (!id) return;

    if (!canEdit) {
      setError('You do not have permission to edit this assessment');
      return;
    }
    
    try {
      setError(null);
      await updateQuestion(id, sectionId, questionId, data);
    } catch (err) {
      setError((err as Error).message || 'Failed to update question');
    }
  };

  const handleDeleteQuestion = async (sectionId: string, questionId: string) => {
    if (!id || !window.confirm('Are you sure you want to delete this question?')) return;

    if (!canEdit) {
      setError('You do not have permission to edit this assessment');
      return;
    }
    
    try {
      setError(null);
      await deleteQuestion(id, sectionId, questionId);
    } catch (err) {
      setError((err as Error).message || 'Failed to delete question');
    }
  };

  const handlePublish = async () => {
    if (!id || selectedOrganizations.length === 0) {
      setError('Please select at least one organization before publishing');
      return;
    }

    if (!isSuperAdmin) {
      setError('Only Super Admin can publish assessments to organizations');
      return;
    }

    try {
      setError(null);
      await assignOrganizations(id, selectedOrganizations);
      setIsPublished(true);
      alert('Assessment published successfully! It will now appear in the "My Assessments" section for users in the selected organizations.');
    } catch (err) {
      setError((err as Error).message || 'Failed to publish assessment');
    }
  };
  
  if (!currentAssessment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate('/assessments')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Assessment Builder</h1>
              {isPresetAssessment && (
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                    System Preset
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center mt-1">
              {isPublished ? (
                <div className="flex items-center text-sm text-success-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Published to {selectedOrganizations.length} organization{selectedOrganizations.length > 1 ? 's' : ''}
                </div>
              ) : (
                <span className="text-sm text-gray-500">Draft - Not yet published</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          {isSuperAdmin && (
            <Button
              onClick={handlePublish}
              variant={isPublished ? "success" : "primary"}
              leftIcon={isPublished ? <CheckCircle className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              disabled={selectedOrganizations.length === 0 || isLoading}
            >
              {isPublished ? 'Published' : 'Publish'}
            </Button>
          )}
          {canEdit && (
            <Button
              onClick={() => updateAssessment(id!, {
                title: currentAssessment.title,
                description: currentAssessment.description
              })}
              isLoading={isLoading}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Changes
            </Button>
          )}
          {!canEdit && (
            <div className="flex items-center text-sm text-gray-500">
              <Lock className="h-4 w-4 mr-1" />
              Read-only
            </div>
          )}
        </div>
      </div>

      {(error || assessmentError) && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded relative">
          {error || assessmentError}
        </div>
      )}

      {/* Permission Notice */}
      {!canEdit && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="font-medium text-amber-800">Read-Only Access</h3>
                <p className="text-sm text-amber-700">
                  {isPresetAssessment 
                    ? 'This is a system preset assessment that can only be modified by Super Admin.'
                    : 'You can only view this assessment. Contact your administrator for edit permissions.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Organization Assignment - Only for Super Admin */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Organization Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationSelector
              organizations={organizations}
              selectedIds={selectedOrganizations}
              onChange={setSelectedOrganizations}
              disabled={!isSuperAdmin}
            />
            {selectedOrganizations.length > 0 && (
              <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-700">
                  <strong>Publishing this assessment will:</strong>
                </p>
                <ul className="text-sm text-primary-600 mt-1 list-disc list-inside">
                  <li>Make it available to all users in the selected organizations</li>
                  <li>Show it in their "My Assessments" section</li>
                  <li>Allow employees and reviewers to complete the assessment</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assessment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FormInput
              label="Title"
              value={currentAssessment.title}
              onChange={(e) => canEdit && updateAssessment(id!, { title: e.target.value })}
              disabled={!canEdit}
            />
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={currentAssessment.description || ''}
                onChange={(e) => canEdit && updateAssessment(id!, { description: e.target.value })}
                disabled={!canEdit}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                  !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections and Questions */}
      {currentAssessment.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && (
              <p className="text-sm text-gray-600">{section.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {section.questions.map((question) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <QuestionBuilder
                        questionText={question.text}
                        questionType={question.questionType}
                        isRequired={question.isRequired}
                        scaleMax={question.scaleMax}
                        options={question.options}
                        competencyIds={question.competencyIds}
                        organizationId={currentAssessment.organizationId}
                        onUpdate={(data) => canEdit && handleUpdateQuestion(section.id, question.id, data)}
                      />
                    </div>
                    {canEdit && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteQuestion(section.id, question.id)}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {canEdit && (
                <div className="flex justify-center pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => handleAddQuestion(section.id)}
                    variant="outline"
                    leftIcon={<PlusCircle className="h-4 w-4" />}
                  >
                    Add Question
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Add Section Form - Only for editable assessments */}
      {canEdit && (
        <Card className="border border-dashed border-gray-300">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Section</h3>
            <div className="space-y-4">
              <FormInput
                label="Section Title"
                placeholder="Enter section title"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
              />
              <div>
                <label htmlFor="new-section-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Section Description
                </label>
                <textarea
                  id="new-section-description"
                  rows={2}
                  value={newSectionDescription}
                  onChange={(e) => setNewSectionDescription(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Enter section description"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleAddSection}
                  isLoading={isLoading}
                  disabled={!newSectionTitle.trim() || isLoading}
                  leftIcon={<PlusCircle className="h-4 w-4" />}
                >
                  Add Section
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssessmentBuilder;