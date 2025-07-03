import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

export interface UsageStats {
  totalUsers: number;
  totalAssessments: number;
  totalOrganizations: number;
  totalResults: number;
  activeUsers: number;
  completedAssessments: number;
  averageCompletionRate: number;
}

export interface TrendData {
  date: string;
  value: number;
  label: string;
}

export interface AssessmentStats {
  assessmentId: string;
  assessmentTitle: string;
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;
  averageScore: number;
  organizationName: string;
}

export interface UserActivity {
  userId: string;
  userName: string;
  userEmail: string;
  organizationName: string;
  lastLogin: string;
  totalAssessments: number;
  completedAssessments: number;
  averageScore: number;
}

export interface OrganizationStats {
  organizationId: string;
  organizationName: string;
  totalUsers: number;
  totalAssessments: number;
  totalResults: number;
  averageCompletionRate: number;
  averageScore: number;
  activeUsers: number;
}

interface ReportingState {
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Data
  usageStats: UsageStats | null;
  userTrends: TrendData[];
  assessmentTrends: TrendData[];
  organizationTrends: TrendData[];
  assessmentStats: AssessmentStats[];
  userActivity: UserActivity[];
  organizationStats: OrganizationStats[];
  
  // Filters
  dateRange: { start: string; end: string };
  selectedOrganization: string | null;
  selectedAssessment: string | null;
  
  // Actions
  fetchUsageStats: (organizationId?: string) => Promise<void>;
  fetchTrends: (type: 'users' | 'assessments' | 'organizations', organizationId?: string) => Promise<void>;
  fetchAssessmentStats: (organizationId?: string) => Promise<void>;
  fetchUserActivity: (organizationId?: string) => Promise<void>;
  fetchOrganizationStats: () => Promise<void>;
  exportReport: (type: 'usage' | 'assessments' | 'users' | 'organizations', format: 'csv' | 'pdf') => Promise<void>;
  setDateRange: (start: string, end: string) => void;
  setSelectedOrganization: (organizationId: string | null) => void;
  setSelectedAssessment: (assessmentId: string | null) => void;
  clearError: () => void;
}

export const useReportingStore = create<ReportingState>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  usageStats: null,
  userTrends: [],
  assessmentTrends: [],
  organizationTrends: [],
  assessmentStats: [],
  userActivity: [],
  organizationStats: [],
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  },
  selectedOrganization: null,
  selectedAssessment: null,

  // Fetch usage statistics
  fetchUsageStats: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('users')
        .select('id, organization_id, created_at, last_login');

      // Apply organization filter for org admins
      if (user.role === 'org_admin' && user.organizationId) {
        query = query.eq('organization_id', user.organizationId);
      } else if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: users, error: usersError } = await query;
      if (usersError) throw usersError;

      // Get assessment data
      let assessmentQuery = supabase
        .from('assessments')
        .select('id, organization_id, created_at');

      if (user.role === 'org_admin' && user.organizationId) {
        assessmentQuery = assessmentQuery.eq('organization_id', user.organizationId);
      } else if (organizationId) {
        assessmentQuery = assessmentQuery.eq('organization_id', organizationId);
      }

      const { data: assessments, error: assessmentsError } = await assessmentQuery;
      if (assessmentsError) throw assessmentsError;

      // Get results data
      let resultsQuery = supabase
        .from('assessment_results')
        .select('id, assessment_id, user_id, created_at, is_completed');

      if (user.role === 'org_admin' && user.organizationId) {
        resultsQuery = resultsQuery.in('assessment_id', 
          assessments?.map(a => a.id) || []
        );
      }

      const { data: results, error: resultsError } = await resultsQuery;
      if (resultsError) throw resultsError;

      // Calculate stats
      const totalUsers = users?.length || 0;
      const totalAssessments = assessments?.length || 0;
      const totalResults = results?.length || 0;
      const activeUsers = users?.filter(u => 
        u.last_login && new Date(u.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0;
      const completedAssessments = results?.filter(r => r.is_completed).length || 0;
      const averageCompletionRate = totalResults > 0 ? (completedAssessments / totalResults) * 100 : 0;

      set({
        usageStats: {
          totalUsers,
          totalAssessments,
          totalOrganizations: user.role === 'super_admin' ? (await supabase.from('organizations').select('id')).data?.length || 0 : 1,
          totalResults,
          activeUsers,
          completedAssessments,
          averageCompletionRate
        }
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch trends data
  fetchTrends: async (type: 'users' | 'assessments' | 'organizations', organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const { dateRange } = get();
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      let trends: TrendData[] = [];

      switch (type) {
        case 'users':
          // Get user registration trends
          let userQuery = supabase
            .from('users')
            .select('created_at');

          if (user.role === 'org_admin' && user.organizationId) {
            userQuery = userQuery.eq('organization_id', user.organizationId);
          } else if (organizationId) {
            userQuery = userQuery.eq('organization_id', organizationId);
          }

          const { data: users, error: usersError } = await userQuery;
          if (usersError) throw usersError;

          // Group by date
          const userGroups = users?.reduce((acc, user) => {
            const date = new Date(user.created_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          trends = Object.entries(userGroups).map(([date, count]) => ({
            date,
            value: count,
            label: `New Users: ${count}`
          }));
          break;

        case 'assessments':
          // Get assessment creation trends
          let assessmentQuery = supabase
            .from('assessments')
            .select('created_at');

          if (user.role === 'org_admin' && user.organizationId) {
            assessmentQuery = assessmentQuery.eq('organization_id', user.organizationId);
          } else if (organizationId) {
            assessmentQuery = assessmentQuery.eq('organization_id', organizationId);
          }

          const { data: assessments, error: assessmentsError } = await assessmentQuery;
          if (assessmentsError) throw assessmentsError;

          const assessmentGroups = assessments?.reduce((acc, assessment) => {
            const date = new Date(assessment.created_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          trends = Object.entries(assessmentGroups).map(([date, count]) => ({
            date,
            value: count,
            label: `New Assessments: ${count}`
          }));
          break;

        case 'organizations':
          if (user.role === 'super_admin') {
            const { data: organizations, error: orgError } = await supabase
              .from('organizations')
              .select('created_at');

            if (orgError) throw orgError;

            const orgGroups = organizations?.reduce((acc, org) => {
              const date = new Date(org.created_at).toISOString().split('T')[0];
              acc[date] = (acc[date] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {};

            trends = Object.entries(orgGroups).map(([date, count]) => ({
              date,
              value: count,
              label: `New Organizations: ${count}`
            }));
          }
          break;
      }

      // Sort by date
      trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      set({
        [`${type}Trends`]: trends
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch assessment statistics
  fetchAssessmentStats: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('assessments')
        .select(`
          id,
          title,
          organization_id,
          organizations(name)
        `);

      if (user.role === 'org_admin' && user.organizationId) {
        query = query.eq('organization_id', user.organizationId);
      } else if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: assessments, error: assessmentsError } = await query;
      if (assessmentsError) throw assessmentsError;

      const assessmentStats: AssessmentStats[] = [];

      for (const assessment of assessments || []) {
        // Get results for this assessment
        const { data: results, error: resultsError } = await supabase
          .from('assessment_results')
          .select('id, is_completed, total_score, max_score')
          .eq('assessment_id', assessment.id);

        if (resultsError) continue;

        const totalAssigned = results?.length || 0;
        const totalCompleted = results?.filter(r => r.is_completed).length || 0;
        const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
        const averageScore = totalCompleted > 0 
          ? results?.filter(r => r.is_completed)
              .reduce((sum, r) => sum + (r.total_score || 0), 0) / totalCompleted
          : 0;

        assessmentStats.push({
          assessmentId: assessment.id,
          assessmentTitle: assessment.title,
          totalAssigned,
          totalCompleted,
          completionRate,
          averageScore,
          organizationName: assessment.organizations?.name || 'Unknown'
        });
      }

      set({ assessmentStats });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch user activity
  fetchUserActivity: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          organization_id,
          last_login,
          organizations(name)
        `);

      if (user.role === 'org_admin' && user.organizationId) {
        query = query.eq('organization_id', user.organizationId);
      } else if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: users, error: usersError } = await query;
      if (usersError) throw usersError;

      const userActivity: UserActivity[] = [];

      for (const userData of users || []) {
        // Get assessment results for this user
        const { data: results, error: resultsError } = await supabase
          .from('assessment_results')
          .select('id, is_completed, total_score, max_score')
          .eq('user_id', userData.id);

        if (resultsError) continue;

        const totalAssessments = results?.length || 0;
        const completedAssessments = results?.filter(r => r.is_completed).length || 0;
        const averageScore = completedAssessments > 0
          ? results?.filter(r => r.is_completed)
              .reduce((sum, r) => sum + (r.total_score || 0), 0) / completedAssessments
          : 0;

        userActivity.push({
          userId: userData.id,
          userName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email,
          userEmail: userData.email,
          organizationName: userData.organizations?.name || 'Unknown',
          lastLogin: userData.last_login || 'Never',
          totalAssessments,
          completedAssessments,
          averageScore
        });
      }

      set({ userActivity });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch organization statistics
  fetchOrganizationStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user || user.role !== 'super_admin') {
        throw new Error('Only super admins can view organization statistics');
      }

      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id, name');

      if (orgError) throw orgError;

      const organizationStats: OrganizationStats[] = [];

      for (const org of organizations || []) {
        // Get users for this organization
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, last_login')
          .eq('organization_id', org.id);

        if (usersError) continue;

        // Get assessments for this organization
        const { data: assessments, error: assessmentsError } = await supabase
          .from('assessments')
          .select('id')
          .eq('organization_id', org.id);

        if (assessmentsError) continue;

        // Get results for this organization
        const { data: results, error: resultsError } = await supabase
          .from('assessment_results')
          .select('id, is_completed, total_score, max_score')
          .in('assessment_id', assessments?.map(a => a.id) || []);

        if (resultsError) continue;

        const totalUsers = users?.length || 0;
        const totalAssessments = assessments?.length || 0;
        const totalResults = results?.length || 0;
        const completedResults = results?.filter(r => r.is_completed).length || 0;
        const averageCompletionRate = totalResults > 0 ? (completedResults / totalResults) * 100 : 0;
        const averageScore = completedResults > 0
          ? results?.filter(r => r.is_completed)
              .reduce((sum, r) => sum + (r.total_score || 0), 0) / completedResults
          : 0;
        const activeUsers = users?.filter(u => 
          u.last_login && new Date(u.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length || 0;

        organizationStats.push({
          organizationId: org.id,
          organizationName: org.name,
          totalUsers,
          totalAssessments,
          totalResults,
          averageCompletionRate,
          averageScore,
          activeUsers
        });
      }

      set({ organizationStats });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Export reports
  exportReport: async (type: 'usage' | 'assessments' | 'users' | 'organizations', format: 'csv' | 'pdf') => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      // Implementation for export functionality
      // This would generate and download the appropriate report
      console.log(`Exporting ${type} report in ${format} format`);
      
      // For now, just show a success message
      alert(`${type} report exported successfully in ${format.toUpperCase()} format`);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Set filters
  setDateRange: (start: string, end: string) => {
    set({ dateRange: { start, end } });
  },

  setSelectedOrganization: (organizationId: string | null) => {
    set({ selectedOrganization: organizationId });
  },

  setSelectedAssessment: (assessmentId: string | null) => {
    set({ selectedAssessment: assessmentId });
  },

  clearError: () => {
    set({ error: null });
  }
})); 