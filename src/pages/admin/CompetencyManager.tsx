import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  ClipboardList, 
  Search,
  AlertTriangle,
  CheckCircle,
  Filter,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useCompetencyStore } from '../../stores/competencyStore';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { Competency } from '../../types';

const CompetencyManager: React.FC = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { competencies, fetchCompetencies, createCompetency, updateCompetency, deleteCompetency, isLoading, error } = useCompetencyStore();
  const { addNotification } = useNotificationStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCompetencies, setFilteredCompetencies] = useState<Competency[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  
  // Check permissions
  const hasCreatePermission = isSuperAdmin || (isOrgAdmin && currentOrganization?.orgAdminPermissions?.includes('create_assessments'));
  
  useEffect(() => {
    if (user?.organizationId) {
      fetchCompetencies(user.organizationId);
    }
  }, [user, fetchCompetencies]);
  
  useEffect(() => {
    // Filter competencies based on search term
    if (searchTerm) {
      const filtered = competencies.filter(comp => 
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (comp.description && comp.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCompetencies(filtered);
    } else {
      setFilteredCompetencies(competencies);
    }
  }, [competencies, searchTerm]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError(null);
  };
  
  const handleCreateCompetency = async () => {
    if (!formData.name.trim()) {
      setValidationError('Competency name is required');
      return;
    }

    if (!hasCreatePermission) {
      setValidationError('You do not have permission to create competencies');
      return;
    }

    if (!user?.organizationId) {
      setValidationError('Organization ID is required');
      return;
    }

    try {
      setValidationError(null);
      await createCompetency({
        name: formData.name.trim(),
        description: formData.description.trim(),
        organizationId: user.organizationId
      });
      
      setFormData({ name: '', description: '' });
      setShowAddForm(false);
      
      // Add notification
      addNotification({
        title: 'Competency Created',
        message: `Competency "${formData.name.trim()}" has been created successfully.`,
        type: 'success'
      });
    } catch (err) {
      setValidationError((err as Error).message || 'Failed to create competency');
    }
  };
  
  const handleUpdateCompetency = async () => {
    if (!editingCompetency) return;
    
    if (!formData.name.trim()) {
      setValidationError('Competency name is required');
      return;
    }

    if (!hasCreatePermission) {
      setValidationError('You do not have permission to update competencies');
      return;
    }

    try {
      setValidationError(null);
      await updateCompetency(editingCompetency.id, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      
      setEditingCompetency(null);
      setFormData({ name: '', description: '' });
      
      // Add notification
      addNotification({
        title: 'Competency Updated',
        message: `Competency "${formData.name.trim()}" has been updated successfully.`,
        type: 'success'
      });
    } catch (err) {
      setValidationError((err as Error).message || 'Failed to update competency');
    }
  };
  
  const handleDeleteCompetency = async (id: string, name: string) => {
    if (!hasCreatePermission) {
      setValidationError('You do not have permission to delete competencies');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete the competency "${name}"? This will remove it from all associated questions.`)) {
      try {
        await deleteCompetency(id);
        
        // Add notification
        addNotification({
          title: 'Competency Deleted',
          message: `Competency "${name}" has been deleted successfully.`,
          type: 'info'
        });
      } catch (err) {
        console.error('Failed to delete competency:', err);
        setValidationError((err as Error).message || 'Failed to delete competency');
      }
    }
  };
  
  const handleEditCompetency = (competency: Competency) => {
    setEditingCompetency(competency);
    setFormData({
      name: competency.name,
      description: competency.description || ''
    });
    setValidationError(null);
  };
  
  const cancelEdit = () => {
    setEditingCompetency(null);
    setFormData({ name: '', description: '' });
    setValidationError(null);
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competency Framework</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage competencies for {currentOrganization?.name || 'your organization'}
          </p>
        </div>
        {hasCreatePermission && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {showAddForm ? 'Cancel' : 'Add Competency'}
          </Button>
        )}
      </div>

      {/* Permission Notice */}
      {!hasCreatePermission && isOrgAdmin && (
        <Card className="bg-warning-50 border-warning-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              <div>
                <h3 className="font-medium text-warning-800">Limited Access</h3>
                <p className="text-sm text-warning-700">
                  You don't have permission to manage competencies. Contact your Super Admin to grant assessment creation permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Error Messages */}
      {(validationError || error) && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded relative">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          {validationError || error}
        </div>
      )}
      
      {/* Add/Edit Competency Form */}
      {(showAddForm || editingCompetency) && hasCreatePermission && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCompetency ? 'Edit Competency' : 'Add New Competency'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormInput
                label="Competency Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter competency name"
                required
                error={validationError && !formData.name.trim() ? 'Competency name is required' : undefined}
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
                  placeholder="Enter competency description"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={editingCompetency ? cancelEdit : () => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingCompetency ? handleUpdateCompetency : handleCreateCompetency}
                  isLoading={isLoading}
                  disabled={!formData.name.trim() || isLoading}
                  leftIcon={editingCompetency ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                >
                  {editingCompetency ? 'Update Competency' : 'Create Competency'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search competencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Competencies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Competencies ({filteredCompetencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading competencies...</p>
            </div>
          ) : filteredCompetencies.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No competencies</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'No competencies match your search criteria' 
                  : hasCreatePermission 
                    ? 'Get started by creating your first competency' 
                    : 'No competencies have been created yet'
                }
              </p>
              {hasCreatePermission && !searchTerm && (
                <Button
                  className="mt-4"
                  onClick={() => setShowAddForm(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Add Competency
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompetencies.map(competency => (
                <div 
                  key={competency.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center">
                        <Tag className="h-4 w-4 text-primary-600 mr-2" />
                        {competency.name}
                      </h3>
                      {competency.description && (
                        <p className="mt-1 text-sm text-gray-500">{competency.description}</p>
                      )}
                    </div>
                    {hasCreatePermission && (
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCompetency(competency)}
                          leftIcon={<Edit3 className="h-4 w-4" />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error-600 hover:text-error-700 hover:bg-error-50"
                          onClick={() => handleDeleteCompetency(competency.id, competency.name)}
                          leftIcon={<Trash2 className="h-4 w-4" />}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Created: {new Date(competency.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Competency Framework Guide */}
      <Card className="bg-primary-50 border-primary-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="h-5 w-5 mr-2" />
            About Competency Frameworks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-primary-800">
            <p>
              A competency framework defines the knowledge, skills, and attributes needed for people within an organization. 
              Competencies are used to align assessment questions with specific skills or capabilities.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-medium text-primary-900 mb-2">Benefits</h3>
                <ul className="space-y-1 list-disc list-inside text-primary-700">
                  <li>Standardize assessment criteria across the organization</li>
                  <li>Track development in specific skill areas over time</li>
                  <li>Identify organization-wide strengths and gaps</li>
                  <li>Align feedback with strategic capabilities</li>
                  <li>Create targeted development plans</li>
                </ul>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-medium text-primary-900 mb-2">Best Practices</h3>
                <ul className="space-y-1 list-disc list-inside text-primary-700">
                  <li>Keep competency names clear and concise</li>
                  <li>Provide detailed descriptions for each competency</li>
                  <li>Limit the total number of competencies (8-12 is ideal)</li>
                  <li>Ensure competencies align with organizational values</li>
                  <li>Review and update competencies periodically</li>
                </ul>
              </div>
            </div>
            
            <p>
              Once you've defined your competencies, you can associate them with assessment questions in the Assessment Builder.
              This will enable competency-based reporting and analytics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetencyManager;