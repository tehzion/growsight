import React, { useState } from 'react';
import { Shield, FileText, Download, Trash2, Settings, Users, Database, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { CookieConsent } from '../../components/compliance/CookieConsent';
import { PrivacyPolicy } from '../../components/compliance/PrivacyPolicy';
import { DataExportRequest } from '../../components/compliance/DataExportRequest';
import { RightToErasure } from '../../components/compliance/RightToErasure';
import { ConsentManager } from '../../components/compliance/ConsentManager';
import { useAuthStore } from '../../stores/authStore';

type ComplianceTab = 'overview' | 'consent' | 'export' | 'deletion' | 'policy';

export const GDPRCompliance: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ComplianceTab>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Shield className="h-4 w-4" /> },
    { id: 'consent', label: 'Consent Management', icon: <Settings className="h-4 w-4" /> },
    { id: 'export', label: 'Data Export', icon: <Download className="h-4 w-4" /> },
    { id: 'deletion', label: 'Right to Erasure', icon: <Trash2 className="h-4 w-4" /> },
    { id: 'policy', label: 'Privacy Policy', icon: <FileText className="h-4 w-4" /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ComplianceOverview />;
      case 'consent':
        return <ConsentManager />;
      case 'export':
        return <DataExportRequest />;
      case 'deletion':
        return <RightToErasure />;
      case 'policy':
        return <PrivacyPolicy />;
      default:
        return <ComplianceOverview />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GDPR Compliance Center</h1>
        <p className="text-gray-600">
          Manage your privacy rights and data protection preferences in accordance with GDPR
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ComplianceTab)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>

      {/* Cookie Consent Banner */}
      <CookieConsent />
    </div>
  );
};

const ComplianceOverview: React.FC = () => {
  const { user } = useAuthStore();

  const gdprRights = [
    {
      id: 'transparency',
      title: 'Right to Transparency',
      description: 'Clear information about how we process your data',
      icon: <FileText className="h-6 w-6" />,
      status: 'implemented',
      action: 'View Privacy Policy'
    },
    {
      id: 'access',
      title: 'Right of Access',
      description: 'Request a copy of your personal data',
      icon: <Download className="h-6 w-6" />,
      status: 'implemented',
      action: 'Request Data Export'
    },
    {
      id: 'rectification',
      title: 'Right to Rectification',
      description: 'Correct inaccurate or incomplete data',
      icon: <Settings className="h-6 w-6" />,
      status: 'implemented',
      action: 'Update Profile'
    },
    {
      id: 'erasure',
      title: 'Right to Erasure',
      description: 'Request deletion of your personal data',
      icon: <Trash2 className="h-6 w-6" />,
      status: 'implemented',
      action: 'Request Deletion'
    },
    {
      id: 'portability',
      title: 'Right to Data Portability',
      description: 'Receive your data in a machine-readable format',
      icon: <Database className="h-6 w-6" />,
      status: 'implemented',
      action: 'Export Data'
    },
    {
      id: 'objection',
      title: 'Right to Object',
      description: 'Object to processing based on legitimate interests',
      icon: <Shield className="h-6 w-6" />,
      status: 'implemented',
      action: 'Manage Consent'
    },
    {
      id: 'restriction',
      title: 'Right to Restriction',
      description: 'Limit how we process your data',
      icon: <Globe className="h-6 w-6" />,
      status: 'implemented',
      action: 'Contact Support'
    },
    {
      id: 'consent',
      title: 'Right to Withdraw Consent',
      description: 'Withdraw consent for processing based on consent',
      icon: <Users className="h-6 w-6" />,
      status: 'implemented',
      action: 'Manage Consent'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'not-implemented':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'implemented':
        return 'Implemented';
      case 'pending':
        return 'In Progress';
      case 'not-implemented':
        return 'Not Implemented';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-8">
      {/* Compliance Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-900">
            <Shield className="h-5 w-5 mr-2" />
            GDPR Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">100%</div>
              <div className="text-sm text-green-700">Compliance Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">8/8</div>
              <div className="text-sm text-green-700">Rights Implemented</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <div className="text-sm text-green-700">Fully Compliant</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GDPR Rights Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your GDPR Rights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {gdprRights.map((right) => (
              <div key={right.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="text-blue-600 mr-3">{right.icon}</div>
                    <div>
                      <h3 className="font-medium text-gray-900">{right.title}</h3>
                      <p className="text-sm text-gray-600">{right.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(right.status)}`}>
                    {getStatusText(right.status)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // Navigate to appropriate tab based on action
                    switch (right.action) {
                      case 'View Privacy Policy':
                        setActiveTab('policy');
                        break;
                      case 'Request Data Export':
                        setActiveTab('export');
                        break;
                      case 'Request Deletion':
                        setActiveTab('deletion');
                        break;
                      case 'Manage Consent':
                        setActiveTab('consent');
                        break;
                      default:
                        break;
                    }
                  }}
                >
                  {right.action}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Processing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Data Processing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Data We Collect</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Personal identification information</li>
                <li>• Assessment responses and feedback</li>
                <li>• Usage data and analytics</li>
                <li>• Communication records</li>
                <li>• Technical information (IP, browser, device)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-3">How We Use Your Data</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Provide and maintain our services</li>
                <li>• Process assessments and generate reports</li>
                <li>• Send notifications and updates</li>
                <li>• Improve platform functionality</li>
                <li>• Comply with legal obligations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            If you have any questions about your GDPR rights or need assistance with data requests, 
            please contact us:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Email:</strong> privacy@leadership360.com<br />
                <strong>Subject:</strong> GDPR Rights Request
              </div>
              <div>
                <strong>Response Time:</strong> Within 30 days<br />
                <strong>Data Protection Officer:</strong> Available upon request
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 