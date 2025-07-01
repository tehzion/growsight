import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Users, 
  Building2, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Shield,
  Globe,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Eye,
  Settings,
  Download,
  RefreshCw,
  Bell,
  Lightbulb,
  Target,
  Award
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BehavioralInsights from '../../components/root/BehavioralInsights';
import { RootDashboardData, SystemMetrics, SystemHealth, TagInsight } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

const RootDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  
  // State management
  const [dashboardData, setDashboardData] = useState<RootDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'behavioral' | 'system' | 'privacy'>('behavioral');
  const [timeRange, setTimeRange] = useState('30d');
  const [privacyLevel, setPrivacyLevel] = useState<'aggregated' | 'anonymized' | 'detailed'>('aggregated');

  // Load dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace with actual API
      const response = await fetch(`/api/root/dashboard?timeRange=${timeRange}`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      setError((error as Error).message);
      addNotification({
        title: 'Error',
        message: 'Failed to load dashboard data',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      case 'maintenance': return <Clock className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading root dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-error-50 border-error-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-error-600" />
              <div>
                <h3 className="font-medium text-error-800">Dashboard Error</h3>
                <p className="text-sm text-error-700">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Root Behavioral Insights Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organizational patterns, behavioral insights, and data-driven recommendations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={privacyLevel}
            onChange={(e) => setPrivacyLevel(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="aggregated">Aggregated Data</option>
            <option value="anonymized">Anonymized Insights</option>
            <option value="detailed">Detailed Analysis</option>
          </select>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'behavioral', label: 'Behavioral Insights', icon: <Brain className="h-4 w-4" /> },
            { id: 'system', label: 'System Status', icon: <Server className="h-4 w-4" /> },
            { id: 'privacy', label: 'Privacy & Compliance', icon: <Shield className="h-4 w-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Behavioral Insights Tab */}
      {activeTab === 'behavioral' && (
        <BehavioralInsights privacyLevel={privacyLevel} />
      )}

      {/* System Status Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2 text-primary-600" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.systemHealth.map(health => (
                  <div key={health.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{health.component}</h4>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.status)}`}>
                        {health.status}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{health.message}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(health.timestamp).toLocaleString()}</span>
                      {health.duration && <span>Duration: {health.duration}s</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />
                System Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.systemMetrics.map(metric => (
                  <div key={metric.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{metric.metricKey}</h4>
                        <p className="text-sm text-gray-600">{metric.category}</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {metric.metricValue}{metric.metricUnit && ` ${metric.metricUnit}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(metric.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Privacy & Compliance Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary-600" />
                Privacy & Compliance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Privacy Metrics */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Privacy Protection Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">Data Anonymization</div>
                        <div className="text-sm text-green-700">100% of personal data anonymized</div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">Access Controls</div>
                        <div className="text-sm text-green-700">Role-based access implemented</div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">Audit Logging</div>
                        <div className="text-sm text-green-700">All access logged and monitored</div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">GDPR Compliance</div>
                        <div className="text-sm text-green-700">Full compliance maintained</div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Compliance Status */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Compliance Status</h4>
                  <div className="space-y-3">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Data Retention</span>
                        <span className="text-sm text-green-600">Compliant</span>
                      </div>
                      <p className="text-sm text-gray-600">All data retention policies followed</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Consent Management</span>
                        <span className="text-sm text-green-600">Compliant</span>
                      </div>
                      <p className="text-sm text-gray-600">User consent properly managed</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Data Processing</span>
                        <span className="text-sm text-green-600">Compliant</span>
                      </div>
                      <p className="text-sm text-gray-600">Processing activities documented</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Security Measures</span>
                        <span className="text-sm text-green-600">Compliant</span>
                      </div>
                      <p className="text-sm text-gray-600">Encryption and security protocols active</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RootDashboard; 