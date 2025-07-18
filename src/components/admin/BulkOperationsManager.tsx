/**
 * Enhanced Bulk Operations Manager
 * Provides comprehensive bulk operations with approval workflows
 */

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileText,
  Settings,
  Eye,
  Play,
  Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuthStore } from '../../stores/authStore';
import EnhancedRBAC from '../../lib/rbac/enhancedPermissions';

interface BulkOperation {
  id: string;
  type: 'user_import' | 'user_update' | 'assessment_assign' | 'role_change' | 'notification_send';
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  approvedBy?: string;
  approvedAt?: Date;
  executedAt?: Date;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  data: Record<string, unknown>[];
  validationErrors: ValidationError[];
  approvalRequired: boolean;
  scheduledFor?: Date;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface BulkTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  fields: TemplateField[];
  validationRules: ValidationRule[];
}

interface TemplateField {
  name: string;
  type: 'text' | 'email' | 'select' | 'date' | 'number';
  required: boolean;
  options?: string[];
  validation?: string;
}

interface ValidationRule {
  field: string;
  rule: 'required' | 'email' | 'unique' | 'min_length' | 'max_length' | 'regex';
  value?: unknown;
  message: string;
}

export const BulkOperationsManager: React.FC = () => {
  const { user } = useAuthStore();
  const rbac = EnhancedRBAC.getInstance();

  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [templates, setTemplates] = useState<BulkTemplate[]>([]);
  // const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [activeTab, setActiveTab] = useState<'operations' | 'templates' | 'create'>('operations');
  const [operationType, setOperationType] = useState<string>('user_import');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationError[]>([]);
  // const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  // Check permissions
  const canCreateBulkOps = rbac.hasPermission(user, 'users.create.bulk');
  const canApproveBulkOps = rbac.hasPermission(user, 'users.edit.role'); // Assuming role edit permission includes approvals
  const canViewOperations = rbac.hasPermission(user, 'users.view');

  useEffect(() => {
    loadOperations();
    loadTemplates();
  }, [loadOperations, loadTemplates]);

  const loadOperations = React.useCallback(() => {
    // Mock data - in real implementation, load from API
    const mockOperations: BulkOperation[] = [
      {
        id: '1',
        type: 'user_import',
        title: 'Q4 New Hires Import',
        description: 'Import 25 new employees for Q4 onboarding',
        createdBy: user?.id || '',
        createdAt: new Date('2024-07-15'),
        status: 'completed',
        approvedBy: 'admin1',
        approvedAt: new Date('2024-07-16'),
        executedAt: new Date('2024-07-17'),
        totalItems: 25,
        processedItems: 25,
        successfulItems: 23,
        failedItems: 2,
        data: [],
        validationErrors: [],
        approvalRequired: true
      },
      {
        id: '2',
        type: 'assessment_assign',
        title: 'Leadership Assessment Assignment',
        description: 'Assign leadership assessment to all managers',
        createdBy: user?.id || '',
        createdAt: new Date('2024-07-20'),
        status: 'pending_approval',
        totalItems: 15,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        data: [],
        validationErrors: [],
        approvalRequired: true
      }
    ];
    setOperations(mockOperations);
  }, []);

  const loadTemplates = React.useCallback(() => {
    const mockTemplates: BulkTemplate[] = [
      {
        id: 'user_import_template',
        name: 'User Import Template',
        type: 'user_import',
        description: 'Standard template for importing new users',
        fields: [
          { name: 'firstName', type: 'text', required: true },
          { name: 'lastName', type: 'text', required: true },
          { name: 'email', type: 'email', required: true },
          { name: 'role', type: 'select', required: true, options: ['employee', 'reviewer', 'org_admin'] },
          { name: 'department', type: 'text', required: false }
        ],
        validationRules: [
          { field: 'email', rule: 'email', message: 'Invalid email format' },
          { field: 'email', rule: 'unique', message: 'Email already exists' },
          { field: 'firstName', rule: 'min_length', value: 2, message: 'First name too short' }
        ]
      }
    ];
    setTemplates(mockTemplates);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      parseCSVFile(file);
    }
  };

  const parseCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, unknown> = { _rowIndex: index + 2 }; // +2 for header and 0-based index
        headers.forEach((header, i) => {
          row[header] = values[i];
        });
        return row;
      }).filter(row => Object.keys(row).length > 1); // Filter empty rows

      setPreviewData(data);
      validateData(data);
    };
    reader.readAsText(file);
  };

  const validateData = (data: Record<string, unknown>[]) => {
    const errors: ValidationError[] = [];
    const template = templates.find(t => t.type === operationType);
    
    if (!template) return;

    data.forEach((row, index) => {
      template.validationRules.forEach(rule => {
        const value = row[rule.field];
        const rowNumber = row._rowIndex || index + 2;

        switch (rule.rule) {
          case 'required':
            if (!value || value.trim() === '') {
              errors.push({
                row: rowNumber,
                field: rule.field,
                message: `${rule.field} is required`,
                severity: 'error'
              });
            }
            break;
          case 'email':
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push({
                row: rowNumber,
                field: rule.field,
                message: 'Invalid email format',
                severity: 'error'
              });
            }
            break;
          case 'min_length':
            if (value && value.length < rule.value) {
              errors.push({
                row: rowNumber,
                field: rule.field,
                message: rule.message,
                severity: 'warning'
              });
            }
            break;
        }
      });
    });

    setValidationResults(errors);
  };

  const createBulkOperation = () => {
    if (!uploadedFile || !previewData.length) return;

    const operation: BulkOperation = {
      id: Date.now().toString(),
      type: operationType as BulkOperation['type'],
      title: `${operationType.replace('_', ' ')} - ${uploadedFile.name}`,
      description: `Bulk ${operationType.replace('_', ' ')} operation`,
      createdBy: user?.id || '',
      createdAt: new Date(),
      status: validationResults.some(v => v.severity === 'error') ? 'draft' : 'pending_approval',
      totalItems: previewData.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      data: previewData,
      validationErrors: validationResults,
      approvalRequired: true
    };

    setOperations([operation, ...operations]);
    setActiveTab('operations');
    
    // Reset form
    setUploadedFile(null);
    setPreviewData([]);
    setValidationResults([]);
  };

  const approveOperation = (operationId: string) => {
    setOperations(operations.map(op => 
      op.id === operationId 
        ? { ...op, status: 'approved', approvedBy: user?.id, approvedAt: new Date() }
        : op
    ));
  };

  const rejectOperation = (operationId: string) => {
    setOperations(operations.map(op => 
      op.id === operationId 
        ? { ...op, status: 'rejected', approvedBy: user?.id, approvedAt: new Date() }
        : op
    ));
  };

  const executeOperation = (operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;

    // Start execution
    setOperations(operations.map(op => 
      op.id === operationId 
        ? { ...op, status: 'executing', executedAt: new Date() }
        : op
    ));

    // Simulate execution
    let processed = 0;
    const total = operation.totalItems;
    
    const interval = setInterval(() => {
      processed += Math.floor(Math.random() * 3) + 1;
      
      if (processed >= total) {
        processed = total;
        clearInterval(interval);
        
        // Complete execution
        setOperations(prevOps => prevOps.map(op => 
          op.id === operationId 
            ? { 
                ...op, 
                status: 'completed',
                processedItems: total,
                successfulItems: total - Math.floor(Math.random() * 3),
                failedItems: Math.floor(Math.random() * 3)
              }
            : op
        ));
      } else {
        setOperations(prevOps => prevOps.map(op => 
          op.id === operationId 
            ? { ...op, processedItems: processed }
            : op
        ));
      }
    }, 1000);
  };

  const OperationCard: React.FC<{ operation: BulkOperation }> = ({ operation }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{operation.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{operation.description}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            operation.status === 'completed' ? 'bg-green-100 text-green-800' :
            operation.status === 'failed' ? 'bg-red-100 text-red-800' :
            operation.status === 'executing' ? 'bg-blue-100 text-blue-800' :
            operation.status === 'approved' ? 'bg-purple-100 text-purple-800' :
            operation.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
            operation.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {operation.status.replace('_', ' ')}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress */}
          {operation.status === 'executing' && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{operation.processedItems}/{operation.totalItems}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(operation.processedItems / operation.totalItems) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {operation.status === 'completed' && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">{operation.successfulItems}</div>
                <div className="text-gray-500">Success</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{operation.failedItems}</div>
                <div className="text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{operation.totalItems}</div>
                <div className="text-gray-500">Total</div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {operation.validationErrors.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600">
                {operation.validationErrors.filter(e => e.severity === 'error').length} errors, 
                {operation.validationErrors.filter(e => e.severity === 'warning').length} warnings
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedOperation(operation)}>
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            
            {operation.status === 'pending_approval' && canApproveBulkOps && (
              <>
                <Button size="sm" onClick={() => approveOperation(operation.id)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => rejectOperation(operation.id)}>
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            
            {operation.status === 'approved' && (
              <Button size="sm" onClick={() => executeOperation(operation.id)}>
                <Play className="h-3 w-3 mr-1" />
                Execute
              </Button>
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            Created: {operation.createdAt.toLocaleDateString()} | 
            Type: {operation.type.replace('_', ' ')} | 
            Items: {operation.totalItems}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!canViewOperations) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">You don't have permission to view bulk operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
          <p className="text-gray-600">Manage large-scale operations with approval workflows</p>
        </div>
        {canCreateBulkOps && (
          <Button onClick={() => setActiveTab('create')}>
            <Upload className="h-4 w-4 mr-2" />
            New Operation
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'operations', name: 'Operations', icon: FileText },
            { id: 'templates', name: 'Templates', icon: Settings }
          ].concat(canCreateBulkOps ? [{ id: 'create', name: 'Create', icon: Upload }] : []).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'operations' | 'templates' | 'create')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'operations' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <select className="border border-gray-300 rounded-md px-3 py-2">
                    <option value="">All Types</option>
                    <option value="user_import">User Import</option>
                    <option value="assessment_assign">Assessment Assignment</option>
                    <option value="role_change">Role Change</option>
                  </select>
                  <select className="border border-gray-300 rounded-md px-3 py-2">
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Operations List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {operations.map((operation) => (
                <OperationCard key={operation.id} operation={operation} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Fields:</div>
                    <div className="flex flex-wrap gap-2">
                      {template.fields.map((field) => (
                        <span 
                          key={field.name}
                          className={`px-2 py-1 rounded text-xs ${
                            field.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {field.name} ({field.type})
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'create' && canCreateBulkOps && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Bulk Operation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Operation Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operation Type</label>
                  <select 
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="user_import">User Import</option>
                    <option value="user_update">User Update</option>
                    <option value="assessment_assign">Assessment Assignment</option>
                    <option value="role_change">Role Change</option>
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                {/* Preview and Validation */}
                {previewData.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Data Preview</h3>
                    
                    {/* Validation Summary */}
                    {validationResults.length > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="font-medium text-amber-800">Validation Issues Found</span>
                        </div>
                        <div className="text-sm text-amber-700 mt-1">
                          {validationResults.filter(v => v.severity === 'error').length} errors, 
                          {validationResults.filter(v => v.severity === 'warning').length} warnings
                        </div>
                      </div>
                    )}

                    {/* Data Table */}
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="max-h-64 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(previewData[0] || {}).filter(k => k !== '_rowIndex').map((key) => (
                                <th key={key} className="px-3 py-2 text-left font-medium text-gray-700">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.slice(0, 5).map((row, index) => (
                              <tr key={index} className="border-t border-gray-200">
                                {Object.entries(row).filter(([k]) => k !== '_rowIndex').map(([key, value]) => (
                                  <td key={key} className="px-3 py-2 text-gray-900">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {previewData.length > 5 && (
                        <div className="bg-gray-50 px-3 py-2 text-sm text-gray-600">
                          ... and {previewData.length - 5} more rows
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {previewData.length > 0 && (
                  <div className="flex gap-3">
                    <Button 
                      onClick={createBulkOperation}
                      disabled={validationResults.some(v => v.severity === 'error')}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Create Operation
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setUploadedFile(null);
                      setPreviewData([]);
                      setValidationResults([]);
                    }}>
                      Reset
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperationsManager;