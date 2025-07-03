import React from 'react';
import { CheckCircle, User, Building2, Settings, FileText, Info } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';

const WelcomeMessage: React.FC = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';

  const getRoleSpecificMessage = () => {
    if (isSuperAdmin) {
      return {
        title: 'Welcome to the 360° Feedback Platform',
        subtitle: 'You have full system administration access',
        description: 'As a Super Administrator, you can manage all organizations, users, and system settings.'
      };
    } else if (isOrgAdmin) {
      return {
        title: `Welcome to ${currentOrganization?.name || 'your organization'}`,
        subtitle: 'You are an Organization Administrator',
        description: 'You can manage users, assessments, and branding for your organization.'
      };
    } else {
      return {
        title: `Welcome to ${currentOrganization?.name || 'the platform'}`,
        subtitle: 'You are ready to participate in feedback assessments',
        description: 'You can view and participate in feedback assessments assigned to you.'
      };
    }
  };

  const welcomeInfo = getRoleSpecificMessage();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Welcome Header */}
      <div className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-primary-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            {welcomeInfo.title}
          </h1>
          <p className="text-xl md:text-2xl text-primary-600 font-medium">
            {welcomeInfo.subtitle}
          </p>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {welcomeInfo.description}
          </p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200 shadow-lg">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-lg text-gray-600 mb-3">{user?.email}</p>
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {isSuperAdmin ? 'Super Administrator' : 
                   isOrgAdmin ? 'Organization Administrator' : 
                   'Employee'}
                </span>
                {currentOrganization && (
                  <span className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    {currentOrganization.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-blue-50 border-blue-200 shadow-lg">
        <CardContent className="p-8">
          <h3 className="font-semibold text-blue-900 mb-6 flex items-center text-xl">
            <FileText className="h-6 w-6 mr-3" />
            Quick Tips
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div className="space-y-2">
              <h4 className="font-medium text-lg">View Your Dashboard</h4>
              <p className="leading-relaxed">Check your dashboard for any pending assessments and recent activity.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-lg">Explore Features</h4>
              <p className="leading-relaxed">Navigate through the platform to see all available features and capabilities.</p>
            </div>
            {isOrgAdmin && (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">Organization Management</h4>
                  <p className="leading-relaxed">Manage users, assessments, and organization settings from the admin panel.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">Branding Options</h4>
                  <p className="leading-relaxed">View branding settings and customization options for your organization.</p>
                </div>
              </>
            )}
            {isSuperAdmin && (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">System Overview</h4>
                  <p className="leading-relaxed">Access system-wide analytics and manage all organizations and users.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">Global Settings</h4>
                  <p className="leading-relaxed">Configure system settings, security policies, and default configurations.</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeMessage; 