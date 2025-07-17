import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Pencil, Trash2, Building2, Users, CheckCircle, AlertTriangle, Shield, Settings, RefreshCw, Eye, Upload, Download, X, Filter, Search } from 'lucide-react';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';
import { OrgAdminPermission } from '../../types';
import ImportExportManager from '../../components/admin/ImportExportManager';
import { useNotificationStore } from '../../stores/notificationStore';
import OrganizationUsersDisplay from '../../components/admin/OrganizationUsersDisplay';

const Organizations = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { organizations, fetchOrganizations, createOrganization, updateOrganization, updateOrganizationStatus, setOrganizationPeriod, reactivateOrganization, deleteOrganization, updateOrgAdminPermissions, fetchOrganizationStatusLog, isLoading, error } = useOrganizationStore();
  const { users, fetchUsers } = useUserStore();
  const { addNotification } = useNotificationStore();
  
  const [newOrgName, setNewOrgName] = useState('');
  const [editingOrg, setEditingOrg] = useState<{id: string, name: string} | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<{id: string, permissions: OrgAdminPermission[]} | null>(null);
  const [editingStatus, setEditingStatus] = useState<{id: string, status: 'active' | 'inactive' | 'suspended', reason?: string} | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<{id: string, startDate: string, endDate: string, autoTransition: boolean, graceDays: number} | null>(null);
  const [statusLog, setStatusLog] = useState<any[]>([]);
  const [showStatusLog, setShowStatusLog] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'organizations' | 'import'>('organizations');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOrganizations, setFilteredOrganizations] = useState(organizations);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'past'>('active'); // New state for status filter
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null); // New state for selected organization
  
  // Check if user is super admin
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
      fetchUsers(); // Fetch all users initially
    }
  }, [fetchOrganizations, fetchUsers, isSuperAdmin]);

  useEffect(() => {
    if (selectedOrgId) {
      // Optionally, refetch users specifically for the selected organization if needed
      // fetchUsers(selectedOrgId);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      setValidationError(error);
      const timer = setTimeout(() => setValidationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // Filter organizations based on search term and status
  useEffect(() => {
    let filtered = organizations;
    const activeFiltersList: string[] = [];
    
    if (searchTerm) {
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      activeFiltersList.push('Name');
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(org => org.status === 'active' || !org.status); // Consider null/undefined status as active
      activeFiltersList.push('Active');
    } else if (statusFilter === 'past') {
      filtered = filtered.filter(org => org.status === 'inactive' || org.status === 'suspended');
      activeFiltersList.push('Past');
    }
    
    setFilteredOrganizations(filtered);
    setActiveFilters(activeFiltersList);
  }, [organizations, searchTerm, statusFilter]);

  const handleRefresh = async () => {
    if (!isSuperAdmin) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        fetchOrganizations(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleCreateOrganization = async () => {
    setValidationError(null);
    
    if (!newOrgName.trim()) {
      setValidationError('Organization name is required');
      return;
    }

    if (!isSuperAdmin) {
      setValidationError('Only Super Admins can create organizations');
      return;
    }

    try {
      await createOrganization(newOrgName.trim());
      setNewOrgName('');
      setSuccessMessage(`Organization "${newOrgName.trim()}" created successfully!`);
      
      // Add notification
      addNotification({
        title: 'Organization Created',
        message: `Organization "${newOrgName.trim()}" has been created successfully.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to create organization:', err);
      setValidationError((err as Error).message || 'Failed to create organization');
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to create organization: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };
  
  const handleUpdateOrganization = async () => {
    if (!editingOrg || !editingOrg.name.trim()) {
      setValidationError('Organization name is required');
      return;
    }

    if (!isSuperAdmin) {
      setValidationError('Only Super Admins can update organizations');
      return;
    }

    try {
      await updateOrganization(editingOrg.id, editingOrg.name.trim());
      setSuccessMessage(`Organization updated successfully!`);
      setEditingOrg(null);
      
      // Add notification
      addNotification({
        title: 'Organization Updated',
        message: `Organization "${editingOrg.name.trim()}" has been updated successfully.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to update organization:', err);
      setValidationError((err as Error).message || 'Failed to update organization');
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to update organization: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };
  
  const handleDeleteOrganization = async (id: string, name: string) => {
    if (!isSuperAdmin) {
      setValidationError('Only Super Admins can delete organizations');
      return;
    }

    const userCount = users.filter(u => u.organizationId === id).length;
    
    if (userCount > 0) {
      if (!window.confirm(`This organization has ${userCount} user(s). Deleting it will also remove all associated users. Are you sure you want to continue?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        return;
      }
    }
    
    try {
      await deleteOrganization(id);
      setSuccessMessage(`Organization "${name}" deleted successfully!`);
      
      // Add notification
      addNotification({
        title: 'Organization Deleted',
        message: `Organization "${name}" has been deleted successfully.`,
        type: 'info'
      });
    } catch (err) {
      console.error('Failed to delete organization:', err);
      setValidationError((err as Error).message || 'Failed to delete organization');
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to delete organization: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingPermissions) return;

    if (!isSuperAdmin) {
      setValidationError('Only Super Admins can update permissions');
      return;
    }

    try {
      await updateOrgAdminPermissions(editingPermissions.id, editingPermissions.permissions);
      setSuccessMessage('Organization admin permissions updated successfully!');
      setEditingPermissions(null);
      
      // Add notification
      addNotification({
        title: 'Permissions Updated',
        message: 'Organization admin permissions have been updated successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to update permissions:', err);
      setValidationError((err as Error).message || 'Failed to update permissions');
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to update permissions: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStatus) return;

    if (!isSuperAdmin) {
      setValidationError('Only Super Admins can update organization status');
      return;
    }

    try {
      await updateOrganizationStatus(editingStatus.id, editingStatus.status, editingStatus.reason);
      setSuccessMessage(`Organization status updated to ${editingStatus.status} successfully!`);
      setEditingStatus(null);
      
      // Add notification
      addNotification({
        title: 'Status Updated',
        message: `Organization status has been updated to ${editingStatus.status}.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to update organization status:', err);
      setValidationError((err as Error).message || 'Failed to update organization status');
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to update organization status: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleSetPeriod = async () => {
    if (!editingPeriod) return;

    if (!isSuperAdmin) {
      setValidationError('Only Super Admins can set organization periods');
      return;
    }

    try {
      await setOrganizationPeriod(
        editingPeriod.id,
        editingPeriod.startDate,
        editingPeriod.endDate,
        editingPeriod.autoTransition,
        editingPeriod.graceDays
      );
      setSuccessMessage('Organization period set successfully!');
      setEditingPeriod(null);
      
      // Add notification
      addNotification({
        title: 'Period Set',
        message: 'Organization period has been set successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to set organization period:', err);
      setValidationError((err as Error).message || 'Failed to set organization period');
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to set organization period: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleReactivate = async (orgId: string) => {
    if (!isSuperAdmin) {
      setValidationError('Only Super Admins can reactivate organizations');
      return;
    }

    try {
      await reactivateOrganization(orgId);
      setSuccessMessage('Organization reactivated successfully!');
      
      // Add notification
      addNotification({
        title: 'Organization Reactivated',
        message: 'Organization has been reactivated and is now active.',
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to reactivate organization:', err);
      setValidationError((err as Error).message || 'Failed to reactivate organization');
      
      // Add error notification
      addNotification({
        title: 'Error',
        message: `Failed to reactivate organization: ${(err as Error).message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleShowStatusLog = async (orgId: string) => {
    try {
      const log = await fetchOrganizationStatusLog(orgId);
      setStatusLog(log);
      setShowStatusLog(orgId);
    } catch (error) {
      console.error('Failed to fetch status log:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to load status history.',
        type: 'error'
      });
    }
  };

  const getOrganizationStats = (orgId: string) => {
    const orgUsers = users.filter(u => u.organizationId === orgId);
    return {
      totalUsers: orgUsers.length,
      employees: orgUsers.filter(u => u.role === 'employee').length,
      reviewers: orgUsers.filter(u => u.role === 'reviewer').length,
      admins: orgUsers.filter(u => u.role === 'org_admin').length,
      subscribers: orgUsers.filter(u => u.role === 'subscriber').length
    };
  };

  const isExpiredOrganization = (org: any) => {
    return org.periodEndDate && new Date(org.periodEndDate) < new Date();
  };

  const availablePermissions: { key: OrgAdminPermission; label: string; description: string }[] = [
    { key: 'create_assessments', label: 'Create Assessments', description: 'Allow creating new custom assessments' },
    { key: 'manage_users', label: 'Manage Users', description: 'Add, edit, and remove users in organization' },
    { key: 'view_results', label: 'View Results', description: 'Access organization analytics and metrics' },
    { key: 'assign_assessments', label: 'Assign Assessments', description: 'Create assessment assignments for employees' },
    { key: 'manage_relationships', label: 'Manage Relationships', description: 'Define user relationships for targeted feedback' }
  ];

  const getPermissionLabel = (permission: OrgAdminPermission) => {
    const perm = availablePermissions.find(p => p.key === permission);
    return perm?.label || permission;
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
  };

  // Permission check for non-super admins
  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">Organization management</p>
        </div>

        <Card className="bg-warning-50 border-warning-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-warning-600 mb-4" />
            <h3 className="text-lg font-medium text-warning-800 mb-2">Access Restricted</h3>
            <p className="text-warning-700">
              Only Super Administrators can manage organizations. Contact your system administrator if you need access to organization management features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage organizations and their admin permissions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab(activeTab === 'organizations' ? 'import' : 'organizations')}
            leftIcon={activeTab === 'organizations' ? <Upload className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
          >
            {activeTab === 'organizations' ? 'Import/Export' : 'Organizations'}
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <div className="text-sm text-gray-500">
            {organizations.length} organization{organizations.length !== 1 ? 's' : ''} total
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {validationError && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded relative">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          {validationError}
        </div>
      )}

      {/* Success Messages */}
      {successMessage && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded relative flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          {successMessage}
        </div>
      )}
      
      {/* Import/Export Tab */}
      {activeTab === 'import' && (
        <ImportExportManager onImportComplete={() => setActiveTab('organizations')} />
      )}
      
      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <>
          {/* Create Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Add New Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <FormInput
                    label="Organization Name"
                    value={newOrgName}
                    onChange={(e) => {
                      setNewOrgName(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Enter organization name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newOrgName.trim()) {
                        handleCreateOrganization();
                      }
                    }}
                    error={validationError && !newOrgName.trim() ? 'Organization name is required' : undefined}
                  />
                </div>
                <Button
                  onClick={handleCreateOrganization}
                  isLoading={isLoading}
                  disabled={!newOrgName.trim() || isLoading}
                  leftIcon={<PlusCircle className="h-4 w-4" />}
                  className="mb-4"
                >
                  Create Organization
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Search and Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Search organizations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                {/* Status Filter Tabs */}
                <div className="flex space-x-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === 'past' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('past')}
                  >
                    Past
                  </Button>
                </div>
              </div>
                
              {/* Active Filters Indicator */}
              {activeFilters.length > 0 && (
                <div className="flex items-center mt-2">
                  <Filter className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">
                    Filters Applied: {activeFilters.join(', ')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    leftIcon={<X className="h-4 w-4" />}
                    className="ml-2"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Organizations List */}
          <Card>
            <CardHeader>
              <CardTitle>Organizations ({filteredOrganizations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredOrganizations.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations</h3>
                  <p className="text-gray-500 mb-4">Get started by creating your first organization.</p>
                  <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                    <h4 className="font-medium text-gray-800 mb-2">What you can do with organizations:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Manage separate teams or departments</li>
                      <li>• Control access to assessments</li>
                      <li>• Organize users by business unit</li>
                      <li>• Set custom admin permissions</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredOrganizations.map((org) => {
                    const stats = getOrganizationStats(org.id);
                    const isEditing = editingOrg && editingOrg.id === org.id;
                    const isEditingPerms = editingPermissions && editingPermissions.id === org.id;
                    const isSystemOrg = isSystemOrganization(org.id);
                    
                    return (
                      <Card 
                        key={org.id} 
                        className={`hover:shadow-card-hover transition-shadow ${isSystemOrg ? 'border-primary-200 bg-primary-50' : ''} ${selectedOrgId === org.id ? 'border-2 border-primary-500 shadow-lg' : ''}`}
                        onClick={() => setSelectedOrgId(org.id)}
                      >
                        <CardContent className="p-6">
                          {isEditing ? (
                            <div className="space-y-4">
                              <FormInput
                                label="Organization Name"
                                value={editingOrg.name}
                                onChange={(e) => {
                                  setEditingOrg({ ...editingOrg, name: e.target.value });
                                  setValidationError(null);
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && editingOrg.name.trim()) {
                                    handleUpdateOrganization();
                                  }
                                }}
                                error={validationError && !editingOrg.name.trim() ? 'Organization name is required' : undefined}
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleUpdateOrganization}
                                  size="sm"
                                  isLoading={isLoading}
                                  disabled={!editingOrg.name.trim() || isLoading}
                                >
                                  Save Changes
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingOrg(null);
                                    setValidationError(null);
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : isEditingPerms ? (
                            <div className="space-y-4">
                              <h3 className="font-medium text-gray-900">Organization Admin Permissions</h3>
                              <p className="text-sm text-gray-600">Select permissions for organization administrators</p>
                              
                              <div className="space-y-3">
                                {availablePermissions.map(permission => (
                                  <label key={permission.key} className="flex items-start space-x-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingPermissions.permissions.includes(permission.key)}
                                      onChange={(e) => {
                                        const newPermissions = e.target.checked
                                          ? [...editingPermissions.permissions, permission.key]
                                          : editingPermissions.permissions.filter(p => p !== permission.key);
                                        setEditingPermissions({ ...editingPermissions, permissions: newPermissions });
                                      }}
                                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <div>
                                      <div className="font-medium text-gray-900">{permission.label}</div>
                                      <div className="text-sm text-gray-500">{permission.description}</div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleUpdatePermissions}
                                  size="sm"
                                  isLoading={isLoading}
                                  disabled={isLoading}
                                >
                                  Save Permissions
                                </Button>
                                <Button
                                  onClick={() => setEditingPermissions(null)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : editingStatus && editingStatus.id === org.id ? (
                            <div className="space-y-4">
                              <h3 className="font-medium text-gray-900">Update Organization Status</h3>
                              <p className="text-sm text-gray-600">Change the status of this organization</p>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                  <select
                                    value={editingStatus.status}
                                    onChange={(e) => setEditingStatus({
                                      ...editingStatus,
                                      status: e.target.value as 'active' | 'inactive' | 'suspended'
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                                  <textarea
                                    value={editingStatus.reason || ''}
                                    onChange={(e) => setEditingStatus({
                                      ...editingStatus,
                                      reason: e.target.value
                                    })}
                                    placeholder="Enter reason for status change..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                    rows={3}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleUpdateStatus}
                                  size="sm"
                                  isLoading={isLoading}
                                  disabled={isLoading}
                                >
                                  Update Status
                                </Button>
                                <Button
                                  onClick={() => setEditingStatus(null)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
                                    {isSystemOrg && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                        <Shield className="h-3 w-3 mr-1" />
                                        System
                                      </span>
                                    )}
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      org.status === 'active' || !org.status ? 'bg-green-100 text-green-800' :
                                      org.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {org.status === 'active' || !org.status ? <CheckCircle className="h-3 w-3 mr-1" /> :
                                       org.status === 'inactive' ? <Clock className="h-3 w-3 mr-1" /> :
                                       <AlertTriangle className="h-3 w-3 mr-1" />}
                                      {org.status ? org.status.charAt(0).toUpperCase() + org.status.slice(1) : 'Active'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    Created {new Date(org.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => setEditingOrg({ id: org.id, name: org.name })}
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Pencil className="h-4 w-4" />}
                                    disabled={isSystemOrg}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    onClick={() => setEditingPermissions({ 
                                      id: org.id, 
                                      permissions: org.orgAdminPermissions || [] 
                                    })}
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Settings className="h-4 w-4" />}
                                  >
                                    Permissions
                                  </Button>
                                  <Button
                                    onClick={() => setEditingStatus({ 
                                      id: org.id, 
                                      status: org.status || 'active' 
                                    })}
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Activity className="h-4 w-4" />}
                                    disabled={isSystemOrg}
                                  >
                                    Status
                                  </Button>
                                  <Button
                                    onClick={() => handleShowStatusLog(org.id)}
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Clock className="h-4 w-4" />}
                                  >
                                    History
                                  </Button>
                                  <Button
                                    onClick={() => navigate('/users')}
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Eye className="h-4 w-4" />}
                                  >
                                    View
                                  </Button>
                                  {!isSystemOrg && (
                                    <Button
                                      onClick={() => handleDeleteOrganization(org.id, org.name)}
                                      variant="danger"
                                      size="sm"
                                      leftIcon={<Trash2 className="h-4 w-4" />}
                                    >
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {isSystemOrg && (
                                <div className="mb-4 p-3 bg-primary-100 border border-primary-200 rounded-lg">
                                  <div className="flex items-center">
                                    <Shield className="h-4 w-4 text-primary-600 mr-2" />
                                    <span className="text-sm text-primary-700">
                                      This is a system organization and cannot be modified or deleted.
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Admin Permissions */}
                              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-800 mb-2">Organization Admin Permissions</h4>
                                <div className="flex flex-wrap gap-2">
                                  {(org.orgAdminPermissions || []).map(permission => (
                                    <span key={permission} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                                      {getPermissionLabel(permission)}
                                    </span>
                                  ))}
                                  {(!org.orgAdminPermissions || org.orgAdminPermissions.length === 0) && (
                                    <span className="text-sm text-gray-500">No permissions set</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Organization Statistics */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center mb-3">
                                  <Users className="h-4 w-4 text-gray-600 mr-2" />
                                  <span className="text-sm font-medium text-gray-700">User Statistics</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-lg font-semibold text-gray-900">{stats.totalUsers}</div>
                                    <div className="text-gray-600">Total Users</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-semibold text-primary-600">{stats.employees}</div>
                                    <div className="text-gray-600">Employees</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-semibold text-secondary-600">{stats.reviewers}</div>
                                    <div className="text-gray-600">Reviewers</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-semibold text-accent-600">{stats.subscribers}</div>
                                    <div className="text-gray-600">Subscribers</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-semibold text-indigo-600">{stats.admins}</div>
                                    <div className="text-gray-600">Org Admins</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Organization Users and Results */}
          {selectedOrgId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Users in Selected Organization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrganizationUsersDisplay organizationId={selectedOrgId} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Status History Modal */}
      {showStatusLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Status History</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusLog(null)}
                leftIcon={<X className="h-4 w-4" />}
              >
                Close
              </Button>
            </div>
            
            <div className="space-y-4">
              {statusLog.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No status changes recorded.</p>
              ) : (
                statusLog.map((log, index) => (
                  <div key={log.id || index} className="border-l-4 border-primary-200 pl-4 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.old_status === 'active' ? 'bg-green-100 text-green-800' :
                          log.old_status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.old_status || 'Unknown'}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.new_status === 'active' ? 'bg-green-100 text-green-800' :
                          log.new_status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.new_status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Changed by: {log.changed_by_user ? `${log.changed_by_user.first_name} ${log.changed_by_user.last_name}` : log.changed_by || 'System'}
                    </div>
                    {log.reason && (
                      <div className="mt-1 text-sm text-gray-600">
                        Reason: {log.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;