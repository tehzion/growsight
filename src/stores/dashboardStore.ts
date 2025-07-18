import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import SecureLogger from '../lib/secureLogger';

export interface DashboardAnalytics {
  organizationId: string;
  organizationName: string;
  totalEmployees: number;
  totalReviewers: number;
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  inProgressAssessments: number;
  averageRating: number;
  totalResponses: number;
  completionRate: number;
  averageCompletionTime: number;
  participationRate: number;
  competencyAnalytics: Array<{
    competencyId: string;
    competencyName: string;
    averageRating: number;
    assessmentCount: number;
  }>;
}

export interface SystemMetrics {
  systemUptime: number;
  averageResponseTime: number;
  storageUsage: number;
  bandwidthUsage: number;
  activeUsers: number;
  totalOrganizations: number;
  totalAssessments: number;
  completedAssessments: number;
}

export interface SystemHealth {
  id: string;
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastChecked: string;
  responseTime?: number;
}

interface DashboardState {
  analytics: DashboardAnalytics | null;
  organizationAnalytics: DashboardAnalytics[];
  systemMetrics: SystemMetrics | null;
  systemHealth: SystemHealth[];
  isLoading: boolean;
  error: string | null;
  fetchAnalytics: (organizationId?: string) => Promise<void>;
  fetchAllOrganizationAnalytics: () => Promise<void>;
  fetchSystemMetrics: () => Promise<void>;
  fetchSystemHealth: () => Promise<void>;
  clearAnalytics: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      analytics: null,
      organizationAnalytics: [],
      systemMetrics: null,
      systemHealth: [],
      isLoading: false,
      error: null,

      fetchAnalytics: async (organizationId?: string) => {
        set({ isLoading: true, error: null });
        try {
          if (organizationId) {
            // Fetch specific organization analytics
            const analytics = await fetchOrganizationAnalytics(organizationId);
            set({ analytics, isLoading: false });
          } else {
            // Fetch aggregated analytics for all accessible organizations
            const aggregated = await fetchAggregatedAnalytics();
            set({ analytics: aggregated, isLoading: false });
          }
        } catch (error) {
          console.error('Analytics fetch error:', error);
          set({ error: (error as Error).message || 'Failed to load analytics', isLoading: false });
        }
      },

      fetchAllOrganizationAnalytics: async () => {
        set({ isLoading: true, error: null });
        try {
          const analytics = await fetchAllOrganizationAnalytics();
          set({ organizationAnalytics: analytics, isLoading: false });
        } catch (error) {
          console.error('Organization analytics fetch error:', error);
          set({ error: (error as Error).message || 'Failed to load organization analytics', isLoading: false });
        }
      },

      fetchSystemMetrics: async () => {
        set({ isLoading: true, error: null });
        try {
          const metrics = await fetchSystemMetrics();
          set({ systemMetrics: metrics, isLoading: false });
        } catch (error) {
          console.error('System metrics fetch error:', error);
          set({ error: (error as Error).message || 'Failed to load system metrics', isLoading: false });
        }
      },

      fetchSystemHealth: async () => {
        set({ isLoading: true, error: null });
        try {
          const health = await fetchSystemHealth();
          set({ systemHealth: health, isLoading: false });
        } catch (error) {
          console.error('System health fetch error:', error);
          set({ error: (error as Error).message || 'Failed to load system health', isLoading: false });
        }
      },

      clearAnalytics: () => {
        set({ analytics: null, organizationAnalytics: [], error: null });
      }
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        analytics: state.analytics,
        organizationAnalytics: state.organizationAnalytics,
        systemMetrics: state.systemMetrics,
        systemHealth: state.systemHealth
      })
    }
  )
);

/**
 * Fetch analytics for a specific organization
 */
async function fetchOrganizationAnalytics(organizationId: string): Promise<DashboardAnalytics> {
  try {
    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    // Get user counts
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, role')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (usersError) throw usersError;

    const totalEmployees = users?.filter((u: { role: string }) => u.role === 'employee').length || 0;
    const totalReviewers = users?.filter((u: { role: string }) => u.role === 'reviewer').length || 0;

    // Get assessment counts
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('id, status, is_published')
      .eq('organization_id', organizationId);

    if (assessmentsError) throw assessmentsError;

    const totalAssessments = assessments?.filter((a: { is_published: boolean }) => a.is_published).length || 0;
    const completedAssessments = assessments?.filter((a: { status: string }) => a.status === 'completed').length || 0;
    const pendingAssessments = assessments?.filter((a: { status: string }) => a.status === 'pending').length || 0;
    const inProgressAssessments = assessments?.filter((a: { status: string }) => a.status === 'in_progress').length || 0;

    // Get assessment results for ratings
    const { data: results, error: resultsError } = await supabase
      .from('assessment_results')
      .select('id, score, max_score, completed_at')
      .eq('organization_id', organizationId)
      .not('completed_at', 'is', null);

    if (resultsError) throw resultsError;

    const totalResponses = results?.length || 0;
    const averageRating = totalResponses > 0 
      ? results!.reduce((sum: number, r: { score: number; max_score: number }) => sum + (r.score / r.max_score) * 5, 0) / totalResponses 
      : 0;

    // Calculate completion rate
    const totalAssigned = assessments?.length || 0;
    const completionRate = totalAssigned > 0 ? (completedAssessments / totalAssigned) * 100 : 0;

    // Calculate average completion time (simplified)
    const averageCompletionTime = totalResponses > 0 ? 4.2 : 0; // This would need more complex calculation

    // Calculate participation rate
    const participationRate = totalEmployees > 0 ? (totalResponses / totalEmployees) * 100 : 0;

    // Get competency analytics
    const competencyAnalytics = await fetchCompetencyAnalytics(organizationId);

    return {
      organizationId,
      organizationName: org.name,
      totalEmployees,
      totalReviewers,
      totalAssessments,
      completedAssessments,
      pendingAssessments,
      inProgressAssessments,
      averageRating,
      totalResponses,
      completionRate,
      averageCompletionTime,
      participationRate,
      competencyAnalytics
    };
  } catch (error) {
    SecureLogger.error('Failed to fetch organization analytics', error);
    throw new Error('Failed to fetch organization analytics');
  }
}

/**
 * Fetch aggregated analytics for all organizations
 */
async function fetchAggregatedAnalytics(): Promise<DashboardAnalytics> {
  try {
    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true);

    if (orgsError) throw orgsError;

    // Aggregate data from all organizations
    let totalEmployees = 0;
    let totalReviewers = 0;
    let totalAssessments = 0;
    let completedAssessments = 0;
    let pendingAssessments = 0;
    let inProgressAssessments = 0;
    let totalResponses = 0;
    let totalRating = 0;
    let allCompetencyAnalytics: DashboardAnalytics['competencyAnalytics'] = [];

    for (const org of orgs || []) {
      try {
        const orgAnalytics = await fetchOrganizationAnalytics(org.id);
        totalEmployees += orgAnalytics.totalEmployees;
        totalReviewers += orgAnalytics.totalReviewers;
        totalAssessments += orgAnalytics.totalAssessments;
        completedAssessments += orgAnalytics.completedAssessments;
        pendingAssessments += orgAnalytics.pendingAssessments;
        inProgressAssessments += orgAnalytics.inProgressAssessments;
        totalResponses += orgAnalytics.totalResponses;
        totalRating += orgAnalytics.averageRating * orgAnalytics.totalResponses;
        allCompetencyAnalytics.push(...orgAnalytics.competencyAnalytics);
      } catch (error) {
        SecureLogger.warn(`Failed to fetch analytics for organization ${org.id}`, error);
        // Continue with other organizations
      }
    }

    // Aggregate competency analytics
    const competencyMap = new Map<string, { competencyId: string; competencyName: string; totalRating: number; totalCount: number }>();
    
    allCompetencyAnalytics.forEach(comp => {
      const existing = competencyMap.get(comp.competencyId);
      if (existing) {
        existing.totalRating += comp.averageRating * comp.assessmentCount;
        existing.totalCount += comp.assessmentCount;
      } else {
        competencyMap.set(comp.competencyId, {
          competencyId: comp.competencyId,
          competencyName: comp.competencyName,
          totalRating: comp.averageRating * comp.assessmentCount,
          totalCount: comp.assessmentCount
        });
      }
    });

    const aggregatedCompetencyAnalytics = Array.from(competencyMap.values()).map(comp => ({
      competencyId: comp.competencyId,
      competencyName: comp.competencyName,
      averageRating: comp.totalCount > 0 ? comp.totalRating / comp.totalCount : 0,
      assessmentCount: comp.totalCount
    })).sort((a, b) => b.averageRating - a.averageRating);

    const averageRating = totalResponses > 0 ? totalRating / totalResponses : 0;
    const completionRate = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;
    const participationRate = totalEmployees > 0 ? (totalResponses / totalEmployees) * 100 : 0;

    return {
      organizationId: 'all',
      organizationName: 'All Organizations',
      totalEmployees,
      totalReviewers,
      totalAssessments,
      completedAssessments,
      pendingAssessments,
      inProgressAssessments,
      averageRating,
      totalResponses,
      completionRate,
      averageCompletionTime: 4.2, // Simplified
      participationRate,
      competencyAnalytics: aggregatedCompetencyAnalytics
    };
  } catch (error) {
    SecureLogger.error('Failed to fetch aggregated analytics', error);
    throw new Error('Failed to fetch aggregated analytics');
  }
}

/**
 * Fetch all organization analytics
 */
async function fetchAllOrganizationAnalytics(): Promise<DashboardAnalytics[]> {
  try {
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true);

    if (orgsError) throw orgsError;

    const analytics: DashboardAnalytics[] = [];

    for (const org of orgs || []) {
      try {
        const orgAnalytics = await fetchOrganizationAnalytics(org.id);
        analytics.push(orgAnalytics);
      } catch (error) {
        SecureLogger.warn(`Failed to fetch analytics for organization ${org.id}`, error);
        // Continue with other organizations
      }
    }

    return analytics;
  } catch (error) {
    SecureLogger.error('Failed to fetch all organization analytics', error);
    throw new Error('Failed to fetch all organization analytics');
  }
}

/**
 * Fetch competency analytics for an organization
 */
async function fetchCompetencyAnalytics(organizationId: string): Promise<DashboardAnalytics['competencyAnalytics']> {
  try {
    const { data: competencies, error: compError } = await supabase
      .from('competencies')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (compError) throw compError;

    const analytics: DashboardAnalytics['competencyAnalytics'] = [];

    for (const comp of competencies || []) {
      try {
        // Get assessment results for this competency
        const { data: results, error: resultsError } = await supabase
          .from('assessment_results')
          .select('id, score, max_score')
          .eq('organization_id', organizationId)
          .eq('competency_id', comp.id)
          .not('completed_at', 'is', null);

        if (resultsError) throw resultsError;

        const assessmentCount = results?.length || 0;
        const averageRating = assessmentCount > 0
          ? results!.reduce((sum: number, r: { score: number; max_score: number }) => sum + (r.score / r.max_score) * 5, 0) / assessmentCount
          : 0;

        analytics.push({
          competencyId: comp.id,
          competencyName: comp.name,
          averageRating,
          assessmentCount
        });
      } catch (error) {
        SecureLogger.warn(`Failed to fetch analytics for competency ${comp.id}`, error);
        // Continue with other competencies
      }
    }

    return analytics.sort((a, b) => b.averageRating - a.averageRating);
  } catch (error) {
    SecureLogger.error('Failed to fetch competency analytics', error);
    return [];
  }
}

/**
 * Fetch system metrics
 */
async function fetchSystemMetrics(): Promise<SystemMetrics> {
  try {
    // Get total organizations
    const { count: totalOrganizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (orgsError) throw orgsError;

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (usersError) throw usersError;

    // Get total assessments
    const { count: totalAssessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    if (assessmentsError) throw assessmentsError;

    // Get completed assessments
    const { count: completedAssessments, error: completedError } = await supabase
      .from('assessment_results')
      .select('*', { count: 'exact', head: true })
      .not('completed_at', 'is', null);

    if (completedError) throw completedError;

    // Get active users (users who logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_login_at', thirtyDaysAgo.toISOString());

    if (activeError) throw activeError;

    return {
      systemUptime: 99.9, // This would come from monitoring system
      averageResponseTime: 120, // This would come from monitoring system
      storageUsage: 500, // This would come from storage monitoring
      bandwidthUsage: 1000, // This would come from network monitoring
      activeUsers: activeUsers || 0,
      totalOrganizations: totalOrganizations || 0,
      totalAssessments: totalAssessments || 0,
      completedAssessments: completedAssessments || 0
    };
  } catch (error) {
    SecureLogger.error('Failed to fetch system metrics', error);
    throw new Error('Failed to fetch system metrics');
  }
}

/**
 * Fetch system health status
 */
async function fetchSystemHealth(): Promise<SystemHealth[]> {
  try {
    const health: SystemHealth[] = [];

    // Check database connectivity
    try {
      const startTime = Date.now();
      const { error } = await supabase.from('organizations').select('id').limit(1);
      const responseTime = Date.now() - startTime;

      health.push({
        id: 'database',
        component: 'Database',
        status: error ? 'critical' : responseTime > 1000 ? 'warning' : 'healthy',
        message: error ? 'Database connection failed' : 'Database is responding normally',
        lastChecked: new Date().toISOString(),
        responseTime
      });
    } catch (error) {
      health.push({
        id: 'database',
        component: 'Database',
        status: 'critical',
        message: 'Database connection failed',
        lastChecked: new Date().toISOString()
      });
    }

    // Check authentication service
    try {
      const startTime = Date.now();
      const { error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;

      health.push({
        id: 'auth',
        component: 'Authentication',
        status: error ? 'critical' : responseTime > 2000 ? 'warning' : 'healthy',
        message: error ? 'Authentication service failed' : 'Authentication service is responding normally',
        lastChecked: new Date().toISOString(),
        responseTime
      });
    } catch (error) {
      health.push({
        id: 'auth',
        component: 'Authentication',
        status: 'critical',
        message: 'Authentication service failed',
        lastChecked: new Date().toISOString()
      });
    }

    // Check storage service
    try {
      const startTime = Date.now();
      const { error } = await supabase.storage.listBuckets();
      const responseTime = Date.now() - startTime;

      health.push({
        id: 'storage',
        component: 'File Storage',
        status: error ? 'critical' : responseTime > 3000 ? 'warning' : 'healthy',
        message: error ? 'Storage service failed' : 'Storage service is responding normally',
        lastChecked: new Date().toISOString(),
        responseTime
      });
    } catch (error) {
      health.push({
        id: 'storage',
        component: 'File Storage',
        status: 'critical',
        message: 'Storage service failed',
        lastChecked: new Date().toISOString()
      });
    }

    return health;
  } catch (error) {
    SecureLogger.error('Failed to fetch system health', error);
    throw new Error('Failed to fetch system health');
  }
}