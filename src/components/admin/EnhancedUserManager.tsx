import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Filter, 
  Search, 
  UserPlus,
  Building2,
  RefreshCw,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { User } from '../../types';
import { useUserStore } from '../../stores/userStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import ErrorHandler, { ErrorContext } from '../../lib/errorHandler';

interface EnhancedUserManagerProps {
  organizationId: string;
  onUserUpdate?: () => void;
}

interface BulkOperation {
  type: 'delete' | 'role_update' | 'department_update' | 'status_update';
  selectedUsers: string[];
  data?: Record<string, unknown>;
}

interface SortConfig {
  key: keyof User | 'department' | 'lastActive';
  direction: 'asc' | 'desc';
}

const EnhancedUserManager: React.FC<EnhancedUserManagerProps> = ({ 
  organizationId, 
  onUserUpdate 
}) => {
  const { user: currentUser } = useAuthStore();
  const { users, fetchUsers, createUser, updateUser, deleteUser, isLoading } = useUserStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const { addNotification: _addNotification } = useNotificationStore();

  // State management
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(null);

  // Filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee' as Role,
    departmentId: '',
    phone: '',
    jobTitle: '',
    location: '',
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    if (organizationId) {
      fetchUsers(organizationId);
      fetchDepartments(organizationId);
    }
  }, [organizationId, fetchUsers, fetchDepartments]);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply department filter
    if (departmentFilter) {
      filtered = filtered.filter(user => user.departmentId === departmentFilter);
    }

    // Apply role filter
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(user => {
        if (statusFilter === 'active') return !user.isInactive;
        if (statusFilter === 'inactive') return user.isInactive;
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: unknown = a[sortConfig.key as keyof User];
      let bValue: unknown = b[sortConfig.key as keyof User];

      // Handle department sorting
      if (sortConfig.key === 'department') {
        const aDept = departments.find(d => d.id === a.departmentId);
        const bDept = departments.find(d => d.id === b.departmentId);
        aValue = aDept?.name || '';
        bValue = bDept?.name || '';
      }

      // Handle last active sorting (using updatedAt as proxy)
      if (sortConfig.key === 'lastActive') {
        aValue = a.updatedAt;
        bValue = b.updatedAt;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, departmentFilter, roleFilter, statusFilter, sortConfig, departments]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  // Handle sorting
  const handleSort = (key: keyof User | 'department' | 'lastActive') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredAndSortedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredAndSortedUsers.map(user => user.id));
    }
  };

  // Create user
  const handleCreateUser = async () => {
    setValidationError(null);
    
    const validation = ErrorHandler.validateFormData(formData, 'createUser');
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setValidationError(firstError);
      return;
    }

    const context: ErrorContext = {
      operation: 'createUser',
      userRole: currentUser?.role,
      organizationId,
      additionalData: { userEmail: formData.email }
    };

    try {
      await createUser({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        organizationId,
        departmentId: formData.departmentId || undefined,
      });
      
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'employee',
        departmentId: '',
        phone: '',
        jobTitle: '',
        location: '',
      });
      setShowAddForm(false);
      
      ErrorHandler.handleSuccess(
        `${formData.firstName} ${formData.lastName} has been created successfully.`,
        context
      );

      onUserUpdate?.();
    } catch (err) {
      const errorMessage = ErrorHandler.handleError(err, context);
      setValidationError(errorMessage);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    setValidationError(null);
    
    const validation = ErrorHandler.validateFormData(formData, 'updateUser');
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setValidationError(firstError);
      return;
    }

    const context: ErrorContext = {
      operation: 'updateUser',
      userRole: currentUser?.role,
      organizationId,
      userId: editingUser.id,
      additionalData: { userEmail: formData.email }
    };

    try {
      await updateUser(editingUser.id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        departmentId: formData.departmentId || undefined,
      });
      
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'employee',
        departmentId: '',
        phone: '',
        jobTitle: '',
        location: '',
      });
      
      ErrorHandler.handleSuccess(
        `${formData.firstName} ${formData.lastName}'s information has been updated.`,
        context
      );

      onUserUpdate?.();
    } catch (err) {
      const errorMessage = ErrorHandler.handleError(err, context);
      setValidationError(errorMessage);
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      const context: ErrorContext = {
        operation: 'deleteUser',
        userRole: currentUser?.role,
        organizationId,
        userId: id,
        additionalData: { userName: name }
      };

      try {
        await deleteUser(id);
        
        ErrorHandler.handleSuccess(
          `${name} has been deleted successfully.`,
          context
        );

        onUserUpdate?.();
      } catch (err) {
        ErrorHandler.handleError(err, context);
      }
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (!bulkOperation || bulkOperation.type !== 'delete') return;
    
    const userNames = users
      .filter(user => bulkOperation.selectedUsers.includes(user.id))
      .map(user => `${user.firstName} ${user.lastName}`)
      .join(', ');

    if (window.confirm(`Are you sure you want to delete ${bulkOperation.selectedUsers.length} users: ${userNames}? This action cannot be undone.`)) {
      const context: ErrorContext = {
        operation: 'bulkDeleteUsers',
        userRole: currentUser?.role,
        organizationId,
        additionalData: { 
          userCount: bulkOperation.selectedUsers.length,
          userNames 
        }
      };

      try {
        await Promise.all(
          bulkOperation.selectedUsers.map(id => deleteUser(id))
        );
        
        setSelectedUsers([]);
        setBulkOperation(null);
        
        ErrorHandler.handleSuccess(
          `${bulkOperation.selectedUsers.length} users have been deleted successfully.`,
          context
        );

        onUserUpdate?.();
      } catch (err) {
        ErrorHandler.handleError(err, context);
      }
    }
  };

  const handleBulkRoleUpdate = async () => {
    if (!bulkOperation || bulkOperation.type !== 'role_update') return;
    
    const context: ErrorContext = {
      operation: 'bulkRoleUpdate',
      userRole: currentUser?.role,
      organizationId,
      additionalData: { 
        userCount: bulkOperation.selectedUsers.length,
        newRole: bulkOperation.data.role 
      }
    };

    try {
      await Promise.all(
        bulkOperation.selectedUsers.map(id => 
          updateUser(id, { role: bulkOperation.data.role! })
        )
      );
      
      setSelectedUsers([]);
      setBulkOperation(null);
      
      ErrorHandler.handleSuccess(
        `${bulkOperation.selectedUsers.length} users have been updated successfully.`,
        context
      );

      onUserUpdate?.();
    } catch (err) {
      ErrorHandler.handleError(err, context);
    }
  };

  const handleBulkDepartmentUpdate = async () => {
    if (!bulkOperation || bulkOperation.type !== 'department_update') return;
    
    const context: ErrorContext = {
      operation: 'bulkDepartmentUpdate',
      userRole: currentUser?.role,
      organizationId,
      additionalData: { 
        userCount: bulkOperation.selectedUsers.length,
        departmentId: bulkOperation.data.departmentId 
      }
    };

    try {
      await Promise.all(
        bulkOperation.selectedUsers.map(id => 
          updateUser(id, { departmentId: bulkOperation.data.departmentId })
        )
      );
      
      setSelectedUsers([]);
      setBulkOperation(null);
      
      ErrorHandler.handleSuccess(
        `${bulkOperation.selectedUsers.length} users have been moved successfully.`,
        context
      );

      onUserUpdate?.();
    } catch (err) {
      ErrorHandler.handleError(err, context);
    }
  };

  // Export users
  const handleExportUsers = () => {
    const csvContent = [
      ['First Name', 'Last Name', 'Email', 'Role', 'Department', 'Created Date'],
      ...filteredAndSortedUsers.map(user => [
        user.firstName,
        user.lastName,
        user.email,
        user.role,
        departments.find(d => d.id === user.departmentId)?.name || '',
        new Date(user.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${organizationId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get department name
  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return 'None';
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unknown';
  };

  // Available roles for organization admins
  const availableRoles = [
    { value: 'employee', label: 'Employee' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'org_admin', label: 'Organization Admin' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Enhanced User Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage users with advanced filtering, bulk operations, and department management
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleExportUsers}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add User
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Roles</option>
                {availableRoles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="bg-primary-50 border-primary-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-primary-800">
                  {selectedUsers.length} user(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOperation({ type: 'delete', selectedUsers })}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOperation({ type: 'role_update', selectedUsers, data: { role: 'employee' } })}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Update Role
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOperation({ type: 'department_update', selectedUsers, data: { departmentId: '' } })}
                  leftIcon={<Building2 className="h-4 w-4" />}
                >
                  Move Department
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUsers([])}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Operation Modals */}
      {bulkOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {bulkOperation.type === 'delete' && 'Confirm Bulk Delete'}
              {bulkOperation.type === 'role_update' && 'Update User Roles'}
              {bulkOperation.type === 'department_update' && 'Move Users to Department'}
            </h3>
            
            {bulkOperation.type === 'delete' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete {bulkOperation.selectedUsers.length} selected users? This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setBulkOperation(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="error"
                    onClick={handleBulkDelete}
                  >
                    Delete Users
                  </Button>
                </div>
              </div>
            )}
            
            {bulkOperation.type === 'role_update' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Role</label>
                  <select
                    value={bulkOperation.data.role}
                    onChange={(e) => setBulkOperation(prev => prev ? { ...prev, data: { ...prev.data, role: e.target.value as Role } } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    {availableRoles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setBulkOperation(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkRoleUpdate}
                  >
                    Update Roles
                  </Button>
                </div>
              </div>
            )}
            
            {bulkOperation.type === 'department_update' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Department</label>
                  <select
                    value={bulkOperation.data.departmentId}
                    onChange={(e) => setBulkOperation(prev => prev ? { ...prev, data: { ...prev.data, departmentId: e.target.value } } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">No Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setBulkOperation(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkDepartmentUpdate}
                  >
                    Move Users
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit User Form */}
      {(showAddForm || editingUser) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingUser ? 'Edit User' : 'Add New User'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                error={validationError && !formData.firstName.trim() ? 'First name is required' : undefined}
              />
              <FormInput
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                error={validationError && !formData.lastName.trim() ? 'Last name is required' : undefined}
              />
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                error={validationError && !formData.email.trim() ? 'Email is required' : undefined}
              />
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">No Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <FormInput
                label="Phone (Optional)"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
              <FormInput
                label="Job Title (Optional)"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
              />
              <FormInput
                label="Location (Optional)"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
              />
            </div>
            
            {validationError && (
              <div className="mt-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded">
                {validationError}
              </div>
            )}
            
            <div className="mt-6 flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingUser(null);
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    role: 'employee',
                    departmentId: '',
                    phone: '',
                    jobTitle: '',
                    location: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                isLoading={isLoading}
              >
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Users ({filteredAndSortedUsers.length})
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchUsers(organizationId)}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSortedUsers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || departmentFilter || roleFilter 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by adding the first user to this organization.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('firstName')}
                    >
                      <div className="flex items-center">
                        Name
                        {sortConfig.key === 'firstName' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email
                        {sortConfig.key === 'email' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center">
                        Role
                        {sortConfig.key === 'role' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('department')}
                    >
                      <div className="flex items-center">
                        Department
                        {sortConfig.key === 'department' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lastActive')}
                    >
                      <div className="flex items-center">
                        Last Active
                        {sortConfig.key === 'lastActive' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserSelect(user.id)}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-800">
                                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'org_admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'reviewer' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'org_admin' ? 'Org Admin' :
                           user.role === 'reviewer' ? 'Reviewer' :
                           'Employee'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getDepartmentName(user.departmentId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit3 className="h-4 w-4" />}
                            onClick={() => {
                              setEditingUser(user);
                              setFormData({
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                role: user.role,
                                departmentId: user.departmentId || '',
                                phone: '',
                                jobTitle: '',
                                location: '',
                              });
                              setShowAddForm(false);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error-600 hover:text-error-700 hover:bg-error-50"
                            leftIcon={<Trash2 className="h-4 w-4" />}
                            onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                          >
                            Delete
                          </Button>
                        </div>
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

export default EnhancedUserManager; 