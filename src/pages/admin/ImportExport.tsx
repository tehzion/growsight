import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  Upload, 
  Download, 
  FileText, 
  Users, 
  Building, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';

const ImportExport = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportType, setExportType] = useState<'all' | 'users' | 'assessments' | 'results'>('all');
  const [importType, setImportType] = useState<'users' | 'assessments'>('users');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setStatus('idle');
    
    try {
      // Mock export functionality
      const scope = user?.role === 'super_admin' ? 'all' : currentOrganization?.id;
      const fileName = `${exportType}_export_${new Date().toISOString().split('T')[0]}.json`;
      
      // Create mock data
      const mockData = {
        type: exportType,
        scope,
        timestamp: new Date().toISOString(),
        data: []
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' });
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

  const handleImport = async () => {
    if (!selectedFile) {
      setStatus('error');
      setStatusMessage('Please select a file to import');
      return;
    }
    
    setIsImporting(true);
    setStatus('idle');
    
    try {
      const fileContent = await selectedFile.text();
      const data = JSON.parse(fileContent);
      
      // Mock import functionality
      console.log('Importing data:', data);
      
      setStatus('success');
      setStatusMessage(`Successfully imported ${importType} data`);
      setSelectedFile(null);
    } catch (error) {
      console.error('Import error:', error);
      setStatus('error');
      setStatusMessage('Failed to import data. Please check file format and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus('idle');
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

export default ImportExport; 