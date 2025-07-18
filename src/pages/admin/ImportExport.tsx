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
import { useUserStore } from '../../stores/userStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { supabase } from '../../lib/supabase';
import { useNotificationStore } from '../../stores/notificationStore';

const ImportExport = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { users } = useUserStore();
  const { assessments } = useAssessmentStore();
  const { results } = useAssessmentResultsStore();
  const { addNotification } = useNotificationStore();
  
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
      const scope = user?.role === 'super_admin' ? 'all' : currentOrganization?.id;
      let fileName = '';
      let data: any = {};
      
      switch (exportType) {
        case 'all':
          fileName = `complete_export_${new Date().toISOString().split('T')[0]}.json`;
          data = {
            users: await exportUsers(scope || ''),
            assessments: await exportAssessments(scope || ''),
            results: await exportResults(scope || ''),
            organizations: user?.role === 'super_admin' ? await exportOrganizations() : undefined
          };
          break;
        case 'users':
          fileName = `users_export_${new Date().toISOString().split('T')[0]}.json`;
          data = await exportUsers(scope || '');
          break;
        case 'assessments':
          fileName = `assessments_export_${new Date().toISOString().split('T')[0]}.json`;
          data = await exportAssessments(scope || '');
          break;
        case 'results':
          fileName = `results_export_${new Date().toISOString().split('T')[0]}.json`;
          data = await exportResults(scope || '');
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
      addNotification({
        title: 'Export Successful',
        message: `${exportType} data exported successfully`,
        type: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      setStatus('error');
      setStatusMessage('Failed to export data. Please try again.');
      addNotification({
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.',
        type: 'error'
      });
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
      
      // Validate import data structure
      if (!data.type || !data.data) {
        throw new Error('Invalid import file format');
      }
      
      // Process import based on type
      let importResult;
      switch (importType) {
        case 'users':
          importResult = await importUsers(data.data);
          break;
        case 'assessments':
          importResult = await importAssessments(data.data);
          break;
        default:
          throw new Error('Unsupported import type');
      }
      
      setStatus('success');
      setStatusMessage(`Successfully imported ${importResult.created} records and updated ${importResult.updated} records.`);
      setSelectedFile(null);
      
      addNotification({
        title: 'Import Successful',
        message: `Successfully imported ${importResult.created} records`,
        type: 'success'
      });
    } catch (error) {
      console.error('Import error:', error);
      setStatus('error');
      setStatusMessage('Failed to import data. Please check file format and try again.');
      addNotification({
        title: 'Import Failed',
        message: 'Failed to import data. Please check file format and try again.',
        type: 'error'
      });
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

  // Real export functions
  const exportUsers = async (scope: string | 'all') => {
    let query = supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        organization_id,
        department_id,
        is_active,
        created_at,
        updated_at,
        organizations (name),
        departments (name)
      `)
      .eq('is_active', true);

    if (scope !== 'all') {
      query = query.eq('organization_id', scope);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      users: data || [],
      total: data?.length || 0,
      scope,
      exportedAt: new Date().toISOString()
    };
  };

  const exportAssessments = async (scope: string | 'all') => {
    let query = supabase
      .from('assessments')
      .select(`
        *,
        organizations (name),
        users (first_name, last_name, email),
        assessment_questions (
          *,
          question_options (*)
        )
      `)
      .eq('is_active', true);

    if (scope !== 'all') {
      query = query.eq('organization_id', scope);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      assessments: data || [],
      total: data?.length || 0,
      scope,
      exportedAt: new Date().toISOString()
    };
  };

  const exportResults = async (scope: string | 'all') => {
    let query = supabase
      .from('assessment_results')
      .select(`
        *,
        assessments (title),
        users (first_name, last_name, email),
        organizations (name)
      `)
      .eq('is_active', true);

    if (scope !== 'all') {
      query = query.eq('organization_id', scope);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      results: data || [],
      total: data?.length || 0,
      scope,
      exportedAt: new Date().toISOString()
    };
  };

  const exportOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    return {
      organizations: data || [],
      total: data?.length || 0,
      exportedAt: new Date().toISOString()
    };
  };

  // Real import functions
  const importUsers = async (userData: any[]) => {
    let created = 0;
    let updated = 0;

    for (const user of userData) {
      try {
        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (existingUser) {
          // Update existing user
          const { error } = await supabase
            .from('users')
            .update({
              first_name: user.first_name,
              last_name: user.last_name,
              role: user.role,
              department_id: user.department_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id);

          if (!error) updated++;
        } else {
          // Create new user
          const { error } = await supabase
            .from('users')
            .insert({
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              role: user.role,
              organization_id: user.organization_id || currentOrganization?.id,
              department_id: user.department_id,
              is_active: true
            });

          if (!error) created++;
        }
      } catch (error) {
        console.error('Error importing user:', user.email, error);
      }
    }

    return { created, updated };
  };

  const importAssessments = async (assessmentData: any[]) => {
    let created = 0;
    let updated = 0;

    for (const assessment of assessmentData) {
      try {
        // Check if assessment exists
        const { data: existingAssessment } = await supabase
          .from('assessments')
          .select('id')
          .eq('title', assessment.title)
          .eq('organization_id', assessment.organization_id)
          .single();

        if (existingAssessment) {
          // Update existing assessment
          const { error } = await supabase
            .from('assessments')
            .update({
              description: assessment.description,
              assessment_type: assessment.assessment_type,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAssessment.id);

          if (!error) updated++;
        } else {
          // Create new assessment
          const { error } = await supabase
            .from('assessments')
            .insert({
              title: assessment.title,
              description: assessment.description,
              organization_id: assessment.organization_id || currentOrganization?.id,
              created_by_id: user?.id,
              assessment_type: assessment.assessment_type || 'custom',
              is_active: true
            });

          if (!error) created++;
        }
      } catch (error) {
        console.error('Error importing assessment:', assessment.title, error);
      }
    }

    return { created, updated };
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