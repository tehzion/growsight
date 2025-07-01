import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Filter, 
  Download, 
  Search, 
  Calendar,
  User,
  Shield,
  Database,
  Settings,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  organizationId?: string;
  organizationName?: string;
}

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    user: '',
    severity: '',
    dateFrom: '',
    dateTo: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mock audit log data
  const mockLogs: AuditLogEntry[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      userId: '1',
      userName: 'Sarah Johnson',
      userRole: 'super_admin',
      action: 'user_created',
      resource: 'users',
      details: 'Created new organization admin: john.doe@newcompany.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
      organizationId: 'demo-org-1',
      organizationName: 'Acme Corporation',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      userId: '2',
      userName: 'Michael Chen',
      userRole: 'org_admin',
      action: 'assessment_published',
      resource: 'assessments',
      details: 'Published assessment: Leadership Skills Assessment',
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      severity: 'low',
      organizationId: 'demo-org-1',
      organizationName: 'Acme Corporation',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      userId: '1',
      userName: 'Sarah Johnson',
      userRole: 'super_admin',
      action: 'system_settings_updated',
      resource: 'system',
      details: 'Updated password policy settings',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'high',
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      userId: '3',
      userName: 'John Doe',
      userRole: 'employee',
      action: 'login_failed',
      resource: 'auth',
      details: 'Failed login attempt - invalid password',
      ipAddress: '203.0.113.45',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      severity: 'medium',
      organizationId: 'demo-org-1',
      organizationName: 'Acme Corporation',
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      userId: '1',
      userName: 'Sarah Johnson',
      userRole: 'super_admin',
      action: 'organization_created',
      resource: 'organizations',
      details: 'Created new organization: TechStart Solutions',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
    },
  ];

  useEffect(() => {
    // Simulate loading
    setIsLoading(true);
    setTimeout(() => {
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = logs;

    if (filters.search) {
      filtered = filtered.filter(log => 
        log.details.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.userName.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.user) {
      filtered = filtered.filter(log => log.userId === filters.user);
    }

    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) <= new Date(filters.dateTo)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportLogs = async () => {
    setIsLoading(true);
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const csvContent = [
        'Timestamp,User,Role,Action,Resource,Details,IP Address,Severity',
        ...filteredLogs.map(log => 
          `"${log.timestamp}","${log.userName}","${log.userRole}","${log.action}","${log.resource}","${log.details}","${log.ipAddress}","${log.severity}"`
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('user')) return <User className="h-4 w-4" />;
    if (action.includes('system')) return <Settings className="h-4 w-4" />;
    if (action.includes('organization')) return <Shield className="h-4 w-4" />;
    if (action.includes('assessment')) return <Database className="h-4 w-4" />;
    if (action.includes('login') || action.includes('auth')) return <Eye className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[severity as keyof typeof colors]}`}>
        {severity === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      org_admin: 'bg-indigo-100 text-indigo-800',
      employee: 'bg-blue-100 text-blue-800',
      reviewer: 'bg-green-100 text-green-800',
    };

    const labels = {
      super_admin: 'Super Admin',
      org_admin: 'Org Admin',
      employee: 'Employee',
      reviewer: 'Reviewer',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueUsers = [...new Set(logs.map(log => ({ id: log.userId, name: log.userName })))];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track all system activities and user actions for security and compliance
          </p>
        </div>
        <Button
          onClick={handleExportLogs}
          isLoading={isLoading}
          leftIcon={<Download className="h-4 w-4" />}
        >
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <FormInput
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>

            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>

            <select
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="From Date"
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="To Date"
            />
          </div>

          {Object.values(filters).some(filter => filter) && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {filteredLogs.length} of {logs.length} entries
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  search: '',
                  action: '',
                  user: '',
                  severity: '',
                  dateFrom: '',
                  dateTo: '',
                })}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No logs found</h3>
              <p className="text-gray-500 mt-1">
                {Object.values(filters).some(filter => filter) 
                  ? 'Try adjusting your search or filters'
                  : 'No system activity has been logged yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {getActionIcon(log.action)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          {getSeverityBadge(log.severity)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {log.userName} {getRoleBadge(log.userRole)}
                          </span>
                          {log.organizationName && (
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              {log.organizationName}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {log.ipAddress}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;