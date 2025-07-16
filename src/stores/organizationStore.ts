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
  updateOrganizationStatus: (id: string, status: 'active' | 'inactive' | 'suspended', reason?: string) => Promise<void>;
  setOrganizationPeriod: (orgId: string, startDate: string, endDate: string, autoTransition?: boolean, graceDays?: number) => Promise<void>;
  reactivateOrganization: (orgId: string, newEndDate?: string) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  setCurrentOrganization: (id: string) => void;
  updateOrgAdminPermissions: (orgId: string, permissions: OrgAdminPermission[]) => Promise<void>;
  fetchOrganizationStatusLog: (orgId: string) => Promise<any[]>;
  runAutoTransition: () => Promise<number>;
}

// Production mode - no mock data

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
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw handleSupabaseError(error);

          const organizations: Organization[] = (data || []).map((org: any) => ({
            id: org.id,
            name: org.name,
            createdAt: org.created_at,
            updatedAt: org.updated_at,
            orgAdminPermissions: org.org_admin_permissions || [],
            status: org.status || 'active',
            logoUrl: org.logo_url,
            contactEmail: org.contact_email,
            contactPhone: org.contact_phone,
            address: org.address,
            industry: org.industry,
            size: org.size,
            periodStartDate: org.period_start_date,
            periodEndDate: org.period_end_date,
            autoTransitionEnabled: org.auto_transition_enabled,
            gracePeriodDays: org.grace_period_days
          }));

          set({ 
            organizations, 
            currentOrganization: organizations[0] || null,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Failed to fetch organizations:', error);
          set({ 
            organizations: [],
            currentOrganization: null,
            isLoading: false,
            error: (error as Error).message || 'Failed to fetch organizations'
          });
        }
      },
      
      createOrganization: async (name: string) => {
        set({ isLoading: true, error: null });
        try {
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          // Validate input
          if (!name || !name.trim()) {
            throw new Error('Organization name is required');
          }

          const trimmedName = name.trim();
          
          // Check for duplicate names
          const { organizations } = get();
          if (organizations.some(org => org.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error('An organization with this name already exists');
          }

          // Create organization in database
          const { data, error } = await supabase
            .from('organizations')
            .insert([{
              id: `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: trimmedName,
              status: 'active',
              org_admin_permissions: ['manage_users', 'assign_assessments', 'manage_relationships'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (error) throw handleSupabaseError(error);

          const newOrg: Organization = {
            id: data.id,
            name: data.name,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            orgAdminPermissions: data.org_admin_permissions || [],
            status: data.status || 'active'
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

          SecureLogger.info('Organization created', { organizationId: newOrg.id, name: trimmedName });
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
          
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          // Check for duplicate names (excluding current organization)
          const { organizations } = get();
          if (organizations.some(org => org.id !== id && org.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error('An organization with this name already exists');
          }

          // Update organization in database
          const { error } = await supabase
            .from('organizations')
            .update({
              name: trimmedName,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw handleSupabaseError(error);
          
          // Update local state
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

          SecureLogger.info('Organization updated', { organizationId: id, name: trimmedName });
        } catch (error) {
          console.error('Failed to update organization:', error);
          set({ error: (error as Error).message || 'Failed to update organization', isLoading: false });
        }
      },
      
      deleteOrganization: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          // Delete organization from database
          const { error } = await supabase
            .from('organizations')
            .delete()
            .eq('id', id);

          if (error) throw handleSupabaseError(error);
          
          // Update local state
          set(state => {
            const filteredOrgs = state.organizations.filter(org => org.id !== id);
            
            return { 
              organizations: filteredOrgs,
              currentOrganization: state.currentOrganization?.id === id 
                ? (filteredOrgs.length > 0 ? filteredOrgs[0] : null)
                : state.currentOrganization,
              isLoading: false,
              error: null
            };
          });

          SecureLogger.info('Organization deleted', { organizationId: id });
        } catch (error) {
          console.error('Failed to delete organization:', error);
          set({ error: (error as Error).message || 'Failed to delete organization', isLoading: false });
        }
      },
      
      setCurrentOrganization: (id: string) => {
        const { organizations } = get();
        const org = organizations.find(o => o.id === id) || null;
        set({ currentOrganization: org });
      },

      updateOrgAdminPermissions: async (orgId: string, permissions: OrgAdminPermission[]) => {
        set({ isLoading: true, error: null });
        try {
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          // Update permissions in database
          const { error } = await supabase
            .from('organizations')
            .update({
              org_admin_permissions: permissions,
              updated_at: new Date().toISOString()
            })
            .eq('id', orgId);

          if (error) throw handleSupabaseError(error);
          
          // Update local state
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

          SecureLogger.info('Organization admin permissions updated', { organizationId: orgId, permissions });
        } catch (error) {
          console.error('Failed to update permissions:', error);
          set({ error: (error as Error).message || 'Failed to update permissions', isLoading: false });
        }
      },

      updateOrganizationStatus: async (id: string, status: 'active' | 'inactive' | 'suspended', reason?: string) => {
        set({ isLoading: true, error: null });
        try {
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          // Update organization status in database
          const { error } = await supabase
            .from('organizations')
            .update({ 
              status, 
              status_changed_at: new Date().toISOString(),
              status_changed_by: (await supabase.auth.getUser()).data.user?.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw handleSupabaseError(error);

          // Update local state
          set(state => {
            const updatedOrgs = state.organizations.map(org =>
              org.id === id ? { ...org, status, updatedAt: new Date().toISOString() } : org
            );
            
            return { 
              organizations: updatedOrgs,
              currentOrganization: state.currentOrganization?.id === id 
                ? { ...state.currentOrganization, status, updatedAt: new Date().toISOString() }
                : state.currentOrganization,
              isLoading: false,
              error: null
            };
          });

          SecureLogger.info('Organization status updated', { organizationId: id, status, reason });
        } catch (error) {
          console.error('Failed to update organization status:', error);
          set({ error: (error as Error).message || 'Failed to update organization status', isLoading: false });
        }
      },

      fetchOrganizationStatusLog: async (orgId: string) => {
        try {
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          const { data, error } = await supabase
            .from('organization_status_log')
            .select(`
              *,
              changed_by_user:users!changed_by(first_name, last_name, email)
            `)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

          if (error) throw handleSupabaseError(error);

          return data || [];
        } catch (error) {
          console.error('Failed to fetch organization status log:', error);
          return [];
        }
      },

      setOrganizationPeriod: async (orgId: string, startDate: string, endDate: string, autoTransition: boolean = true, graceDays: number = 0) => {
        set({ isLoading: true, error: null });
        try {
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          const { error } = await supabase.rpc('set_organization_period', {
            org_id: orgId,
            start_date: startDate,
            end_date: endDate,
            enable_auto_transition: autoTransition,
            grace_days: graceDays
          });

          if (error) throw handleSupabaseError(error);

          // Refresh organizations
          await get().fetchOrganizations();
          
          SecureLogger.info('Organization period set', { organizationId: orgId, startDate, endDate });
        } catch (error) {
          console.error('Failed to set organization period:', error);
          set({ error: (error as Error).message || 'Failed to set organization period', isLoading: false });
        }
      },

      reactivateOrganization: async (orgId: string, newEndDate?: string) => {
        set({ isLoading: true, error: null });
        try {
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          const { error } = await supabase.rpc('reactivate_organization', {
            org_id: orgId,
            new_end_date: newEndDate || null
          });

          if (error) throw handleSupabaseError(error);

          // Refresh organizations
          await get().fetchOrganizations();
          
          SecureLogger.info('Organization reactivated', { organizationId: orgId, newEndDate });
        } catch (error) {
          console.error('Failed to reactivate organization:', error);
          set({ error: (error as Error).message || 'Failed to reactivate organization', isLoading: false });
        }
      },

      runAutoTransition: async () => {
        try {
          if (!supabase) {
            throw new Error('Database connection not available');
          }

          const { data, error } = await supabase.rpc('auto_transition_expired_organizations');

          if (error) throw handleSupabaseError(error);

          // Refresh organizations if any were transitioned
          if (data > 0) {
            await get().fetchOrganizations();
          }

          SecureLogger.info('Auto transition completed', { transitionCount: data });
          return data || 0;
        } catch (error) {
          console.error('Failed to run auto transition:', error);
          return 0;
        }
      }
    }),
    {
      name: 'organization-storage',
      partialize: (state) => ({
        // Persist all organizations and current selection
        organizations: state.organizations,
        currentOrganization: state.currentOrganization,
      }),
    }
  )
);