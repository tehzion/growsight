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
  // FileSpreadsheet,
  // FilePlus,
  Clock,
  RefreshCw,
  AlertCircle,
  XCircle,
  Building,
  BarChart3
} from 'lucide-react';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import { ImportLog, ExportLog } from '../../types';

interface ImportExportManagerProps {
  onImportComplete?: () => void;
}

export const ImportExportManager: React.FC<ImportExportManagerProps> = ({ onImportComplete }) => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  // const { departments } = useDepartmentStore();
  
  // const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importType, setImportType] = useState<'users' | 'assessments' | 'responses'>('users');
  const [exportType, setExportType] = useState<'users' | 'assessments' | 'responses' | 'results' | 'analytics'>('users');
  // const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  // const [anonymizeExport, setAnonymizeExport] = useState<boolean>(true);
  // const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  
  // const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [recentImports, setRecentImports] = useState<ImportLog[]>([]);
  const [recentExports, setRecentExports] = useState<ExportLog[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
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
    setIsExporting(true);
    setStatus('idle');
    
    try {
      // Determine export scope based on user role
      const scope = user?.role === 'super_admin' ? 'all' : currentOrganization?.id;
      
      let fileName = '';
      let data: any = {};
      
      switch (exportType) {
        case 'all':
          fileName = `complete_export_${new Date().toISOString().split('T')[0]}.json`;
          data = {
            users: await exportUsers(scope),
            assessments: await exportAssessments(scope),
            results: await exportResults(scope),
            organizations: user?.role === 'super_admin' ? await exportOrganizations() : undefined
          };
          break;
        case 'users':
          fileName = `users_export_${new Date().toISOString().split('T')[0]}.json`;
          data = await exportUsers(scope);
          break;
        case 'assessments':
          fileName = `assessments_export_${new Date().toISOString().split('T')[0]}.json`;
          data = await exportAssessments(scope);
          break;
        case 'results':
          fileName = `results_export_${new Date().toISOString().split('T')[0]}.json`;
          data = await exportResults(scope);
          break;
      }
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setStatus('success');
      setStatusMessage(`Successfully exported ${exportType} data`);
    } catch (error) {
      console.error('Export error:', error);
      setStatus('error');
      setStatusMessage('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus('idle');
    }
  };
  
  // Mock export functions - replace with actual API calls
  const exportUsers = async (scope: string | 'all') => {
    // Mock implementation
    return { users: [], total: 0, scope };
  };

  const exportAssessments = async (scope: string | 'all') => {
    // Mock implementation
    return { assessments: [], total: 0, scope };
  };

  const exportResults = async (scope: string | 'all') => {
    // Mock implementation
    return { results: [], total: 0, scope };
  };

  const exportOrganizations = async () => {
    // Mock implementation
    return { organizations: [], total: 0 };
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
  
  const getRoleBasedTitle = () => {
    return user?.role === 'super_admin' 
      ? 'System-Wide Import/Export Manager' 
      : 'Organization Import/Export Manager';
  };

  const getRoleBasedDescription = () => {
    return user?.role === 'super_admin'
      ? 'Import and export data across all organizations'
      : 'Import and export data for your organization';
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getRoleBasedTitle()}</h1>
          <p className="text-gray-600 mt-2">{getRoleBasedDescription()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Download className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Type
                </label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Complete Export (All Data)</option>
                  <option value="users">Users Only</option>
                  <option value="assessments">Assessments Only</option>
                  <option value="results">Results Only</option>
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Export Scope:</p>
                    <p className="mt-1">
                      {user?.role === 'super_admin' 
                        ? 'All organizations and data' 
                        : `${currentOrganization?.name || 'Your organization'} only`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                isLoading={isExporting}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Import Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Upload className="w-6 h-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Import Data</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Type
                </label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="users">Users</option>
                  <option value="assessments">Assessments</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Import Warning:</p>
                    <p className="mt-1">
                      Importing data will overwrite existing records with the same ID. 
                      Please backup your data before importing.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleImport}
                disabled={isImporting || !selectedFile}
                isLoading={isImporting}
                className="w-full"
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Messages */}
      {status !== 'idle' && (
        <Card>
          <div className="p-4">
            <div className={`flex items-center ${
              status === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {status === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <XCircle className="w-5 h-5 mr-2" />
              )}
              <span className="font-medium">{statusMessage}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setExportType('users');
                handleExport();
              }}
              disabled={isExporting}
            >
              <Users className="w-4 h-4 mr-2" />
              Export Users
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setExportType('assessments');
                handleExport();
              }}
              disabled={isExporting}
            >
              <FileText className="w-4 h-4 mr-2" />
              Export Assessments
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setExportType('results');
                handleExport();
              }}
              disabled={isExporting}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Overview */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Data Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="w-6 h-6 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900">0</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Building className="w-6 h-6 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-600">Organizations</p>
                  <p className="text-2xl font-bold text-green-900">0</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-purple-600">Assessments</p>
                  <p className="text-2xl font-bold text-purple-900">0</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <BarChart3 className="w-6 h-6 text-orange-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-orange-600">Results</p>
                  <p className="text-2xl font-bold text-orange-900">0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ImportExportManager;