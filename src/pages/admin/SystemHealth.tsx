import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  BarChart4,
  Download,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
  };
  database: {
    connections: number;
    size: number;
    queryTime: number;
    lastBackup: string;
  };
  services: {
    name: string;
    status: 'healthy' | 'warning' | 'critical' | 'stopped';
    uptime: number;
    lastRestart: string;
  }[];
  performance: {
    responseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
}

const SystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'performance'>('overview');

  // Mock data for demo
  const mockMetrics: SystemMetrics = {
    cpu: {
      usage: 32,
      cores: 8,
      temperature: 45,
    },
    memory: {
      total: 16384, // MB
      used: 8192,   // MB
      free: 8192,   // MB
    },
    disk: {
      total: 512000, // MB
      used: 256000,  // MB
      free: 256000,  // MB
    },
    database: {
      connections: 24,
      size: 1024, // MB
      queryTime: 45, // ms
      lastBackup: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    services: [
      {
        name: 'Web Server',
        status: 'healthy',
        uptime: 15 * 24 * 60 * 60, // 15 days in seconds
        lastRestart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'Database',
        status: 'healthy',
        uptime: 10 * 24 * 60 * 60, // 10 days in seconds
        lastRestart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'Email Service',
        status: 'warning',
        uptime: 5 * 24 * 60 * 60, // 5 days in seconds
        lastRestart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'Background Jobs',
        status: 'healthy',
        uptime: 7 * 24 * 60 * 60, // 7 days in seconds
        lastRestart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'Cache',
        status: 'healthy',
        uptime: 3 * 24 * 60 * 60, // 3 days in seconds
        lastRestart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    performance: {
      responseTime: 120, // ms
      requestsPerMinute: 45,
      errorRate: 0.5, // percentage
    },
  };

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production, this would fetch real metrics from the server
      setMetrics(mockMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Set up auto-refresh every 5 minutes
    const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success-100 text-success-800';
      case 'warning':
        return 'bg-warning-100 text-warning-800';
      case 'critical':
        return 'bg-error-100 text-error-800';
      case 'stopped':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-error-600" />;
      case 'stopped':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 60) return 'bg-success-500';
    if (percentage < 80) return 'bg-warning-500';
    return 'bg-error-500';
  };

  const handleExportMetrics = async () => {
    setIsLoading(true);
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const jsonData = JSON.stringify(metrics, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-metrics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!metrics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor system performance, resource usage, and service status
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={fetchMetrics}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            isLoading={isLoading}
          >
            Refresh
          </Button>
          <Button
            onClick={handleExportMetrics}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export Metrics
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-sm text-gray-500 flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>System Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'services'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Server className="h-4 w-4" />
            <span>Services</span>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'performance'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart4 className="h-4 w-4" />
            <span>Performance</span>
          </button>
        </nav>
      </div>

      {/* System Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Resource Usage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-primary-100 rounded-full mr-3">
                      <Cpu className="h-5 w-5 text-primary-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">CPU</h3>
                  </div>
                  <span className={`text-lg font-bold ${
                    metrics.cpu.usage < 60 ? 'text-success-600' :
                    metrics.cpu.usage < 80 ? 'text-warning-600' : 'text-error-600'
                  }`}>
                    {metrics.cpu.usage}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className={`h-2.5 rounded-full ${getUsageColor(metrics.cpu.usage)}`} 
                    style={{ width: `${metrics.cpu.usage}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Cores</div>
                  <div className="text-right font-medium">{metrics.cpu.cores}</div>
                  <div className="text-gray-500">Temperature</div>
                  <div className="text-right font-medium">{metrics.cpu.temperature}°C</div>
                </div>
              </CardContent>
            </Card>
            
            {/* Memory */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-secondary-100 rounded-full mr-3">
                      <HardDrive className="h-5 w-5 text-secondary-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Memory</h3>
                  </div>
                  <span className={`text-lg font-bold ${
                    (metrics.memory.used / metrics.memory.total * 100) < 60 ? 'text-success-600' :
                    (metrics.memory.used / metrics.memory.total * 100) < 80 ? 'text-warning-600' : 'text-error-600'
                  }`}>
                    {Math.round(metrics.memory.used / metrics.memory.total * 100)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className={`h-2.5 rounded-full ${getUsageColor(metrics.memory.used / metrics.memory.total * 100)}`} 
                    style={{ width: `${metrics.memory.used / metrics.memory.total * 100}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Total</div>
                  <div className="text-right font-medium">{formatBytes(metrics.memory.total * 1024 * 1024)}</div>
                  <div className="text-gray-500">Used</div>
                  <div className="text-right font-medium">{formatBytes(metrics.memory.used * 1024 * 1024)}</div>
                  <div className="text-gray-500">Free</div>
                  <div className="text-right font-medium">{formatBytes(metrics.memory.free * 1024 * 1024)}</div>
                </div>
              </CardContent>
            </Card>
            
            {/* Disk */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-accent-100 rounded-full mr-3">
                      <Database className="h-5 w-5 text-accent-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Disk</h3>
                  </div>
                  <span className={`text-lg font-bold ${
                    (metrics.disk.used / metrics.disk.total * 100) < 60 ? 'text-success-600' :
                    (metrics.disk.used / metrics.disk.total * 100) < 80 ? 'text-warning-600' : 'text-error-600'
                  }`}>
                    {Math.round(metrics.disk.used / metrics.disk.total * 100)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className={`h-2.5 rounded-full ${getUsageColor(metrics.disk.used / metrics.disk.total * 100)}`} 
                    style={{ width: `${metrics.disk.used / metrics.disk.total * 100}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Total</div>
                  <div className="text-right font-medium">{formatBytes(metrics.disk.total * 1024 * 1024)}</div>
                  <div className="text-gray-500">Used</div>
                  <div className="text-right font-medium">{formatBytes(metrics.disk.used * 1024 * 1024)}</div>
                  <div className="text-gray-500">Free</div>
                  <div className="text-right font-medium">{formatBytes(metrics.disk.free * 1024 * 1024)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Database Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Database Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Active Connections</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.database.connections}</div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Database Size</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{formatBytes(metrics.database.size * 1024 * 1024)}</div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Avg Query Time</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.database.queryTime} ms</div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Last Backup</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {new Date(metrics.database.lastBackup).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(metrics.database.lastBackup).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center w-full">
                <span className="text-sm text-gray-500">
                  Database is running normally
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    alert('Database backup initiated. This may take a few minutes.');
                  }}
                >
                  Backup Now
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Services */}
      {activeTab === 'services' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.services.map((service, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(service.status)}
                      <h3 className="ml-2 font-medium text-gray-900">{service.name}</h3>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        alert(`Service ${service.name} restart initiated.`);
                      }}
                    >
                      Restart
                    </Button>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Uptime:</span>
                      <span className="ml-2 font-medium">{formatUptime(service.uptime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Restart:</span>
                      <span className="ml-2 font-medium">{new Date(service.lastRestart).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Avg Response Time</div>
                    <ArrowUpRight className={`h-4 w-4 ${metrics.performance.responseTime > 200 ? 'text-error-500' : 'text-success-500'}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.performance.responseTime} ms</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {metrics.performance.responseTime < 100 ? 'Excellent' : 
                     metrics.performance.responseTime < 200 ? 'Good' : 
                     metrics.performance.responseTime < 500 ? 'Fair' : 'Poor'}
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Requests Per Minute</div>
                    <ArrowUpRight className="h-4 w-4 text-success-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.performance.requestsPerMinute}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Peak: 120 RPM
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Error Rate</div>
                    <ArrowUpRight className={`h-4 w-4 ${metrics.performance.errorRate > 1 ? 'text-error-500' : 'text-success-500'}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.performance.errorRate}%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {metrics.performance.errorRate < 0.5 ? 'Excellent' : 
                     metrics.performance.errorRate < 1 ? 'Good' : 
                     metrics.performance.errorRate < 2 ? 'Fair' : 'Poor'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-success-600 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-success-800">Database Query Performance</h4>
                      <p className="text-sm text-success-700 mt-1">
                        Database queries are performing well with an average response time of {metrics.database.queryTime}ms.
                      </p>
                    </div>
                  </div>
                </div>
                
                {metrics.performance.responseTime > 100 && (
                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-medium text-warning-800">API Response Time</h4>
                        <p className="text-sm text-warning-700 mt-1">
                          Average API response time is {metrics.performance.responseTime}ms, which is above the recommended 100ms threshold.
                        </p>
                        <div className="mt-2">
                          <strong className="text-sm text-warning-800">Recommendations:</strong>
                          <ul className="mt-1 text-xs text-warning-700 list-disc list-inside ml-2">
                            <li>Implement API response caching</li>
                            <li>Optimize database queries</li>
                            <li>Consider adding more server resources</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.memory.used / metrics.memory.total > 0.7 && (
                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-warning-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-medium text-warning-800">Memory Usage</h4>
                        <p className="text-sm text-warning-700 mt-1">
                          Memory usage is at {Math.round(metrics.memory.used / metrics.memory.total * 100)}%, which is approaching the warning threshold.
                        </p>
                        <div className="mt-2">
                          <strong className="text-sm text-warning-800">Recommendations:</strong>
                          <ul className="mt-1 text-xs text-warning-700 list-disc list-inside ml-2">
                            <li>Check for memory leaks</li>
                            <li>Optimize application memory usage</li>
                            <li>Consider increasing server memory</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;