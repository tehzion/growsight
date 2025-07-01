import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Pencil, Trash2, Eye, ClipboardList, ArrowRight, CheckCircle, Shield, Lock, UserCheck } from 'lucide-react';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';

const Assessments = () => {
  const { assessments, fetchAssessments, createAssessment, deleteAssessment, isLoading, error: assessmentError } = useAssessmentStore();
  const { organizations, currentOrganization, fetchOrganizations } = useOrganizationStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  
  // Check permissions
  const hasCreatePermission = isSuperAdmin || (isOrgAdmin && currentOrganization?.orgAdminPermissions?.includes('create_assessments'));
  
  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
      fetchAssessments();
    } else if (isOrgAdmin && user?.organizationId) {
      fetchAssessments(user.organizationId);
    }
  }, [fetchAssessments, fetchOrganizations, user, isSuperAdmin, isOrgAdmin]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };
  
  const handleCreateAssessment = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!hasCreatePermission) {
      setError('You do not have permission to create assessments');
      return;
    }

    const organizationId = isOrgAdmin ? user?.organizationId || 'demo-org-1' : currentOrganization?.id || 'demo-org-1';
    const createdById = user?.id || 'demo-user-1';

    try {
      setError(null);
      const assessmentId = await createAssessment({
        title: formData.title.trim(),
        description: formData.description.trim(),
        organizationId: organizationId,
        createdById: createdById,
      });
      
      if (assessmentId) {
        setFormData({ title: '', description: '' });
        setShowAddForm(false);
        navigate(`/assessments/builder/${assessmentId}`);
      } else {
        setError('Failed to create assessment');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to create assessment');
    }
  };
  
  const handleDeleteAssessment = async (id: string, title: string, isDeletable: boolean) => {
    if (!isDeletable) {
      alert('This assessment cannot be deleted as it is a system preset created by Super Admin.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      try {
        await deleteAssessment(id);
      } catch (err) {
        console.error('Failed to delete assessment:', err);
        alert((err as Error).message || 'Failed to delete assessment');
      }
    }
  };

  // Separate preset and custom assessments
  const presetAssessments = assessments.filter(a => a.assessmentType === 'preset');
  const customAssessments = assessments.filter(a => a.assessmentType !== 'preset');
  
  const getAssessmentTypeIcon = (assessmentType?: string) => {
    return assessmentType === 'preset' ? (
      <Shield className="h-4 w-4 text-purple-600" />
    ) : (
      <ClipboardList className="h-4 w-4 text-primary-600" />
    );
  };

  const getAssessmentTypeBadge = (assessmentType?: string) => {
    return assessmentType === 'preset' ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <Shield className="h-3 w-3 mr-1" />
        System Preset
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Custom
      </span>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin 
              ? 'Manage assessments across all organizations' 
              : `Manage assessments for ${currentOrganization?.name || 'your organization'}`
            }
          </p>
        </div>
        <div className="flex space-x-2">
          {isOrgAdmin && (
            <Button
              onClick={() => navigate('/assessment-assignments')}
              variant="outline"
              leftIcon={<UserCheck className="h-4 w-4" />}
            >
              Manage Assignments
            </Button>
          )}
          {hasCreatePermission && (
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              leftIcon={<PlusCircle className="h-4 w-4" />}
            >
              {showAddForm ? 'Cancel' : 'Create Assessment'}
            </Button>
          )}
        </div>
      </div>

      {/* Permission Notice */}
      {!hasCreatePermission && isOrgAdmin && (
        <Card className="bg-warning-50 border-warning-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-warning-600" />
              <div>
                <h3 className="font-medium text-warning-800">Limited Access</h3>
                <p className="text-sm text-warning-700">
                  You can view and assign assessments, but cannot create new ones. Contact your Super Admin to grant assessment creation permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Create Assessment Form */}
      {showAddForm && hasCreatePermission && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {(error || assessmentError) && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
                {error || assessmentError}
              </div>
            )}
            
            <div className="space-y-4">
              <FormInput
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter assessment title"
                required
              />
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Enter assessment description"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ title: '', description: '' });
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAssessment}
                  isLoading={isLoading}
                  disabled={!formData.title.trim() || isLoading}
                >
                  Create & Continue to Builder
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Preset Assessments */}
      {presetAssessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              System Preset Assessments ({presetAssessments.length})
            </CardTitle>
            <p className="text-sm text-gray-600">
              These assessments are created by Super Admin and available to all organizations
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {presetAssessments.map((assessment) => {
                const isPublished = assessment.assignedOrganizations && assessment.assignedOrganizations.length > 0;
                const organizationName = organizations.find(org => org.id === assessment.organizationId)?.name || 'System';
                
                return (
                  <Card key={assessment.id} className="hover:shadow-card-hover transition-shadow border-purple-200">
                    <CardContent className="p-6">
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{assessment.title}</h3>
                          <div className="flex items-center space-x-2">
                            {getAssessmentTypeBadge(assessment.assessmentType)}
                            {!assessment.isDeletable && (
                              <Lock className="h-4 w-4 text-gray-400\" title="Cannot be deleted" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-2">
                          {isSuperAdmin && `${organizationName} • `}
                          {isPublished ? `Published to ${assessment.assignedOrganizations?.length} org(s)` : 'Available to all organizations'}
                        </p>
                        
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {assessment.description || 'No description provided.'}
                        </p>
                        
                        <div className="text-sm text-gray-500 mb-4">
                          <div>Sections: {assessment.sections?.length || 0}</div>
                          <div>Questions: {assessment.sections?.reduce((acc, section) => acc + (section.questions?.length || 0), 0) || 0}</div>
                          <div>Created: {new Date(assessment.createdAt).toLocaleDateString()}</div>
                        </div>
                        
                        <div className="mt-auto pt-4 flex justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="h-4 w-4" />}
                            onClick={() => navigate(`/assessments/builder/${assessment.id}`)}
                          >
                            View
                          </Button>
                          {isOrgAdmin ? (
                            <Button
                              variant="primary"
                              size="sm"
                              rightIcon={<UserCheck className="h-4 w-4" />}
                              onClick={() => navigate('/assessment-assignments')}
                            >
                              Assign
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              rightIcon={<ArrowRight className="h-4 w-4" />}
                              onClick={() => navigate(`/assessments/builder/${assessment.id}`)}
                            >
                              Manage
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Custom Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-primary-600" />
            {isSuperAdmin ? 'All Custom Assessments' : 'Your Organization\'s Assessments'} ({customAssessments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customAssessments.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardList className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No custom assessments</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasCreatePermission 
                  ? 'Get started by creating your first assessment.'
                  : 'No custom assessments have been created yet.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {customAssessments.map((assessment) => {
                const isPublished = assessment.assignedOrganizations && assessment.assignedOrganizations.length > 0;
                const organizationName = organizations.find(org => org.id === assessment.organizationId)?.name || 'Unknown Organization';
                
                return (
                  <Card key={assessment.id} className="hover:shadow-card-hover transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{assessment.title}</h3>
                          <div className="flex items-center space-x-2">
                            {isPublished && (
                              <CheckCircle className="h-5 w-5 text-success-500" />
                            )}
                            {assessment.isDeletable && hasCreatePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-error-500"
                                onClick={() => handleDeleteAssessment(assessment.id, assessment.title, assessment.isDeletable || false)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-2">
                          {isSuperAdmin && `${organizationName} • `}
                          {isPublished ? 'Published' : 'Draft'}
                        </p>
                        
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {assessment.description || 'No description provided.'}
                        </p>
                        
                        <div className="text-sm text-gray-500 mb-4">
                          <div>Sections: {assessment.sections?.length || 0}</div>
                          <div>Questions: {assessment.sections?.reduce((acc, section) => acc + (section.questions?.length || 0), 0) || 0}</div>
                          <div>Created: {new Date(assessment.createdAt).toLocaleDateString()}</div>
                          {isPublished && (
                            <div className="text-success-600 font-medium">
                              Published to {assessment.assignedOrganizations?.length} organization{assessment.assignedOrganizations?.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-auto pt-4 flex justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={hasCreatePermission ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            onClick={() => navigate(`/assessments/builder/${assessment.id}`)}
                          >
                            {hasCreatePermission ? 'Edit' : 'View'}
                          </Button>
                          {isOrgAdmin ? (
                            <Button
                              variant="primary"
                              size="sm"
                              rightIcon={<UserCheck className="h-4 w-4" />}
                              onClick={() => navigate('/assessment-assignments')}
                            >
                              Assign
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              rightIcon={<ArrowRight className="h-4 w-4" />}
                              onClick={() => navigate(`/assessments/builder/${assessment.id}`)}
                            >
                              Manage
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Assessments;