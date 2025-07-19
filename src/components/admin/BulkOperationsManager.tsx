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
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
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
  isSystem?: boolean;
  csvTemplate?: string;
  instructions?: string;
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

// Default bulk operation templates
const getDefaultTemplates = (): BulkTemplate[] => [
  {
    id: 'user-import-template',
    name: 'User Import Template',
    type: 'user_import',
    description: 'Import users in bulk with email, name, role, and optional department information',
    isSystem: true,
    instructions: 'Upload a CSV file with user information. Required fields: email, firstName, lastName, role. Optional: department, jobTitle, phone, location.',
    csvTemplate: 'email,firstName,lastName,role,department,jobTitle,phone,location\njohn.doe@company.com,John,Doe,employee,Engineering,Software Engineer,+1234567890,New York',
    fields: [
      { name: 'email', type: 'email', required: true },
      { name: 'firstName', type: 'text', required: true },
      { name: 'lastName', type: 'text', required: true },
      { name: 'role', type: 'select', required: true, options: ['employee', 'reviewer', 'org_admin', 'subscriber'] },
      { name: 'department', type: 'text', required: false },
      { name: 'jobTitle', type: 'text', required: false },
      { name: 'phone', type: 'text', required: false },
      { name: 'location', type: 'text', required: false }
    ],
    validationRules: [
      { field: 'email', rule: 'required', message: 'Email is required' },
      { field: 'email', rule: 'email', message: 'Must be a valid email address' },
      { field: 'firstName', rule: 'required', message: 'First name is required' },
      { field: 'firstName', rule: 'min_length', value: 2, message: 'First name must be at least 2 characters' },
      { field: 'lastName', rule: 'required', message: 'Last name is required' },
      { field: 'lastName', rule: 'min_length', value: 2, message: 'Last name must be at least 2 characters' },
      { field: 'role', rule: 'required', message: 'Role is required' }
    ]
  },
  {
    id: 'assessment-assignment-template',
    name: 'Assessment Assignment Template',
    type: 'assessment_assign',
    description: 'Assign assessments to multiple users with due dates and custom instructions',
    isSystem: true,
    instructions: 'Upload a CSV file with assessment assignment information. Required fields: userEmail, assessmentId. Optional: dueDate, customInstructions.',
    csvTemplate: 'userEmail,assessmentId,dueDate,customInstructions\njohn.doe@company.com,assessment-123,2024-12-31,Please complete by end of month',
    fields: [
      { name: 'userEmail', type: 'email', required: true },
      { name: 'assessmentId', type: 'text', required: true },
      { name: 'dueDate', type: 'date', required: false },
      { name: 'customInstructions', type: 'text', required: false }
    ],
    validationRules: [
      { field: 'userEmail', rule: 'required', message: 'User email is required' },
      { field: 'userEmail', rule: 'email', message: 'Must be a valid email address' },
      { field: 'assessmentId', rule: 'required', message: 'Assessment ID is required' }
    ]
  },
  {
    id: 'role-change-template',
    name: 'Role Change Template',
    type: 'role_change',
    description: 'Update user roles in bulk operations',
    isSystem: true,
    instructions: 'Upload a CSV file with role change information. Required fields: userEmail, newRole. Optional: reason, effectiveDate.',
    csvTemplate: 'userEmail,newRole,reason,effectiveDate\njohn.doe@company.com,org_admin,Promotion to team lead,2024-01-01',
    fields: [
      { name: 'userEmail', type: 'email', required: true },
      { name: 'newRole', type: 'select', required: true, options: ['employee', 'reviewer', 'org_admin', 'subscriber'] },
      { name: 'reason', type: 'text', required: false },
      { name: 'effectiveDate', type: 'date', required: false }
    ],
    validationRules: [
      { field: 'userEmail', rule: 'required', message: 'User email is required' },
      { field: 'userEmail', rule: 'email', message: 'Must be a valid email address' },
      { field: 'newRole', rule: 'required', message: 'New role is required' }
    ]
  },
  {
    id: 'notification-send-template',
    name: 'Bulk Notification Template',
    type: 'notification_send',
    description: 'Send notifications to multiple users simultaneously',
    isSystem: true,
    instructions: 'Upload a CSV file with notification information. Required fields: userEmail, subject, message. Optional: urgency, category.',
    csvTemplate: 'userEmail,subject,message,urgency,category\njohn.doe@company.com,Important Update,Please review the new policy,high,policy',
    fields: [
      { name: 'userEmail', type: 'email', required: true },
      { name: 'subject', type: 'text', required: true },
      { name: 'message', type: 'text', required: true },
      { name: 'urgency', type: 'select', required: false, options: ['low', 'normal', 'high', 'urgent'] },
      { name: 'category', type: 'text', required: false }
    ],
    validationRules: [
      { field: 'userEmail', rule: 'required', message: 'User email is required' },
      { field: 'userEmail', rule: 'email', message: 'Must be a valid email address' },
      { field: 'subject', rule: 'required', message: 'Subject is required' },
      { field: 'message', rule: 'required', message: 'Message is required' },
      { field: 'message', rule: 'min_length', value: 10, message: 'Message must be at least 10 characters' }
    ]
  }
];

export const BulkOperationsManager: React.FC = () => {
  const { user } = useAuthStore();
  const rbac = EnhancedRBAC.getInstance();

  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [templates, setTemplates] = useState<BulkTemplate[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [activeTab, setActiveTab] = useState<'operations' | 'templates' | 'create'>('operations');
  const [operationType, setOperationType] = useState<string>('user_import');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationError[]>([]);
  // const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BulkTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'user_import',
    description: '',
    fields: [] as TemplateField[],
    validationRules: [] as ValidationRule[],
    instructions: ''
  });

  // Check permissions
  const canCreateBulkOps = rbac.hasPermission(user, 'users.create.bulk');
  const canApproveBulkOps = rbac.hasPermission(user, 'users.edit.role'); // Assuming role edit permission includes approvals
  const canViewOperations = rbac.hasPermission(user, 'users.view');

  useEffect(() => {
    loadOperations();
    loadTemplates();
  }, []);

  const loadOperations = React.useCallback(async () => {
    try {
      // Load operations from Supabase
      const { data: operationsData, error } = await supabase
        .from('bulk_operations')
        .select(`
          *,
          users (first_name, last_name, email)
        `)
        .eq('organization_id', user?.organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedOperations: BulkOperation[] = operationsData.map((op: any) => ({
        id: op.id,
        type: op.operation_type,
        title: op.title,
        description: op.description,
        createdBy: op.created_by,
        createdAt: new Date(op.created_at),
        status: op.status,
        approvedBy: op.approved_by,
        approvedAt: op.approved_at ? new Date(op.approved_at) : undefined,
        executedAt: op.executed_at ? new Date(op.executed_at) : undefined,
        totalItems: op.total_items,
        processedItems: op.processed_items,
        successfulItems: op.successful_items,
        failedItems: op.failed_items,
        data: op.data || [],
        validationErrors: op.validation_errors || [],
        approvalRequired: op.approval_required
      }));

      setOperations(transformedOperations);
    } catch (error) {
      console.error('Failed to load operations:', error);
      setOperations([]);
    }
  }, [user?.organizationId]);

  const loadTemplates = React.useCallback(async () => {
    try {
      // Load templates from Supabase
      const { data: templatesData, error } = await supabase
        .from('bulk_operation_templates')
        .select('*')
        .or(`organization_id.eq.${user?.organizationId},is_system.eq.true`)
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to load templates from database, using defaults:', error);
        setTemplates(getDefaultTemplates());
        return;
      }

      // Transform database data to template format
      const transformedTemplates: BulkTemplate[] = templatesData?.map((tmpl: any) => ({
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.operation_type,
        description: tmpl.description,
        fields: tmpl.fields || [],
        validationRules: tmpl.validation_rules || [],
        isSystem: tmpl.is_system || false
      })) || [];

      // Add default templates if none exist
      const combinedTemplates = transformedTemplates.length > 0 
        ? transformedTemplates 
        : getDefaultTemplates();

      setTemplates(combinedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates(getDefaultTemplates());
    }
  }, [user?.organizationId]);

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

  // Template management functions
  const downloadTemplate = (template: BulkTemplate) => {
    if (!template.csvTemplate) return;
    
    const blob = new Blob([template.csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const createTemplate = async () => {
    try {
      const newTemplate: BulkTemplate = {
        id: `template-${Date.now()}`,
        ...templateForm,
        isSystem: false
      };

      // Save to database if available
      if (user?.organizationId) {
        const { error } = await supabase
          .from('bulk_operation_templates')
          .insert({
            name: templateForm.name,
            operation_type: templateForm.type,
            description: templateForm.description,
            fields: templateForm.fields,
            validation_rules: templateForm.validationRules,
            instructions: templateForm.instructions,
            organization_id: user.organizationId,
            is_system: false,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Failed to save template:', error);
        }
      }

      setTemplates([newTemplate, ...templates]);
      setShowTemplateModal(false);
      resetTemplateForm();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      // Delete from database if it's not a system template
      const template = templates.find(t => t.id === templateId);
      if (template && !template.isSystem && user?.organizationId) {
        await supabase
          .from('bulk_operation_templates')
          .delete()
          .eq('id', templateId)
          .eq('organization_id', user.organizationId);
      }

      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      type: 'user_import',
      description: '',
      fields: [],
      validationRules: [],
      instructions: ''
    });
  };

  const addField = () => {
    setTemplateForm(prev => ({
      ...prev,
      fields: [...prev.fields, { name: '', type: 'text', required: false }]
    }));
  };

  const removeField = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const updateField = (index: number, field: Partial<TemplateField>) => {
    setTemplateForm(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? { ...f, ...field } : f)
    }));
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
            {/* Template Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bulk Operation Templates</h2>
                <p className="text-sm text-gray-600">Manage templates for different bulk operations</p>
              </div>
              {canCreateBulkOps && (
                <Button onClick={() => setShowTemplateModal(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.isSystem && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Template Type */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Type:</span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {template.type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Fields Preview */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Fields ({template.fields.length}):</div>
                      <div className="flex flex-wrap gap-1">
                        {template.fields.slice(0, 6).map((field) => (
                          <span 
                            key={field.name}
                            className={`px-2 py-1 rounded text-xs ${
                              field.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {field.name}
                          </span>
                        ))}
                        {template.fields.length > 6 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                            +{template.fields.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Validation Rules Count */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Validation Rules:</span>
                      <span className="text-sm text-gray-600">{template.validationRules.length}</span>
                    </div>

                    {/* Instructions Preview */}
                    {template.instructions && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Instructions:</div>
                        <p className="text-xs text-gray-600 line-clamp-2">{template.instructions}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadTemplate(template)}
                        disabled={!template.csvTemplate}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Download CSV
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedTemplate(template);
                          setOperationType(template.type);
                          setActiveTab('create');
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Use Template
                      </Button>
                      
                      {!template.isSystem && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {templates.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h3>
                <p className="text-gray-600 mb-4">
                  Create your first bulk operation template to get started
                </p>
                {canCreateBulkOps && (
                  <Button onClick={() => setShowTemplateModal(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </div>
            )}
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

      {/* Template Creation Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Create Bulk Operation Template</h2>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTemplateModal(false);
                  resetTemplateForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="e.g., Custom User Import"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Operation Type
                    </label>
                    <select
                      value={templateForm.type}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="user_import">User Import</option>
                      <option value="user_update">User Update</option>
                      <option value="assessment_assign">Assessment Assignment</option>
                      <option value="role_change">Role Change</option>
                      <option value="notification_send">Notification Send</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Describe what this template is used for..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <textarea
                    value={templateForm.instructions}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, instructions: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={2}
                    placeholder="Instructions for users on how to use this template..."
                  />
                </div>

                {/* Fields */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Template Fields
                    </label>
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Upload className="h-3 w-3 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {templateForm.fields.map((field, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateField(index, { name: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="Field name"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={field.type}
                            onChange={(e) => updateField(index, { type: e.target.value as TemplateField['type'] })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="select">Select</option>
                            <option value="date">Date</option>
                            <option value="number">Number</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          {field.type === 'select' && (
                            <input
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateField(index, { options: e.target.value.split(',').map(o => o.trim()) })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                              placeholder="option1, option2, option3"
                            />
                          )}
                        </div>
                        <div className="col-span-2 flex items-center">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Required</span>
                        </div>
                        <div className="col-span-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeField(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTemplateModal(false);
                      resetTemplateForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createTemplate}
                    disabled={!templateForm.name || !templateForm.description || templateForm.fields.length === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperationsManager;