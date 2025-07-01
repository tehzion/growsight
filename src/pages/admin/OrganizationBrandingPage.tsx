import React from 'react';
import OrganizationBranding from '../../components/admin/OrganizationBranding';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';

const OrganizationBrandingPage: React.FC = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';

  // Check if user has permission to access branding
  if (!isSuperAdmin && !isOrgAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access branding settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Organization Branding</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isSuperAdmin 
            ? 'Customize branding settings for organizations'
            : `Customize branding for ${currentOrganization?.name || 'your organization'}`
          }
        </p>
      </div>

      <OrganizationBranding 
        organizationId={isSuperAdmin ? undefined : user?.organizationId}
      />
    </div>
  );
};

export default OrganizationBrandingPage; 