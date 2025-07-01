import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  Users, 
  ClipboardList, 
  CheckCircle, 
  AlertTriangle,
  Info,
  FileSpreadsheet,
  FilePlus,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import { ImportLog, ExportLog } from '../../types';

interface ImportExportManagerProps {
  onImportComplete?: () => void;
}

const ImportExportManager: React.FC<ImportExportManagerProps> = ({ onImportComplete }) => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { departments } = useDepartmentStore();
  
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importType, setImportType] = useState<'users' | 'assessments' | 'responses'>('users');
  const [exportType, setExportType] = useState<'users' | 'assessments' | 'responses' | 'results' | 'analytics'>('users');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [anonymizeExport, setAnonymizeExport] = useState<boolean>(true);
  const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [recentImports, setRecentImports] = useState<ImportLog[]>([]);
  const [recentExports, setRecentExports] = useState<ExportLog[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Mock import/export logs for demo
  const mockImportLogs: ImportLog[] = [
    {
      id: 'import-1',
      organizationId: user?.organizationId || '',
      importedById: user?.id || '',
      fileName: 'users_import_2025-06-15.csv',
      fileType: 'csv',
      importType: 'users',
      status: 'completed',
      recordsProcessed: 25,
      recordsCreated: 20,
      recordsUpdated: 3,
      recordsFailed: 2,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString()
    },
    {
      id: 'import-2',
      organizationId: user?.organizationId || '',
      importedById: user?.id || '',
      fileName: 'assessments_import_2025-06-10.csv',
      fileType: 'csv',
      importType: 'assessments',
      status: 'failed',
      recordsProcessed: 5,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 5,
      errorMessage: 'Invalid format in row 3: missing required fields',
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 1 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 1 * 60 * 1000).toISOString()
    }
  ];
  
  const mockExportLogs: ExportLog[] = [
    {
      id: 'export-1',
      organizationId: user?.organizationId || '',
      exportedById: user?.id || '',
      fileName: 'users_export_2025-06-20.csv',
      fileType: 'csv',
      exportType: 'users',
      status: 'completed',
      recordsExported: 45,
      isAnonymized: false,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 1000).toISOString(),
      downloadUrl: '#',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 1000).toISOString()
    },
    {
      id: 'export-2',
      organizationId: user?.organizationId || '',
      exportedById: user?.id || '',
      fileName: 'results_export_2025-06-18.pdf',
      fileType: 'pdf',
      exportType: 'results',
      status: 'completed',
      recordsExported: 12,
      isAnonymized: true,
      startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 45 * 1000).toISOString(),
      downloadUrl: '#',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 45 * 1000).toISOString()
    }
  ];
  
  // Initialize with mock data
  React.useEffect(() => {
    setRecentImports(mockImportLogs);
    setRecentExports(mockExportLogs);
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
  };
  
  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }
    
    if (!user?.organizationId) {
      setError('Organization ID is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate file reading and processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a new import log
      const newImport: ImportLog = {
        id: `import-${Date.now()}`,
        organizationId: user.organizationId,
        importedById: user.id,
        fileName: selectedFile.name,
        fileType: selectedFile.name.endsWith('.csv') ? 'csv' : 
                 selectedFile.name.endsWith('.pdf') ? 'pdf' : 'xlsx',
        importType: importType,
        status: 'completed',
        recordsProcessed: Math.floor(Math.random() * 50) + 10,
        recordsCreated: Math.floor(Math.random() * 30) + 5,
        recordsUpdated: Math.floor(Math.random() * 10),
        recordsFailed: Math.floor(Math.random() * 5),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setRecentImports([newImport, ...recentImports]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setSuccess(`Successfully imported ${newImport.recordsCreated} records and updated ${newImport.recordsUpdated} records.`);
      
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to import file');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExport = async () => {
    if (!user?.organizationId) {
      setError('Organization ID is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate export processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${exportType}_export_${timestamp}.${exportType === 'results' || exportType === 'analytics' ? 'pdf' : 'csv'}`;
      
      // Create a new export log
      const newExport: ExportLog = {
        id: `export-${Date.now()}`,
        organizationId: user.organizationId,
        exportedById: user.id,
        fileName: fileName,
        fileType: fileName.endsWith('.pdf') ? 'pdf' : 'csv',
        exportType: exportType,
        status: 'completed',
        recordsExported: Math.floor(Math.random() * 100) + 10,
        isAnonymized: anonymizeExport,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        downloadUrl: '#',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setRecentExports([newExport, ...recentExports]);
      
      // Create sample content based on export type
      let content = '';
      
      if (exportType === 'users') {
        content = 'email,firstName,lastName,role,department\n';
        content += 'john.doe@example.com,John,Doe,employee,Engineering\n';
        content += 'jane.smith@example.com,Jane,Smith,reviewer,Human Resources\n';
      } else if (exportType === 'assessments') {
        content = 'title,description,type,sections,questions\n';
        content += 'Leadership Assessment,Evaluate leadership skills,custom,3,15\n';
        content += 'Communication Skills,Assess communication effectiveness,preset,2,10\n';
      } else if (exportType === 'results') {
        // For PDF, we'll just create a text representation
        content = 'ASSESSMENT RESULTS REPORT\n\n';
        content += 'Organization: ' + currentOrganization?.name + '\n';
        content += 'Generated: ' + new Date().toLocaleString() + '\n\n';
        content += 'This is a sample PDF export of assessment results.\n';
        content += anonymizeExport ? 'Data has been anonymized for privacy.' : 'Contains individual data.';
      }
      
      // Trigger download
      const blob = new Blob([content], { type: exportType === 'results' || exportType === 'analytics' ? 'application/pdf' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess(`Successfully exported ${newExport.recordsExported} records.`);
    } catch (err) {
      setError((err as Error).message || 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getImportTypeIcon = (type: string) => {
    switch (type) {
      case 'users':
        return <Users className="h-4 w-4" />;
      case 'assessments':
        return <ClipboardList className="h-4 w-4" />;
      case 'responses':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-error-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-warning-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Import & Export</h2>
        <p className="text-sm text-gray-500 mt-1">
          Import data from CSV files or export data for reporting and backup
        </p>
      </div>
      
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'import'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Upload className="h-4 w-4 mr-1" />
            Import Data
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'export'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Download className="h-4 w-4 mr-1" />
            Export Data
          </button>
        </nav>
      </div>
      
      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Import Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setImportType('users')}
                      className={`flex items-center p-4 border-2 rounded-lg ${
                        importType === 'users' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Users className={`h-5 w-5 mr-3 ${importType === 'users' ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="text-left">
                        <div className={`font-medium ${importType === 'users' ? 'text-primary-700' : 'text-gray-900'}`}>
                          Users
                        </div>
                        <div className="text-xs text-gray-500">
                          Import users and assign to departments
                        </div>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setImportType('assessments')}
                      className={`flex items-center p-4 border-2 rounded-lg ${
                        importType === 'assessments' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ClipboardList className={`h-5 w-5 mr-3 ${importType === 'assessments' ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="text-left">
                        <div className={`font-medium ${importType === 'assessments' ? 'text-primary-700' : 'text-gray-900'}`}>
                          Assessments
                        </div>
                        <div className="text-xs text-gray-500">
                          Import assessment templates
                        </div>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setImportType('responses')}
                      className={`flex items-center p-4 border-2 rounded-lg ${
                        importType === 'responses' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className={`h-5 w-5 mr-3 ${importType === 'responses' ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="text-left">
                        <div className={`font-medium ${importType === 'responses' ? 'text-primary-700' : 'text-gray-900'}`}>
                          Responses
                        </div>
                        <div className="text-xs text-gray-500">
                          Import assessment responses
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                
                {importType === 'users' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department (Optional)
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      If selected, imported users will be assigned to this department
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".csv,.xlsx"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        CSV or Excel files up to 10MB
                      </p>
                    </div>
                  </div>
                  {selectedFile && (
                    <div className="mt-2 text-sm text-gray-600 flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-gray-500" />
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Import Format</h3>
                  {importType === 'users' && (
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">CSV file should have the following columns:</p>
                      <code className="bg-gray-100 p-1 rounded text-xs block mb-2">
                        email,firstName,lastName,role,department
                      </code>
                      <p className="mb-1">Where:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        <li><strong>email</strong>: User's email address (required)</li>
                        <li><strong>firstName</strong>: User's first name (required)</li>
                        <li><strong>lastName</strong>: User's last name (required)</li>
                        <li><strong>role</strong>: One of: employee, reviewer, org_admin, subscriber (defaults to employee)</li>
                        <li><strong>department</strong>: Department name (optional)</li>
                      </ul>
                    </div>
                  )}
                  
                  {importType === 'assessments' && (
                    <div className="text-sm text-gray-600">
                      <p>Please download and use our assessment template format.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        leftIcon={<Download className="h-4 w-4" />}
                        onClick={() => {
                          // Create and download template
                          const template = 'title,description,section,question,questionType,isRequired,scaleMax\n' +
                            'Leadership Assessment,Evaluate leadership skills,Communication,How effectively does this person communicate complex ideas?,rating,true,7\n' +
                            'Leadership Assessment,Evaluate leadership skills,Communication,How well does this person listen to others?,rating,true,7\n' +
                            'Leadership Assessment,Evaluate leadership skills,Decision Making,How well does this person make decisions under pressure?,rating,true,7';
                          
                          const blob = new Blob([template], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'assessment_template.csv';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download Template
                      </Button>
                    </div>
                  )}
                  
                  {importType === 'responses' && (
                    <div className="text-sm text-gray-600">
                      <p>Please download and use our responses template format.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        leftIcon={<Download className="h-4 w-4" />}
                        onClick={() => {
                          // Create and download template
                          const template = 'assessmentId,employeeEmail,reviewerEmail,questionId,rating,comment\n' +
                            'assessment-123,john.doe@example.com,jane.smith@example.com,question-1,5,Good communication skills\n' +
                            'assessment-123,john.doe@example.com,jane.smith@example.com,question-2,4,Shows potential but needs improvement';
                          
                          const blob = new Blob([template], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'responses_template.csv';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download Template
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end w-full">
                <Button
                  onClick={handleImport}
                  isLoading={isLoading}
                  disabled={!selectedFile || isLoading}
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  Import
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Recent Imports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Imports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentImports.length === 0 ? (
                <div className="text-center py-6">
                  <FilePlus className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No imports yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Import data to see your import history here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Results
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentImports.map((importLog) => (
                        <tr key={importLog.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {importLog.fileName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              {getImportTypeIcon(importLog.importType)}
                              <span className="ml-2 capitalize">{importLog.importType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(importLog.startedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(importLog.status)}
                              <span className={`ml-2 text-sm ${
                                importLog.status === 'completed' ? 'text-success-700' :
                                importLog.status === 'failed' ? 'text-error-700' :
                                'text-gray-500'
                              }`}>
                                {importLog.status.charAt(0).toUpperCase() + importLog.status.slice(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {importLog.status === 'completed' ? (
                              <span>
                                {importLog.recordsCreated} created, {importLog.recordsUpdated} updated
                              </span>
                            ) : importLog.status === 'failed' ? (
                              <span className="text-error-600">{importLog.errorMessage}</span>
                            ) : (
                              <span>-</span>
                            )}
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
      )}
      
      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Export Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setExportType('users')}
                      className={`flex items-center p-4 border-2 rounded-lg ${
                        exportType === 'users' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Users className={`h-5 w-5 mr-3 ${exportType === 'users' ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="text-left">
                        <div className={`font-medium ${exportType === 'users' ? 'text-primary-700' : 'text-gray-900'}`}>
                          Users
                        </div>
                        <div className="text-xs text-gray-500">
                          Export user list with departments
                        </div>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setExportType('assessments')}
                      className={`flex items-center p-4 border-2 rounded-lg ${
                        exportType === 'assessments' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ClipboardList className={`h-5 w-5 mr-3 ${exportType === 'assessments' ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="text-left">
                        <div className={`font-medium ${exportType === 'assessments' ? 'text-primary-700' : 'text-gray-900'}`}>
                          Assessments
                        </div>
                        <div className="text-xs text-gray-500">
                          Export assessment templates
                        </div>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setExportType('results')}
                      className={`flex items-center p-4 border-2 rounded-lg ${
                        exportType === 'results' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className={`h-5 w-5 mr-3 ${exportType === 'results' ? 'text-primary-600' : 'text-gray-500'}`} />
                      <div className="text-left">
                        <div className={`font-medium ${exportType === 'results' ? 'text-primary-700' : 'text-gray-900'}`}>
                          Results
                        </div>
                        <div className="text-xs text-gray-500">
                          Export assessment results
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                
                {(exportType === 'users' || exportType === 'assessments') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department Filter (Optional)
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      If selected, only data from this department will be exported
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Options
                  </label>
                  <div className="space-y-3">
                    {(exportType === 'results' || exportType === 'analytics') && (
                      <div className="flex items-center">
                        <input
                          id="anonymize"
                          type="checkbox"
                          checked={anonymizeExport}
                          onChange={(e) => setAnonymizeExport(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="anonymize" className="ml-2 block text-sm text-gray-900">
                          Anonymize data (remove personally identifiable information)
                        </label>
                      </div>
                    )}
                    
                    {(exportType === 'users' || exportType === 'assessments') && (
                      <div className="flex items-center">
                        <input
                          id="headers"
                          type="checkbox"
                          checked={includeHeaders}
                          onChange={(e) => setIncludeHeaders(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="headers" className="ml-2 block text-sm text-gray-900">
                          Include column headers
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Export Format</h3>
                  <div className="text-sm text-gray-600">
                    {(exportType === 'results' || exportType === 'analytics') ? (
                      <p>Data will be exported as a PDF file with charts and visualizations.</p>
                    ) : (
                      <p>Data will be exported as a CSV file that can be opened in Excel or other spreadsheet software.</p>
                    )}
                    
                    {(exportType === 'results' || exportType === 'analytics') && anonymizeExport && (
                      <div className="mt-2 p-2 bg-primary-50 border border-primary-100 rounded text-primary-700 text-xs">
                        <Info className="h-4 w-4 inline mr-1" />
                        Anonymized exports protect individual privacy while providing valuable insights.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end w-full">
                <Button
                  onClick={handleExport}
                  isLoading={isLoading}
                  disabled={isLoading}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Recent Exports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Exports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentExports.length === 0 ? (
                <div className="text-center py-6">
                  <FilePlus className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No exports yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Export data to see your export history here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Records
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Download
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentExports.map((exportLog) => (
                        <tr key={exportLog.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {exportLog.fileName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              {getImportTypeIcon(exportLog.exportType)}
                              <span className="ml-2 capitalize">{exportLog.exportType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(exportLog.startedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(exportLog.status)}
                              <span className={`ml-2 text-sm ${
                                exportLog.status === 'completed' ? 'text-success-700' :
                                exportLog.status === 'failed' ? 'text-error-700' :
                                'text-gray-500'
                              }`}>
                                {exportLog.status.charAt(0).toUpperCase() + exportLog.status.slice(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {exportLog.recordsExported}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {exportLog.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Download className="h-4 w-4" />}
                                onClick={() => {
                                  // Simulate download
                                  alert('Download would start in production environment');
                                }}
                              >
                                Download
                              </Button>
                            )}
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
      )}
    </div>
  );
};

export default ImportExportManager;