import React, { useState, useEffect } from 'react';
import { Shield, Settings, Users, CheckCircle, AlertTriangle, Save, Eye, Lock, Unlock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { OrgAdminPermission, Organization } from '../../types';

const PermissionManager: React.FC = () => {
  const { user } = useAuthStore();
  const { organizations, fetchOrganizations, updateOrgAdminPermissions, isLoading } = useOrganizationStore();
  const { users, fetchUsers } = useUserStore();
  
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [tempPermissions, setTempPermissions] = useState<OrgAdminPermission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations();
      fetchUsers();
    }
  }, [isSuperAdmin, fetchOrganizations, fetchUsers]);

  useEffect(() => {
    if (selectedOrg) {
      setTempPermissions(selectedOrg.orgAdminPermissions || []);
      setHasChanges(false);
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const availablePermissions: { 
    key: OrgAdminPermission; 
    label: string; 
    description: string; 
    icon: React.ReactNode;
    category: 'core' | 'advanced' | 'analytics';
  }[] = [
    { 
      key: 'manage_users', 
      label: 'User Management', 
      description: 'Add, edit, and remove admin users in the organization',
      icon: <Users className="h-4 w-4" />,
      category: 'core'
    },
    { 
      key: 'assign_assessments', 
      label: 'Assessment Assignment', 
      description: 'Create and manage assessment assignments for employees',
      icon: <CheckCircle className="h-4 w-4" />,
      category: 'core'
    },
    { 
      key: 'manage_relationships', 
      label: 'Relationship Management', 
      description: 'Define and manage user relationships for targeted feedback',
      icon: <Settings className="h-4 w-4" />,
      category: 'core'
    },
    { 
      key: 'create_assessments', 
      label: 'Assessment Creation', 
      description: 'Create new custom assessments and modify existing ones',
      icon: <Shield className="h-4 w-4" />,
      category: 'advanced'
    },
    { 
      key: 'view_results', 
      label: 'Analytics Access', 
      description: 'Access organization analytics, metrics, and export reports',
      icon: <Eye className="h-4 w-4" />,
      category: 'analytics'
    }
  ];

  const handlePermissionToggle = (permission: OrgAdminPermission) => {
    const newPermissions = tempPermissions.includes(permission)
      ? tempPermissions.filter(p => p !== permission)
      : [...tempPermissions, permission];
    
    setTempPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedOrg) return;

    setError(null);
    try {
      await updateOrgAdminPermissions(selectedOrg.id, tempPermissions);
      setSuccessMessage(`Permissions updated successfully for ${selectedOrg.name}!`);
      setHasChanges(false);
      
      // Update selected org with new permissions
      const updatedOrg = { ...selectedOrg, orgAdminPermissions: tempPermissions };
      setSelectedOrg(updatedOrg);
    } catch (err) {
      setError((err as Error).message || 'Failed to update permissions');
    }
  };

  const handleResetPermissions = () => {
    if (selectedOrg) {
      setTempPermissions(selectedOrg.orgAdminPermissions || []);
      setHasChanges(false);
    }
  };

  const getOrgAdminCount = (orgId: string) => {
    return users.filter(u => u.organizationId === orgId && u.role === 'org_admin').length;
  };

  const getCategoryPermissions = (category: string) => {
    return availablePermissions.filter(p => p.category === category);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core': return <CheckCircle className="h-5 w-5 text-primary-600" />;
      case 'advanced': return <Shield className="h-5 w-5 text-warning-600" />;
      case 'analytics': return <Eye className="h-5 w-5 text-secondary-600" />;
      default: return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'border-primary-200 bg-primary-50';
      case 'advanced': return 'border-warning-200 bg-warning-50';
      case 'analytics': return 'border-secondary-200 bg-secondary-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500">Only Super Admins can manage organization permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="h-6 w-6 mr-3 text-primary-600" />
          Permission Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Control what Organization Admins can do within their organizations
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Card className="bg-success-50 border-success-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-success-600" />
              <span className="text-success-800 font-medium">{successMessage}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-error-50 border-error-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-error-600" />
              <span className="text-error-800 font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Organizations ({organizations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {organizations.map(org => {
                  const adminCount = getOrgAdminCount(org.id);
                  const permissionCount = org.orgAdminPermissions?.length || 0;
                  const isSelected = selectedOrg?.id === org.id;
                  
                  return (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrg(org)}
                      className={`
                        w-full text-left p-4 rounded-lg border-2 transition-all
                        ${isSelected 
                          ? 'border-primary-300 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{org.name}</h3>
                          <div className="text-sm text-gray-500 mt-1">
                            {adminCount} admin{adminCount !== 1 ? 's' : ''} • {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {permissionCount === 0 ? (
                          <AlertTriangle className="h-5 w-5 text-warning-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-success-500" />
                        )}
                      </div>
                      
                      {/* Permission Preview */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(org.orgAdminPermissions || []).slice(0, 3).map(permission => {
                          const perm = availablePermissions.find(p => p.key === permission);
                          return (
                            <span key={permission} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                              {perm?.label || permission}
                            </span>
                          );
                        })}
                        {(org.orgAdminPermissions?.length || 0) > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{(org.orgAdminPermissions?.length || 0) - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permission Configuration */}
        <div className="lg:col-span-2">
          {selectedOrg ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Configure Permissions: {selectedOrg.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Select which features Organization Admins can access
                    </p>
                  </div>
                  {hasChanges && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetPermissions}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSavePermissions}
                        isLoading={isLoading}
                        leftIcon={<Save className="h-4 w-4" />}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Permission Categories */}
                  {['core', 'advanced', 'analytics'].map(category => {
                    const categoryPerms = getCategoryPermissions(category);
                    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                    
                    return (
                      <div key={category} className={`border-2 rounded-lg p-4 ${getCategoryColor(category)}`}>
                        <div className="flex items-center mb-4">
                          {getCategoryIcon(category)}
                          <h3 className="font-medium text-gray-900 ml-2">{categoryName} Permissions</h3>
                          <span className="ml-2 text-sm text-gray-500">
                            ({categoryPerms.filter(p => tempPermissions.includes(p.key)).length}/{categoryPerms.length})
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          {categoryPerms.map(permission => {
                            const isEnabled = tempPermissions.includes(permission.key);
                            
                            return (
                              <label
                                key={permission.key}
                                className="flex items-start space-x-3 cursor-pointer p-3 bg-white rounded-lg border hover:shadow-sm transition-all"
                              >
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => handlePermissionToggle(permission.key)}
                                  className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    {permission.icon}
                                    <span className="font-medium text-gray-900">{permission.label}</span>
                                    {isEnabled ? (
                                      <Unlock className="h-4 w-4 text-success-500" />
                                    ) : (
                                      <Lock className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Permission Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">Permission Summary</h4>
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>{tempPermissions.length}</strong> of <strong>{availablePermissions.length}</strong> permissions enabled
                      </p>
                      <p className="mt-1">
                        Organization Admins will {tempPermissions.length === 0 ? 'have read-only access' : 'be able to perform the selected actions'}
                      </p>
                    </div>
                  </div>

                  {/* Save Button */}
                  {hasChanges && (
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={handleResetPermissions}
                      >
                        Cancel Changes
                      </Button>
                      <Button
                        onClick={handleSavePermissions}
                        isLoading={isLoading}
                        leftIcon={<Save className="h-4 w-4" />}
                      >
                        Save Permissions
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Organization</h3>
                <p className="text-gray-500 mb-4">
                  Choose an organization from the list to configure its admin permissions.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                  <h4 className="font-medium text-gray-800 mb-2">Permission Categories:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Core:</strong> Essential features for basic organization management</li>
                    <li>• <strong>Advanced:</strong> Assessment creation and advanced configuration</li>
                    <li>• <strong>Analytics:</strong> Data access and reporting capabilities</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Permission Templates</CardTitle>
          <p className="text-sm text-gray-600">Apply common permission sets to organizations</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                if (selectedOrg) {
                  setTempPermissions(['manage_users', 'assign_assessments']);
                  setHasChanges(true);
                }
              }}
              disabled={!selectedOrg}
            >
              Basic Access
              <div className="text-xs text-gray-500 mt-1">User management + assignments</div>
            </Button>
            
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                if (selectedOrg) {
                  setTempPermissions(['manage_users', 'assign_assessments', 'manage_relationships', 'view_results']);
                  setHasChanges(true);
                }
              }}
              disabled={!selectedOrg}
            >
              Standard Access
              <div className="text-xs text-gray-500 mt-1">All core features + analytics</div>
            </Button>
            
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                if (selectedOrg) {
                  setTempPermissions(availablePermissions.map(p => p.key));
                  setHasChanges(true);
                }
              }}
              disabled={!selectedOrg}
            >
              Full Access
              <div className="text-xs text-gray-500 mt-1">All available permissions</div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionManager;