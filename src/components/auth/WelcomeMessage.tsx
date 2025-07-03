import React from 'react';
import { CheckCircle, ArrowRight, User, Building2, Settings, FileText } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';

interface WelcomeMessageProps {
  onCompleteProfile: () => void;
  onSetupBranding?: () => void;
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ onCompleteProfile, onSetupBranding }) => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';

  const getWelcomeSteps = () => {
    const steps = [
      {
        icon: <User className="h-5 w-5" />,
        title: 'Complete Your Profile',
        description: 'Add your personal information, job title, and department details.',
        action: 'Complete Profile',
        onClick: onCompleteProfile,
        priority: 1
      }
    ];

    if (isOrgAdmin && onSetupBranding) {
      steps.push({
        icon: <Building2 className="h-5 w-5" />,
        title: 'Setup Organization Branding',
        description: 'Configure your organization logo, colors, and branding for PDF exports and emails.',
        action: 'Setup Branding',
        onClick: onSetupBranding,
        priority: 2
      });
    }

    if (isSuperAdmin) {
      steps.push({
        icon: <Settings className="h-5 w-5" />,
        title: 'Configure System Settings',
        description: 'Set up system-wide settings, security policies, and default configurations.',
        action: 'System Settings',
        onClick: () => window.location.href = '/admin/settings',
        priority: 2
      });
    }

    return steps.sort((a, b) => a.priority - b.priority);
  };

  const getRoleSpecificMessage = () => {
    if (isSuperAdmin) {
      return {
        title: 'Welcome to the 360° Feedback Platform',
        subtitle: 'You have full system administration access',
        description: 'As a Super Administrator, you can manage all organizations, users, and system settings. Let\'s get you started with the essential setup tasks.'
      };
    } else if (isOrgAdmin) {
      return {
        title: `Welcome to ${currentOrganization?.name || 'your organization'}`,
        subtitle: 'You are an Organization Administrator',
        description: 'You can manage users, assessments, and branding for your organization. Let\'s set up your profile and organization branding.'
      };
    } else {
      return {
        title: `Welcome to ${currentOrganization?.name || 'the platform'}`,
        subtitle: 'You are ready to participate in feedback assessments',
        description: 'Complete your profile to get the most out of your feedback experience and help others provide meaningful insights.'
      };
    }
  };

  const welcomeInfo = getRoleSpecificMessage();
  const steps = getWelcomeSteps();

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

      {/* Setup Steps */}
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 text-center">
          Let's Get Started
        </h2>
        <div className="grid gap-6 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <Card key={index} className="border-2 border-dashed border-gray-200 hover:border-primary-300 transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0 lg:space-x-6">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={step.onClick}
                    leftIcon={<ArrowRight className="h-4 w-4" />}
                    className="whitespace-nowrap flex-shrink-0 w-full lg:w-auto"
                    size="lg"
                  >
                    {step.action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <Card className="bg-blue-50 border-blue-200 shadow-lg">
        <CardContent className="p-8">
          <h3 className="font-semibold text-blue-900 mb-6 flex items-center text-xl">
            <FileText className="h-6 w-6 mr-3" />
            Quick Tips
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div className="space-y-2">
              <h4 className="font-medium text-lg">Complete Profile First</h4>
              <p className="leading-relaxed">Adding your job title, department, and bio helps others provide more relevant feedback.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-lg">Check for Assessments</h4>
              <p className="leading-relaxed">Look for any pending assessments in your dashboard after completing your profile.</p>
            </div>
            {isOrgAdmin && (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">Setup Branding</h4>
                  <p className="leading-relaxed">Configure your organization's logo and colors for professional PDF exports.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">Invite Team Members</h4>
                  <p className="leading-relaxed">Add users to your organization to start creating assessment assignments.</p>
                </div>
              </>
            )}
            {isSuperAdmin && (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">System Configuration</h4>
                  <p className="leading-relaxed">Review and configure system settings, security policies, and default options.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">Organization Management</h4>
                  <p className="leading-relaxed">Create and manage organizations, assign administrators, and set permissions.</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skip Option */}
      <div className="text-center py-6">
        <p className="text-gray-500 text-base">
          You can complete these steps later from your profile or settings pages.
        </p>
      </div>
    </div>
  );
};

export default WelcomeMessage; 