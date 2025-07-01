import React, { useState } from 'react';
import { Trash2, UserPlus, Building2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { Role } from '../../types';

interface BulkOperationsProps {
  selectedUsers: string[];
  onBulkDelete: () => void;
  onBulkRoleUpdate: (role: Role) => void;
  onBulkDepartmentUpdate: (departmentId: string) => void;
  onClearSelection: () => void;
  departments: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedUsers,
  onBulkDelete,
  onBulkRoleUpdate,
  onBulkDepartmentUpdate,
  onClearSelection,
  departments,
  isLoading = false
}) => {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('employee');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const availableRoles: { value: Role; label: string }[] = [
    { value: 'employee', label: 'Employee' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'org_admin', label: 'Organization Admin' },
  ];

  const handleRoleUpdate = () => {
    onBulkRoleUpdate(selectedRole);
    setShowRoleModal(false);
  };

  const handleDepartmentUpdate = () => {
    onBulkDepartmentUpdate(selectedDepartment);
    setShowDepartmentModal(false);
  };

  if (selectedUsers.length === 0) return null;

  return (
    <>
      <Card className="bg-primary-50 border-primary-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-primary-800">
                  {selectedUsers.length} user(s) selected
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRoleModal(true)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  disabled={isLoading}
                >
                  Update Role
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDepartmentModal(true)}
                  leftIcon={<Building2 className="h-4 w-4" />}
                  disabled={isLoading}
                >
                  Move Department
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkDelete}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  disabled={isLoading}
                  className="text-error-600 hover:text-error-700 hover:bg-error-50"
                >
                  Delete Selected
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isLoading}
            >
              Clear Selection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Role Update Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <UserPlus className="h-6 w-6 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900">Update User Roles</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Role for {selectedUsers.length} selected user(s)
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-warning-50 border border-warning-200 rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-warning-600" />
                  <span className="text-sm text-warning-700">
                    This will update the role for all {selectedUsers.length} selected users.
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRoleModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRoleUpdate}
                  isLoading={isLoading}
                >
                  Update Roles
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Update Modal */}
      {showDepartmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <Building2 className="h-6 w-6 text-primary-600" />
              <h3 className="text-lg font-medium text-gray-900">Move Users to Department</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Department for {selectedUsers.length} selected user(s)
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
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
              
              <div className="bg-warning-50 border border-warning-200 rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-warning-600" />
                  <span className="text-sm text-warning-700">
                    This will move all {selectedUsers.length} selected users to the chosen department.
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDepartmentModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDepartmentUpdate}
                  isLoading={isLoading}
                >
                  Move Users
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkOperations; 