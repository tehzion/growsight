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

    if (isOrgAdmin) {
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{welcomeInfo.title}</h1>
          <p className="text-lg text-primary-600 font-medium mt-1">{welcomeInfo.subtitle}</p>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">{welcomeInfo.description}</p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {isSuperAdmin ? 'Super Administrator' : 
                   isOrgAdmin ? 'Organization Administrator' : 
                   'Employee'}
                </span>
                {currentOrganization && (
                  <span className="flex items-center">
                    <Building2 className="h-4 w-4 mr-1" />
                    {currentOrganization.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Let's Get Started</h2>
        <div className="grid gap-4">
          {steps.map((step, index) => (
            <Card key={index} className="border-2 border-dashed border-gray-200 hover:border-primary-300 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      <p className="text-gray-600 text-sm">{step.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={step.onClick}
                    leftIcon={<ArrowRight className="h-4 w-4" />}
                    className="whitespace-nowrap"
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
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Quick Tips
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-1">Complete Profile First</h4>
              <p>Adding your job title, department, and bio helps others provide more relevant feedback.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Check for Assessments</h4>
              <p>Look for any pending assessments in your dashboard after completing your profile.</p>
            </div>
            {isOrgAdmin && (
              <>
                <div>
                  <h4 className="font-medium mb-1">Setup Branding</h4>
                  <p>Configure your organization's logo and colors for professional PDF exports.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Invite Team Members</h4>
                  <p>Add users to your organization to start creating assessment assignments.</p>
                </div>
              </>
            )}
            {isSuperAdmin && (
              <>
                <div>
                  <h4 className="font-medium mb-1">System Configuration</h4>
                  <p>Review and configure system settings, security policies, and default options.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Organization Management</h4>
                  <p>Create and manage organizations, assign administrators, and set permissions.</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skip Option */}
      <div className="text-center">
        <p className="text-gray-500 text-sm">
          You can complete these steps later from your profile or settings pages.
        </p>
      </div>
    </div>
  );
};

export default WelcomeMessage; 