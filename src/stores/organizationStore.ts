import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { Organization, OrgAdminPermission } from '../types';
import SecureLogger from '../lib/secureLogger';

interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  fetchOrganizations: () => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  updateOrganization: (id: string, name: string) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  setCurrentOrganization: (id: string) => void;
  updateOrgAdminPermissions: (orgId: string, permissions: OrgAdminPermission[]) => Promise<void>;
}

// Enhanced mock data for demo purposes with default permissions
const defaultMockOrganizations: Organization[] = [
  {
    id: 'demo-org-1',
    name: 'Acme Corporation',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    orgAdminPermissions: ['manage_users', 'view_results', 'assign_assessments', 'manage_relationships']
  },
  {
    id: 'demo-org-2',
    name: 'TechStart Solutions',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    orgAdminPermissions: ['manage_users', 'assign_assessments', 'manage_relationships']
  },
  {
    id: 'demo-org-3',
    name: 'Global Enterprises',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    orgAdminPermissions: ['create_assessments', 'manage_users', 'view_results', 'assign_assessments', 'manage_relationships']
  }
];

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      organizations: [],
      currentOrganization: null,
      isLoading: false,
      error: null,
      
      fetchOrganizations: async () => {
        set({ isLoading: true, error: null });
        try {
          // Always use demo data for consistent experience
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const { organizations: persistedOrgs } = get();
          
          // Merge default organizations with any custom ones created
          const customOrgs = persistedOrgs.filter(org => 
            !defaultMockOrganizations.some(defaultOrg => defaultOrg.id === org.id)
          );
          
          const allOrganizations = [...defaultMockOrganizations, ...customOrgs];
          const currentOrg = get().currentOrganization || allOrganizations[0];
          
          set({ 
            organizations: allOrganizations, 
            currentOrganization: currentOrg,
            isLoading: false,
            error: null
          });
        } catch (error) {
          SecureLogger.warn('Error fetching organizations', { type: 'fetch-error' });
          set({ 
            organizations: defaultMockOrganizations, 
            currentOrganization: defaultMockOrganizations[0],
            isLoading: false,
            error: null
          });
        }
      },
      
      createOrganization: async (name: string) => {
        set({ isLoading: true, error: null });
        try {
          // Validate input
          if (!name || !name.trim()) {
            throw new Error('Organization name is required');
          }

          const trimmedName = name.trim();
          
          // Check for duplicate names
          const { organizations } = get();
          const allOrganizations = [...defaultMockOrganizations, ...organizations];
          
          if (allOrganizations.some(org => org.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error('An organization with this name already exists');
          }

          // Create organization in demo mode
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const newOrg: Organization = {
            id: `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: trimmedName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            orgAdminPermissions: ['manage_users', 'assign_assessments', 'manage_relationships'] // Default permissions
          };
          
          set(state => {
            const updatedOrganizations = [...state.organizations, newOrg];
            return { 
              organizations: updatedOrganizations,
              currentOrganization: state.currentOrganization || newOrg,
              isLoading: false,
              error: null
            };
          });
        } catch (error) {
          console.error('Failed to create organization:', error);
          set({ error: (error as Error).message || 'Failed to create organization', isLoading: false });
        }
      },
      
      updateOrganization: async (id: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          // Validate input
          if (!name || !name.trim()) {
            throw new Error('Organization name is required');
          }

          const trimmedName = name.trim();
          
          // Check if this is a system organization
          const isSystemOrg = defaultMockOrganizations.some(org => org.id === id);
          if (isSystemOrg) {
            throw new Error('System organizations cannot be modified');
          }

          // Check for duplicate names (excluding current organization)
          const { organizations } = get();
          const allOrganizations = [...defaultMockOrganizations, ...organizations];
          
          if (allOrganizations.some(org => org.id !== id && org.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error('An organization with this name already exists');
          }

          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => {
            const updatedOrgs = state.organizations.map(org =>
              org.id === id ? { ...org, name: trimmedName, updatedAt: new Date().toISOString() } : org
            );
            
            return { 
              organizations: updatedOrgs,
              currentOrganization: state.currentOrganization?.id === id 
                ? { ...state.currentOrganization, name: trimmedName, updatedAt: new Date().toISOString() }
                : state.currentOrganization,
              isLoading: false,
              error: null
            };
          });
        } catch (error) {
          console.error('Failed to update organization:', error);
          set({ error: (error as Error).message || 'Failed to update organization', isLoading: false });
        }
      },
      
      deleteOrganization: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // Prevent deletion of default organizations
          const isDefaultOrg = defaultMockOrganizations.some(org => org.id === id);
          if (isDefaultOrg) {
            throw new Error('System organizations cannot be deleted');
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => {
            const filteredOrgs = state.organizations.filter(org => org.id !== id);
            
            return { 
              organizations: filteredOrgs,
              currentOrganization: state.currentOrganization?.id === id 
                ? (filteredOrgs.length > 0 ? filteredOrgs[0] : defaultMockOrganizations[0])
                : state.currentOrganization,
              isLoading: false,
              error: null
            };
          });
        } catch (error) {
          console.error('Failed to delete organization:', error);
          set({ error: (error as Error).message || 'Failed to delete organization', isLoading: false });
        }
      },
      
      setCurrentOrganization: (id: string) => {
        const { organizations } = get();
        const allOrganizations = [...defaultMockOrganizations, ...organizations];
        const org = allOrganizations.find(o => o.id === id) || null;
        set({ currentOrganization: org });
      },

      updateOrgAdminPermissions: async (orgId: string, permissions: OrgAdminPermission[]) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => {
            const updatedOrgs = state.organizations.map(org =>
              org.id === orgId ? { ...org, orgAdminPermissions: permissions, updatedAt: new Date().toISOString() } : org
            );
            
            return { 
              organizations: updatedOrgs,
              currentOrganization: state.currentOrganization?.id === orgId 
                ? { ...state.currentOrganization, orgAdminPermissions: permissions, updatedAt: new Date().toISOString() }
                : state.currentOrganization,
              isLoading: false,
              error: null
            };
          });
        } catch (error) {
          console.error('Failed to update permissions:', error);
          set({ error: (error as Error).message || 'Failed to update permissions', isLoading: false });
        }
      }
    }),
    {
      name: 'organization-storage',
      partialize: (state) => ({
        // Only persist custom organizations, not the default ones
        organizations: state.organizations.filter(org => 
          !defaultMockOrganizations.some(defaultOrg => defaultOrg.id === org.id)
        ),
        currentOrganization: state.currentOrganization,
      }),
    }
  )
);