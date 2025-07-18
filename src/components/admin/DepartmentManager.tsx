import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  FolderTree, 
  ChevronRight,
  ChevronDown,
  Save
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { Department } from '../../types';
import { useDepartmentStore } from '../../stores/departmentStore';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';

const DepartmentManager: React.FC = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { 
    departments, 
    fetchDepartments, 
    createDepartment, 
    updateDepartment, 
    deleteDepartment, 
    isLoading, 
    error 
  } = useDepartmentStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentDepartmentId: ''
  });
  
  const [validationError, setValidationError] = useState<string | null>(null);
  
  useEffect(() => {
    if (user?.organizationId) {
      fetchDepartments(user.organizationId);
    }
  }, [user, fetchDepartments]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError(null);
  };
  
  const handleCreateDepartment = async () => {
    if (!formData.name.trim()) {
      setValidationError('Department name is required');
      return;
    }
    
    if (!user?.organizationId) {
      setValidationError('Organization ID is required');
      return;
    }
    
    try {
      await createDepartment({
        name: formData.name.trim(),
        description: formData.description.trim(),
        organizationId: user.organizationId,
        parentDepartmentId: formData.parentDepartmentId || undefined
      });
      
      setFormData({
        name: '',
        description: '',
        parentDepartmentId: ''
      });
      setShowAddForm(false);
    } catch (err) {
      setValidationError((err as Error).message || 'Failed to create department');
    }
  };
  
  const handleUpdateDepartment = async () => {
    if (!editingDepartment) return;
    
    if (!formData.name.trim()) {
      setValidationError('Department name is required');
      return;
    }
    
    try {
      await updateDepartment(editingDepartment.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        parentDepartmentId: formData.parentDepartmentId || undefined
      });
      
      setEditingDepartment(null);
      setFormData({
        name: '',
        description: '',
        parentDepartmentId: ''
      });
    } catch (err) {
      setValidationError((err as Error).message || 'Failed to update department');
    }
  };
  
  const handleDeleteDepartment = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the department "${name}"? This will not delete users in this department, but they will no longer be associated with it.`)) {
      try {
        await deleteDepartment(id);
      } catch (err) {
        console.error('Failed to delete department:', err);
        alert((err as Error).message || 'Failed to delete department');
      }
    }
  };
  
  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      parentDepartmentId: department.parentDepartmentId || ''
    });
    setValidationError(null);
  };
  
  const toggleDepartmentExpand = (departmentId: string) => {
    setExpandedDepartments(prev => 
      prev.includes(departmentId)
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId]
    );
  };
  
  // Build department hierarchy
  const buildDepartmentTree = () => {
    interface DepartmentNode extends Department {
    children: DepartmentNode[];
  }

  const departmentMap = new Map<string, DepartmentNode>();
    
    // Initialize with empty children arrays
    departments.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });
    
    // Build tree structure
    const rootDepartments: (Department & { children: Department[] })[] = [];
    
    departmentMap.forEach(dept => {
      if (dept.parentDepartmentId && departmentMap.has(dept.parentDepartmentId)) {
        departmentMap.get(dept.parentDepartmentId)?.children.push(dept);
      } else {
        rootDepartments.push(dept);
      }
    });
    
    return rootDepartments;
  };
  
  const renderDepartmentTree = (departments: DepartmentNode[], level = 0) => {
    return departments.map(dept => (
      <div key={dept.id} style={{ marginLeft: `${level * 20}px` }}>
        <div className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100">
          <div className="flex items-center">
            {dept.children.length > 0 ? (
              <button 
                onClick={() => toggleDepartmentExpand(dept.id)}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                {expandedDepartments.includes(dept.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-4 mr-2"></div>
            )}
            <Building2 className="h-5 w-5 text-gray-500 mr-2" />
            <div>
              <div className="font-medium text-gray-900">{dept.name}</div>
              {dept.description && (
                <div className="text-xs text-gray-500">{dept.description}</div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit3 className="h-4 w-4" />}
              onClick={() => handleEditDepartment(dept)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-error-600 hover:text-error-700 hover:bg-error-50"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => handleDeleteDepartment(dept.id, dept.name)}
            >
              Delete
            </Button>
          </div>
        </div>
        
        {expandedDepartments.includes(dept.id) && dept.children.length > 0 && (
          <div className="ml-4 pl-4 border-l border-gray-200">
            {renderDepartmentTree(dept.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };
  
  const departmentTree = buildDepartmentTree();
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Department Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Organize users into departments for {currentOrganization?.name}
          </p>
        </div>
        <Button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingDepartment(null);
            setFormData({
              name: '',
              description: '',
              parentDepartmentId: ''
            });
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {showAddForm ? 'Cancel' : 'Add Department'}
        </Button>
      </div>

      {/* Error Messages */}
      {(validationError || error) && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded relative">
          {validationError || error}
        </div>
      )}
      
      {/* Add/Edit Department Form */}
      {(showAddForm || editingDepartment) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingDepartment ? 'Edit Department' : 'Add New Department'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormInput
                label="Department Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                error={validationError && !formData.name.trim() ? 'Department name is required' : undefined}
              />
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Enter department description"
                />
              </div>
              
              <div>
                <label htmlFor="parentDepartmentId" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Department (Optional)
                </label>
                <select
                  id="parentDepartmentId"
                  name="parentDepartmentId"
                  value={formData.parentDepartmentId}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">None (Top-Level Department)</option>
                  {departments.map(dept => (
                    // Prevent circular references - don't allow setting parent to self or children
                    dept.id !== editingDepartment?.id && (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    )
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingDepartment(null);
                    setFormData({
                      name: '',
                      description: '',
                      parentDepartmentId: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingDepartment ? handleUpdateDepartment : handleCreateDepartment}
                  isLoading={isLoading}
                  leftIcon={editingDepartment ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                >
                  {editingDepartment ? 'Update Department' : 'Create Department'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Departments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FolderTree className="h-5 w-5 mr-2" />
            Department Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No departments</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first department.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {renderDepartmentTree(departmentTree)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepartmentManager;