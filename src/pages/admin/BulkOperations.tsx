import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  Upload,
  Download,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  AlertTriangle,
  Settings,
  Building2,
  UserCheck,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import type { User } from '../../types';

interface BulkOperation {
  type: 'role_change' | 'organization_transfer' | 'department_transfer' | 'deactivate' | 'activate' | 'delete';
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresConfirmation: boolean;
  destructive: boolean;
}

interface BulkActionPayload {
  userIds: string[];
  operation: string;
  data?: {
    newRole?: string;
    organizationId?: string;
    departmentId?: string;
  };
}

const BULK_OPERATIONS: BulkOperation[] = [
  {
    type: 'role_change',
    label: 'Change Role',
    icon: <UserCheck className="h-4 w-4" />,
    description: 'Change user roles for selected users',
    requiresConfirmation: true,
    destructive: false
  },
  {
    type: 'organization_transfer',
    label: 'Transfer Organization',
    icon: <Building2 className="h-4 w-4" />,
    description: 'Move users to a different organization',
    requiresConfirmation: true,
    destructive: false
  },
  {
    type: 'department_transfer',
    label: 'Transfer Department',
    icon: <Users className="h-4 w-4" />,
    description: 'Move users to a different department',
    requiresConfirmation: true,
    destructive: false
  },
  {
    type: 'activate',
    label: 'Activate Users',
    icon: <UserPlus className="h-4 w-4" />,
    description: 'Activate selected user accounts',
    requiresConfirmation: false,
    destructive: false
  },
  {
    type: 'deactivate',
    label: 'Deactivate Users',
    icon: <UserMinus className="h-4 w-4" />,
    description: 'Deactivate selected user accounts',
    requiresConfirmation: true,
    destructive: true
  },
  {
    type: 'delete',
    label: 'Delete Users',
    icon: <Trash2 className="h-4 w-4" />,
    description: 'Permanently delete selected users',
    requiresConfirmation: true,
    destructive: true
  }
];

export const BulkOperations: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { users, fetchUsers, updateUser, deleteUser, bulkUpdateUsers, isLoading } = useUserStore();
  const { organizations, fetchOrganizations } = useOrganizationStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const { addNotification } = useNotificationStore();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [operationData, setOperationData] = useState<any>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchUsers(),
        fetchOrganizations(),
        fetchDepartments()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesOrganization = !filterOrganization || user.organization_id === filterOrganization;

    return matchesSearch && matchesRole && matchesOrganization;
  }) || [];

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleOperationSelect = (operationType: string) => {
    setSelectedOperation(operationType);
    setOperationData({});
  };

  const handleExecuteOperation = async () => {
    if (!selectedOperation || selectedUsers.length === 0) return;

    const operation = BULK_OPERATIONS.find(op => op.type === selectedOperation);
    
    if (operation?.requiresConfirmation) {
      setShowConfirmDialog(true);
      return;
    }

    await executeOperation();
  };

  const executeOperation = async () => {
    setIsProcessing(true);
    try {
      const payload: BulkActionPayload = {
        userIds: selectedUsers,
        operation: selectedOperation,
        data: operationData
      };

      switch (selectedOperation) {
        case 'role_change':
          await Promise.all(
            selectedUsers.map(userId => 
              updateUser(userId, { role: operationData.newRole })
            )
          );
          break;

        case 'organization_transfer':
          await Promise.all(
            selectedUsers.map(userId => 
              updateUser(userId, { organization_id: operationData.organizationId })
            )
          );
          break;

        case 'department_transfer':
          await Promise.all(
            selectedUsers.map(userId => 
              updateUser(userId, { department_id: operationData.departmentId })
            )
          );
          break;

        case 'activate':
          await Promise.all(
            selectedUsers.map(userId => 
              updateUser(userId, { status: 'active' })
            )
          );
          break;

        case 'deactivate':
          await Promise.all(
            selectedUsers.map(userId => 
              updateUser(userId, { status: 'inactive' })
            )
          );
          break;

        case 'delete':
          await Promise.all(
            selectedUsers.map(userId => deleteUser(userId))
          );
          break;

        default:
          throw new Error('Unknown operation');
      }

      addNotification({
        type: 'success',
        title: 'Bulk Operation Completed',
        message: `Successfully processed ${selectedUsers.length} users`
      });

      // Reset state
      setSelectedUsers([]);
      setSelectedOperation('');
      setOperationData({});
      setShowConfirmDialog(false);

      // Reload data
      await fetchUsers();

    } catch (error) {
      console.error('Bulk operation failed:', error);
      addNotification({
        type: 'error',
        title: 'Bulk Operation Failed',
        message: 'An error occurred while processing the bulk operation'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderOperationOptions = () => {
    switch (selectedOperation) {
      case 'role_change':
        return (
          <FormInput
            label="New Role"
            type="select"
            value={operationData.newRole || ''}
            onChange={(e) => setOperationData({ ...operationData, newRole: e.target.value })}
            options={[
              { value: '', label: 'Select Role' },
              { value: 'employee', label: 'Employee' },
              { value: 'reviewer', label: 'Reviewer' },
              { value: 'org_admin', label: 'Organization Admin' }
            ]}
            required
          />
        );

      case 'organization_transfer':
        return (
          <FormInput
            label="Target Organization"
            type="select"
            value={operationData.organizationId || ''}
            onChange={(e) => setOperationData({ ...operationData, organizationId: e.target.value })}
            options={[
              { value: '', label: 'Select Organization' },
              ...(organizations || []).map(org => ({
                value: org.id,
                label: org.name
              }))
            ]}
            required
          />
        );

      case 'department_transfer':
        return (
          <FormInput
            label="Target Department"
            type="select"
            value={operationData.departmentId || ''}
            onChange={(e) => setOperationData({ ...operationData, departmentId: e.target.value })}
            options={[
              { value: '', label: 'Select Department' },
              ...(departments || []).map(dept => ({
                value: dept.id,
                label: dept.name
              }))
            ]}
            required
          />
        );

      default:
        return null;
    }
  };

  const selectedOperation_ = BULK_OPERATIONS.find(op => op.type === selectedOperation);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Operations</h1>
          <p className="text-gray-600 mt-1">
            Manage multiple users efficiently with bulk operations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            leftIcon={<Upload className="h-4 w-4" />}
            variant="outline"
          >
            Import Users
          </Button>
          <Button
            leftIcon={<Download className="h-4 w-4" />}
            variant="outline"
          >
            Export Users
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormInput
              label="Search Users"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              leftIcon={<Search className="h-4 w-4" />}
            />
            <FormInput
              label="Filter by Role"
              type="select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'employee', label: 'Employee' },
                { value: 'reviewer', label: 'Reviewer' },
                { value: 'org_admin', label: 'Organization Admin' },
                { value: 'super_admin', label: 'Super Admin' }
              ]}
            />
            <FormInput
              label="Filter by Organization"
              type="select"
              value={filterOrganization}
              onChange={(e) => setFilterOrganization(e.target.value)}
              options={[
                { value: '', label: 'All Organizations' },
                ...(organizations || []).map(org => ({
                  value: org.id,
                  label: org.name
                }))
              ]}
            />
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('');
                  setFilterOrganization('');
                }}
                variant="outline"
                fullWidth
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Selection</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedUsers.length} of {filteredUsers.length} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  leftIcon={
                    selectedUsers.length === filteredUsers.length ? 
                    <CheckSquare className="h-4 w-4" /> : 
                    <Square className="h-4 w-4" />
                  }
                >
                  {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="animate-pulse flex space-x-4">
                    <div className="rounded bg-gray-200 h-4 w-4"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers.map((user: User) => (
                  <div
                    key={user.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUsers.includes(user.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectUser(user.id)}
                  >
                    <div className="flex-shrink-0">
                      {selectedUsers.includes(user.id) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name || user.email}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'org_admin' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'reviewer' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-400">
                          {organizations?.find(org => org.id === user.organization_id)?.name || 'No Organization'}
                        </span>
                        <span className={`text-xs ${
                          user.status === 'active' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {user.status || 'active'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users found matching the criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Bulk Operations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Operation Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Select Operation
              </label>
              <div className="space-y-2">
                {BULK_OPERATIONS.map((operation) => (
                  <div
                    key={operation.type}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedOperation === operation.type
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    } ${operation.destructive ? 'border-red-200' : ''}`}
                    onClick={() => handleOperationSelect(operation.type)}
                  >
                    <div className="flex-shrink-0">
                      {operation.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {operation.label}
                        </span>
                        {operation.destructive && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {operation.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operation Options */}
            {selectedOperation && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700">
                  Operation Settings
                </h4>
                {renderOperationOptions()}
              </div>
            )}

            {/* Execute Button */}
            <div className="pt-4 border-t">
              <Button
                fullWidth
                variant={selectedOperation_ && selectedOperation_.destructive ? 'danger' : 'primary'}
                onClick={handleExecuteOperation}
                disabled={!selectedOperation || selectedUsers.length === 0 || isProcessing}
                isLoading={isProcessing}
                leftIcon={<Edit3 className="h-4 w-4" />}
              >
                {isProcessing 
                  ? 'Processing...' 
                  : `Execute on ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`
                }
              </Button>
              {selectedUsers.length === 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Select users to enable bulk operations
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedOperation_ && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className={`h-6 w-6 ${
                selectedOperation_.destructive ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Bulk Operation
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {selectedOperation_.label.toLowerCase()} {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}?
              {selectedOperation_.destructive && (
                <span className="block mt-2 text-red-600 font-medium">
                  This action cannot be undone.
                </span>
              )}
            </p>
            <div className="flex space-x-3">
              <Button
                fullWidth
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                variant={selectedOperation_.destructive ? 'danger' : 'primary'}
                onClick={executeOperation}
                isLoading={isProcessing}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperations;