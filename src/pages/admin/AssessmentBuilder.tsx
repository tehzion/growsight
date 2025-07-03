import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  PlusCircle, 
  ArrowLeft, 
  Building2, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Shield, 
  Lock,
  FileText,
  Users,
  Settings,
  Eye,
  EyeOff,
  AlertCircle,
  Info
} from 'lucide-react';
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
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDescription, setAssessmentDescription] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPreview, setShowPreview] = useState(false);

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

  useEffect(() => {
    if (currentAssessment) {
      setAssessmentTitle(currentAssessment.title);
      setAssessmentDescription(currentAssessment.description || '');
    }
  }, [currentAssessment]);

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

  const handleSaveAssessment = async () => {
    if (!id || !canEdit) return;

    setSaveStatus('saving');
    try {
      await updateAssessment(id, {
        title: assessmentTitle,
        description: assessmentDescription
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setError((err as Error).message || 'Failed to save assessment');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!currentAssessment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment Not Found</h3>
          <p className="text-gray-600 mb-4">The assessment you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/assessments')}>
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/assessments')}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Assessment Builder</h1>
                  <p className="text-gray-600">Create and configure your assessment</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {isPresetAssessment && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Preset Assessment</span>
                  </div>
                )}
                
                {!canEdit && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full">
                    <Lock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Read Only</span>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  leftIcon={showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                >
                  {showPreview ? 'Hide Preview' : 'Preview'}
                </Button>
                
                {canEdit && (
                  <Button
                    onClick={handleSaveAssessment}
                    isLoading={saveStatus === 'saving'}
                    leftIcon={<Save className="h-4 w-4" />}
                    className={saveStatus === 'saved' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {saveStatus === 'saved' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      'Save Assessment'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assessment Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assessment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Assessment Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormInput
                  label="Assessment Title"
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  placeholder="Enter assessment title"
                  disabled={!canEdit}
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={assessmentDescription}
                    onChange={(e) => setAssessmentDescription(e.target.value)}
                    placeholder="Enter assessment description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={!canEdit}
                  />
                </div>

                {assessmentError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <span className="text-sm text-red-800">{assessmentError}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sections */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Assessment Sections</h2>
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={handleAddSection}
                    leftIcon={<PlusCircle className="h-4 w-4" />}
                  >
                    Add Section
                  </Button>
                )}
              </div>

              {currentAssessment.sections.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Sections Yet</h3>
                    <p className="text-gray-600 mb-4">Start building your assessment by adding sections and questions.</p>
                    {canEdit && (
                      <Button onClick={handleAddSection} leftIcon={<PlusCircle className="h-4 w-4" />}>
                        Add First Section
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                currentAssessment.sections.map((section, sectionIndex) => (
                  <Card key={section.id} className="border-2 border-gray-200 hover:border-primary-300 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                            {sectionIndex + 1}
                          </div>
                          <span>{section.title}</span>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddQuestion(section.id)}
                            leftIcon={<PlusCircle className="h-4 w-4" />}
                          >
                            Add Question
                          </Button>
                        )}
                      </CardTitle>
                      {section.description && (
                        <p className="text-gray-600 text-sm mt-2">{section.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {section.questions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Info className="h-8 w-8 mx-auto mb-2" />
                          <p>No questions in this section yet.</p>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddQuestion(section.id)}
                              className="mt-2"
                            >
                              Add Question
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {section.questions.map((question, questionIndex) => (
                            <div key={question.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <QuestionBuilder
                                questionText={question.text}
                                questionType={question.questionType}
                                isRequired={question.isRequired}
                                scaleMax={question.scaleMax}
                                options={question.options}
                                competencyIds={question.competencyIds}
                                organizationId={currentAssessment.organizationId}
                                onUpdate={(data) => handleUpdateQuestion(section.id, question.id, data)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Add Section Form */}
            {canEdit && (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="py-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Section</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Section Title"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="Enter section title"
                    />
                    <FormInput
                      label="Section Description"
                      value={newSectionDescription}
                      onChange={(e) => setNewSectionDescription(e.target.value)}
                      placeholder="Enter section description (optional)"
                    />
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={handleAddSection}
                      disabled={!newSectionTitle.trim()}
                      leftIcon={<PlusCircle className="h-4 w-4" />}
                    >
                      Add Section
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Organization Assignment */}
            {isSuperAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Organization Assignment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrganizationSelector
                    organizations={organizations}
                    selectedOrganizations={selectedOrganizations}
                    onSelectionChange={setSelectedOrganizations}
                  />
                  
                  <div className="mt-4 space-y-3">
                    <Button
                      onClick={handlePublish}
                      disabled={selectedOrganizations.length === 0}
                      className="w-full"
                      leftIcon={<Users className="h-4 w-4" />}
                    >
                      {isPublished ? 'Update Assignment' : 'Publish Assessment'}
                    </Button>
                    
                    {isPublished && (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Published to {selectedOrganizations.length} organization{selectedOrganizations.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assessment Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Assessment Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentAssessment.sections.length}
                    </div>
                    <div className="text-sm text-blue-800">Sections</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {currentAssessment.sections.reduce((total, section) => total + section.questions.length, 0)}
                    </div>
                    <div className="text-sm text-green-800">Questions</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Assessment Type:</span>
                    <span className="font-medium capitalize">{currentAssessment.assessmentType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created:</span>
                    <span className="font-medium">
                      {new Date(currentAssessment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated:</span>
                    <span className="font-medium">
                      {new Date(currentAssessment.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentBuilder;