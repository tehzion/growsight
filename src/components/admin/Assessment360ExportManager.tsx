import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FilePdf, 
  Users, 
  Eye, 
  EyeOff,
  Filter,
  Calendar,
  BarChart3,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useAssessment360Store } from '../../stores/assessment360Store';
import { assessment360ExportService, ExportOptions } from '../../services/assessment360ExportService';
import Button from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import FormInput from '../ui/FormInput';

interface Assessment360ExportManagerProps {
  assessmentId?: string;
  participantId?: string;
  onExportComplete?: (success: boolean, message: string) => void;
}

const Assessment360ExportManager: React.FC<Assessment360ExportManagerProps> = ({
  assessmentId,
  participantId,
  onExportComplete
}) => {
  const { user } = useAuthStore();
  const { overviews, fetchOverviews } = useAssessment360Store();
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeNames: false,
    includeDetails: false,
    includeCharts: false
  });
  
  const [filters, setFilters] = useState({
    assessmentId: assessmentId || '',
    participantId: participantId || '',
    organizationId: '',
    departmentId: '',
    relationshipType: ''
  });

  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const canIncludeNames = isSuperAdmin || isOrgAdmin;

  useEffect(() => {
    if (assessmentId) {
      fetchOverviews(assessmentId);
    }
  }, [assessmentId]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const options: ExportOptions = {
        ...exportOptions,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
        filters: {
          assessmentId: filters.assessmentId || undefined,
          participantId: filters.participantId || undefined,
          organizationId: filters.organizationId || undefined,
          departmentId: filters.departmentId || undefined,
          relationshipType: filters.relationshipType || undefined
        }
      };

      setExportProgress(25);

      const result = await assessment360ExportService.exportData(options);

      setExportProgress(75);

      if (result.success && result.data && result.filename) {
        assessment360ExportService.downloadFile(result.data as Blob, result.filename);
        setExportProgress(100);
        onExportComplete?.(true, `Export completed successfully: ${result.filename}`);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      onExportComplete?.(false, (error as Error).message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const getExportButtonText = () => {
    if (isExporting) {
      return `Exporting... ${exportProgress}%`;
    }
    
    switch (exportOptions.format) {
      case 'csv':
        return 'Export CSV';
      case 'pdf':
        return 'Export PDF';
      case 'excel':
        return 'Export Excel';
      default:
        return 'Export';
    }
  };

  const getExportIcon = () => {
    if (isExporting) {
      return <Loader className="h-4 w-4 animate-spin" />;
    }
    
    switch (exportOptions.format) {
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'pdf':
        return <FilePdf className="h-4 w-4" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getDataSummary = () => {
    const filteredData = overviews.filter(overview => {
      if (filters.assessmentId && overview.assessmentId !== filters.assessmentId) return false;
      if (filters.participantId && overview.participantId !== filters.participantId) return false;
      if (filters.organizationId && overview.organizationId !== filters.organizationId) return false;
      if (filters.departmentId && overview.departmentId !== filters.departmentId) return false;
      return true;
    });

    const totalParticipants = filteredData.length;
    const completedAssessments = filteredData.filter(o => o.completionRate >= 90).length;
    const inProgressAssessments = filteredData.filter(o => o.completionRate >= 70 && o.completionRate < 90).length;
    const pendingAssessments = filteredData.filter(o => o.completionRate < 70).length;

    return {
      totalParticipants,
      completedAssessments,
      inProgressAssessments,
      pendingAssessments,
      averageCompletionRate: totalParticipants > 0 
        ? (filteredData.reduce((sum, o) => sum + o.completionRate, 0) / totalParticipants).toFixed(1)
        : '0.0'
    };
  };

  const summary = getDataSummary();

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export 360° Assessment Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export Format
              </label>
              <div className="space-y-2">
                {[
                  { value: 'csv', label: 'CSV File', icon: <FileText className="h-4 w-4" />, description: 'Simple spreadsheet format' },
                  { value: 'excel', label: 'Excel File', icon: <FileSpreadsheet className="h-4 w-4" />, description: 'Advanced spreadsheet with multiple sheets' },
                  { value: 'pdf', label: 'PDF Report', icon: <FilePdf className="h-4 w-4" />, description: 'Professional report format' }
                ].map(format => (
                  <label key={format.value} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={exportOptions.format === format.value}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                      className="text-primary-600"
                    />
                    <div className="flex items-center space-x-2">
                      {format.icon}
                      <div>
                        <div className="font-medium">{format.label}</div>
                        <div className="text-sm text-gray-500">{format.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Content Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Content Options
              </label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDetails}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeDetails: e.target.checked }))}
                    className="text-primary-600"
                  />
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Include detailed results</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCharts}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
                    className="text-primary-600"
                  />
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Include charts and graphs</span>
                  </div>
                </label>

                {canIncludeNames && (
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeNames}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, includeNames: e.target.checked }))}
                      className="text-primary-600"
                    />
                    <div className="flex items-center space-x-2">
                      {exportOptions.includeNames ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      <span>Include participant names</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Filter className="h-4 w-4 inline mr-2" />
                Filters
              </label>
              <div className="space-y-3">
                <FormInput
                  label="Assessment ID"
                  value={filters.assessmentId}
                  onChange={(e) => setFilters(prev => ({ ...prev, assessmentId: e.target.value }))}
                  placeholder="Filter by assessment"
                />
                
                <FormInput
                  label="Participant ID"
                  value={filters.participantId}
                  onChange={(e) => setFilters(prev => ({ ...prev, participantId: e.target.value }))}
                  placeholder="Filter by participant"
                />

                {isSuperAdmin && (
                  <FormInput
                    label="Organization ID"
                    value={filters.organizationId}
                    onChange={(e) => setFilters(prev => ({ ...prev, organizationId: e.target.value }))}
                    placeholder="Filter by organization"
                  />
                )}

                <FormInput
                  label="Department ID"
                  value={filters.departmentId}
                  onChange={(e) => setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
                  placeholder="Filter by department"
                />

                <select
                  value={filters.relationshipType}
                  onChange={(e) => setFilters(prev => ({ ...prev, relationshipType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All relationship types</option>
                  <option value="self">Self Assessment</option>
                  <option value="peer">Peer Feedback</option>
                  <option value="subordinate">Subordinate Feedback</option>
                  <option value="supervisor">Supervisor Feedback</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4 inline mr-2" />
              Date Range (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                type="date"
                label="Start Date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <FormInput
                type="date"
                label="End Date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Data Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.totalParticipants}</div>
              <div className="text-sm text-blue-800">Total Participants</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.completedAssessments}</div>
              <div className="text-sm text-green-800">Completed</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{summary.inProgressAssessments}</div>
              <div className="text-sm text-yellow-800">In Progress</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.pendingAssessments}</div>
              <div className="text-sm text-red-800">Pending</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{summary.averageCompletionRate}%</div>
              <div className="text-sm text-purple-800">Avg Completion</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ready to Export</h3>
              <p className="text-sm text-gray-600">
                {summary.totalParticipants} participants will be included in the export
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ assessmentId: '', participantId: '', organizationId: '', departmentId: '', relationshipType: '' });
                  setDateRange({ start: '', end: '' });
                  setExportOptions({ format: 'csv', includeNames: false, includeDetails: false, includeCharts: false });
                }}
              >
                Reset
              </Button>
              
              <Button
                onClick={handleExport}
                disabled={isExporting || summary.totalParticipants === 0}
                leftIcon={getExportIcon()}
                className="min-w-[140px]"
              >
                {getExportButtonText()}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Exporting data... {exportProgress}% complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Export Permissions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isSuperAdmin && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Super Admin: Can export all data across all organizations with names</span>
              </div>
            )}
            
            {isOrgAdmin && (
              <div className="flex items-center space-x-2 text-blue-600">
                <CheckCircle className="h-4 w-4" />
                <span>Organization Admin: Can export organization data with names</span>
              </div>
            )}
            
            {!isSuperAdmin && !isOrgAdmin && (
              <div className="flex items-center space-x-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span>User: Can only export own data (names always included)</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-gray-600">
              <EyeOff className="h-4 w-4" />
              <span>Anonymous mode: Reviewer names are never included in exports</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assessment360ExportManager; 