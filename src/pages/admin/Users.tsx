import { useEffect, useState } from 'react';
import { PlusCircle, Pencil, Trash2, UserPlus, User, Users as UsersIcon, Shield, Settings, Building2, AlertTriangle, Upload, Download, X, Filter } from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';
import { Role, User as UserType } from '../../types';
import ImportExportManager from '../../components/admin/ImportExportManager';
import DepartmentManager from '../../components/admin/DepartmentManager';
import EnhancedUserManager from '../../components/admin/EnhancedUserManager';
import { useNotificationStore } from '../../stores/notificationStore';

const Users = () => {
  const { users, fetchUsers, createUser, updateUser, deleteUser, isLoading, error: userError } = useUserStore();
  const { organizations, currentOrganization, fetchOrganizations } = useOrganizationStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const { user: currentUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'import'>('users');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'org_admin' as Role,
    organizationId: currentOrganization?.id || '',
    departmentId: '',
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isOrgAdmin = currentUser?.role === 'org_admin';
  
  // Check permissions
  const hasUserManagementPermission = isSuperAdmin || (isOrgAdmin && currentOrganization?.orgAdminPermissions?.includes('manage_users'));
  
  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
      // For super admin, show organization-based view
      if (selectedOrganization) {
        fetchUsers(selectedOrganization);
        fetchDepartments(selectedOrganization);
      }
    } else if (isOrgAdmin && currentUser?.organizationId) {
      // Org admin can only see users in their organization
      fetchUsers(currentUser.organizationId);
      fetchDepartments(currentUser.organizationId);
      setFormData(prev => ({ ...prev, organizationId: currentUser.organizationId }));
    }
  }, [fetchOrganizations, fetchUsers, fetchDepartments, currentUser, isSuperAdmin, isOrgAdmin, selectedOrganization]);

  useEffect(() => {
    if (userError) {
      setValidationError(userError);
      const timer = setTimeout(() => setValidationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [userError]);
  
  // Filter users based on search term and filters
  useEffect(() => {
    let filtered = users;
    let activeFiltersList: string[] = [];
    
    // Hide root users from non-root users
    if (currentUser?.role !== 'root') {
      filtered = filtered.filter(user => user.role !== 'root');
    }
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (departmentFilter) {
      filtered = filtered.filter(user => user.departmentId === departmentFilter);
      activeFiltersList.push('Department');
    }
    
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
      activeFiltersList.push('Role');
    }
    
    setFilteredUsers(filtered);
    setActiveFilters(activeFiltersList);
  }, [users, searchTerm, departmentFilter, roleFilter, currentUser?.role]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError(null);
  };
  
  const handleCreateUser = async () => {
    setValidationError(null);
    
    if (!hasUserManagementPermission) {
      setValidationError('You do not have permission to create users');
      return;
    }
    
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.role) {
      setValidationError('All fields are required');
      return;
    }

    const organizationId = isOrgAdmin ? currentUser?.organizationId || '' : 
                          isSuperAdmin ? selectedOrganization : formData.organizationId;

    if (!organizationId) {
      setValidationError('Please select an organization');
      return;
    }

    try {
      await createUser({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        organizationId: organizationId,
        departmentId: formData.departmentId || undefined,
      });
      
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'org_admin',
        organizationId: organizationId,
        departmentId: '',
      });
      setShowAddForm(false);
      
      // Add success notification
      addNotification({
        title: 'User Created',
        message: `${formData.firstName} ${formData.lastName} has been created successfully.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to create user:', err);
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to create user: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };
  
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    setValidationError(null);
    
    if (!hasUserManagementPermission) {
      setValidationError('You do not have permission to update users');
      return;
    }
    
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.role) {
      setValidationError('All fields are required');
      return;
    }

    const organizationId = isOrgAdmin ? currentUser?.organizationId || '' : 
                          isSuperAdmin ? selectedOrganization : formData.organizationId;

    try {
      await updateUser(editingUser.id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        organizationId: organizationId,
        departmentId: formData.departmentId || undefined,
      });
      
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'org_admin',
        organizationId: organizationId,
        departmentId: '',
      });
      
      // Add success notification
      addNotification({
        title: 'User Updated',
        message: `${formData.firstName} ${formData.lastName}'s information has been updated.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to update user:', err);
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to update user: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };
  
  const handleDeleteUser = async (id: string, name: string) => {
    if (!hasUserManagementPermission) {
      setValidationError('You do not have permission to delete users');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        await deleteUser(id);
        
        // Add success notification
        addNotification({
          title: 'User Deleted',
          message: `${name} has been deleted successfully.`,
          type: 'info'
        });
      } catch (err) {
        console.error('Failed to delete user:', err);
        
        // Add error notification
        addNotification({
          title: 'Error',
          message: `Failed to delete user: ${(err as Error).message || 'Unknown error'}`,
          type: 'error'
        });
      }
    }
  };
  
  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      departmentId: user.departmentId || '',
    });
    setValidationError(null);
  };
  
  const cancelEdit = () => {
    setEditingUser(null);
    const organizationId = isOrgAdmin ? currentUser?.organizationId || '' : selectedOrganization || '';
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'org_admin',
      organizationId: organizationId,
      departmentId: '',
    });
    setValidationError(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'root':
        return <Shield className="h-6 w-6 text-red-600" />;
      case 'super_admin':
        return <Shield className="h-6 w-6 text-purple-600" />;
      case 'org_admin':
        return <Settings className="h-6 w-6 text-indigo-600" />;
      case 'subscriber':
        return <User className="h-6 w-6 text-accent-600" />;
      default:
        return <User className="h-6 w-6 text-primary-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'root':
        return 'System Administrator';
      case 'super_admin':
        return 'Super Admin';
      case 'org_admin':
        return 'Organization Admin';
      case 'subscriber':
        return 'Subscriber';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'root':
        return 'bg-red-100 text-red-800';
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'org_admin':
        return 'bg-indigo-100 text-indigo-800';
      case 'subscriber':
        return 'bg-accent-100 text-accent-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Available roles based on user's role
  const getAvailableRoles = () => {
    if (isSuperAdmin) {
      return [
        { value: 'org_admin', label: 'Organization Admin' },
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'subscriber', label: 'Subscriber' },
        { value: 'employee', label: 'Employee' },
        { value: 'reviewer', label: 'Reviewer' }
      ];
    } else if (isOrgAdmin) {
      return [
        { value: 'org_admin', label: 'Organization Admin' },
        { value: 'subscriber', label: 'Subscriber' },
        { value: 'employee', label: 'Employee' },
        { value: 'reviewer', label: 'Reviewer' }
      ];
    }
    return [];
  };

  const availableRoles = getAvailableRoles();

  const getSelectedOrganizationName = () => {
    if (selectedOrganization) {
      const org = organizations.find(o => o.id === selectedOrganization);
      return org?.name || 'Unknown Organization';
    }
    return null;
  };

  const isSystemUser = (userId: string) => {
    return ['1', '2', '7'].includes(userId);
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return 'None';
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unknown';
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    setRoleFilter('');
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin 
              ? 'Manage admin users by organization - select an organization to view and manage its users' 
              : 'Manage users in your organization'
            }
          </p>
        </div>
        <div className="flex space-x-2">
          {hasUserManagementPermission && (
            <>
              <Button
                variant="outline"
                onClick={() => setActiveTab('import')}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Import/Export
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab('departments')}
                leftIcon={<Building2 className="h-4 w-4" />}
              >
                Departments
              </Button>
              {activeTab === 'users' && (
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  {showAddForm ? 'Cancel' : 'Add User'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Permission Notice */}
      {!hasUserManagementPermission && isOrgAdmin && (
        <Card className="bg-warning-50 border-warning-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              <div>
                <h3 className="font-medium text-warning-800">Limited Access</h3>
                <p className="text-sm text-warning-700">
                  You don't have permission to manage users. Contact your Super Admin to grant user management permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Messages */}
      {validationError && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded relative">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          {validationError}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UsersIcon className="h-4 w-4 mr-1" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'departments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="h-4 w-4 mr-1" />
            Departments
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'import'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Upload className="h-4 w-4 mr-1" />
            Import/Export
          </button>
        </nav>
      </div>

      {/* Organization Selection for Super Admin */}
      {isSuperAdmin && activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Select Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose an organization to manage its users
                </label>
                <select
                  value={selectedOrganization}
                  onChange={(e) => {
                    setSelectedOrganization(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Select an organization...</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedOrganization && (
                <div className="p-3 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-700">
                    <strong>Selected:</strong> {getSelectedOrganizationName()}
                  </p>
                  <p className="text-xs text-primary-600 mt-1">
                    You can now view and manage users within this organization
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show message if no organization selected for super admin */}
      {isSuperAdmin && !selectedOrganization && activeTab === 'users' && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Organization</h3>
            <p className="text-gray-500 mb-4">
              Choose an organization from the dropdown above to view and manage its users.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
              <h4 className="font-medium text-gray-800 mb-2">SaaS Permission Model:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Super Admin, Organization Admin, Subscriber, Employee, and Reviewer roles</li>
                <li>• Organization-based user isolation</li>
                <li>• Granular permissions for org admins</li>
                <li>• Super admins control all organizations</li>
                <li>• Subscribers have limited access to features</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <>
          {/* Enhanced User Manager */}
          {(selectedOrganization || isOrgAdmin) && hasUserManagementPermission && (
            <EnhancedUserManager 
              organizationId={isOrgAdmin ? currentUser?.organizationId || '' : selectedOrganization}
              onUserUpdate={() => {
                // Refresh users after update
                if (isOrgAdmin && currentUser?.organizationId) {
                  fetchUsers(currentUser.organizationId);
                } else if (isSuperAdmin && selectedOrganization) {
                  fetchUsers(selectedOrganization);
                }
              }}
            />
          )}

          {/* Legacy Add/Edit User Form - Keep for backward compatibility */}
          {(showAddForm || editingUser) && (selectedOrganization || isOrgAdmin) && hasUserManagementPermission && (
            <Card>
              <CardHeader>
                <CardTitle>{editingUser ? 'Edit User' : 'Add New User'}</CardTitle>
                {isSuperAdmin && selectedOrganization && (
                  <p className="text-sm text-gray-600">
                    {editingUser ? 'Editing user in' : 'Adding user to'}: <strong>{getSelectedOrganizationName()}</strong>
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="">No Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={editingUser ? cancelEdit : () => {
                      setShowAddForm(false);
                      setValidationError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingUser ? handleUpdateUser : handleCreateUser}
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Users List */}
          {(selectedOrganization || isOrgAdmin) && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    Users ({filteredUsers.length})
                    {isSuperAdmin && selectedOrganization && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        in {getSelectedOrganizationName()}
                      </span>
                    )}
                  </CardTitle>
                  
                  {/* Search and Filter */}
                  <div className="flex space-x-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48 pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-40 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-40 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">All Roles</option>
                      {availableRoles.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Active Filters Indicator */}
                {activeFilters.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-600">
                        Filters Applied: {activeFilters.join(', ')}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      leftIcon={<X className="h-4 w-4" />}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-6">
                    <UsersIcon className="h-12 w-12 mx-auto text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {hasUserManagementPermission 
                        ? 'Get started by adding the first user to this organization.'
                        : 'This organization has no users yet.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => {
                          const isSystemUserAccount = isSystemUser(user.id);
                          
                          return (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0">
                                    {getRoleIcon(user.role)}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900 flex items-center">
                                      {user.firstName} {user.lastName}
                                      {isSystemUserAccount && (
                                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                          System
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{user.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                  {getRoleLabel(user.role)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{getDepartmentName(user.departmentId)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  {hasUserManagementPermission && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      leftIcon={<Pencil className="h-4 w-4" />}
                                      onClick={() => handleEditUser(user)}
                                      disabled={isSystemUserAccount}
                                    >
                                      Edit
                                    </Button>
                                  )}
                                  {/* Prevent deleting yourself and system users */}
                                  {user.id !== currentUser?.id && !isSystemUserAccount && hasUserManagementPermission && (
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      leftIcon={<Trash2 className="h-4 w-4" />}
                                      onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                                    >
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Users;