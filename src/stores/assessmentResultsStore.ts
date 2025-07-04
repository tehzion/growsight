import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { emailNotificationService } from '../services/emailNotificationService';
import { config } from '../config/environment';

export interface AssessmentResponse {
  id: string;
  assignmentId: string;
  questionId: string;
  rating?: number;
  comment?: string;
  textResponse?: string;
  selectedOptionId?: string;
  respondentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAssignment {
  id: string;
  assessmentId: string;
  employeeId: string;
  reviewerId: string;
  relationshipType: 'peer' | 'supervisor' | 'subordinate' | 'client';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  assignedById: string;
  notificationSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  id: string;
  assignmentId: string;
  assessmentId: string;
  employeeId: string;
  reviewerId: string;
  relationshipType: string;
  responses: AssessmentResponse[];
  overallScore: number;
  sectionScores: Record<string, number>;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAnalytics {
  totalAssessments: number;
  completedAssessments: number;
  averageScore: number;
  sectionAverages: Record<string, number>;
  questionAverages: Record<string, number>;
  relationshipTypeBreakdown: Record<string, number>;
  completionRate: number;
  responseRate: number;
  topStrengths: string[];
  areasForImprovement: string[];
}

export interface ComparisonData {
  questionId: string;
  questionText: string;
  averageScore: number;
  totalResponses: number;
  scoreDistribution: Record<number, number>;
  relationshipTypeAverages: Record<string, number>;
}

interface AssessmentResultsState {
  results: AssessmentResult[];
  assignments: AssessmentAssignment[];
  analytics: AssessmentAnalytics | null;
  comparisonData: ComparisonData[];
  isLoading: boolean;
  error: string | null;
  
  // Core functions
  saveAssessmentResponse: (assignmentId: string, questionId: string, response: Partial<AssessmentResponse>) => Promise<void>;
  submitAssessment: (assignmentId: string, responses: AssessmentResponse[]) => Promise<void>;
  fetchAssessmentResults: (organizationId: string, filters?: any) => Promise<void>;
  fetchUserResults: (userId: string) => Promise<void>;
  fetchAnalytics: (organizationId: string, assessmentId?: string) => Promise<void>;
  fetchComparisonData: (questionIds: string[], organizationId: string) => Promise<void>;
  
  // Assignment management
  createAssignment: (data: Omit<AssessmentAssignment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateAssignmentStatus: (assignmentId: string, status: string) => Promise<void>;
  fetchAssignments: (organizationId: string) => Promise<void>;
  
  // Utility functions
  generateOrganizationId: (organizationName: string) => string;
  generateStaffId: (organizationName: string, staffName: string) => string;
  calculateAverages: (responses: AssessmentResponse[]) => Record<string, number>;

  // New functions
  fetchSelfAssessments: (userId: string) => Promise<void>;
  fetchReviewsAboutMe: (userId: string) => Promise<void>;
  fetchReviewsIDone: (userId: string) => Promise<void>;
  fetchOrgDepartmentResults: (organizationId: string, departmentId?: string) => Promise<void>;
  fetchAllOrgResults: () => Promise<void>;
  exportAllResultsAsCSV: () => Promise<string>;
}

// Generate organization ID based on corporate name
const generateOrganizationId = (organizationName: string): string => {
  const sanitizedName = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${sanitizedName}-${timestamp}-${randomSuffix}`;
};

// Generate staff ID based on organization and staff name
const generateStaffId = (organizationName: string, staffName: string): string => {
  const orgPrefix = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 3);
  
  const staffPrefix = staffName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 3);
  
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  
  return `${orgPrefix}-${staffPrefix}-${timestamp}-${randomSuffix}`;
};

// Calculate averages for responses
const calculateAverages = (responses: AssessmentResponse[]): Record<string, number> => {
  const questionAverages: Record<string, number> = {};
  const questionCounts: Record<string, number> = {};
  
  responses.forEach(response => {
    if (response.rating) {
      if (!questionAverages[response.questionId]) {
        questionAverages[response.questionId] = 0;
        questionCounts[response.questionId] = 0;
      }
      questionAverages[response.questionId] += response.rating;
      questionCounts[response.questionId]++;
    }
  });
  
  // Calculate averages
  Object.keys(questionAverages).forEach(questionId => {
    questionAverages[questionId] = questionAverages[questionId] / questionCounts[questionId];
  });
  
  return questionAverages;
};

// Utility to map section IDs to names for a given assessment
const mapSectionAveragesToNames = async (assessmentId: string, sectionAverages: Record<string, number>) => {
  const { data, error } = await supabase
    .from('assessment_sections')
    .select('id, title')
    .eq('assessment_id', assessmentId);
  if (error) return sectionAverages;
  const sectionMap = Object.fromEntries((data || []).map((s: any) => [s.id, s.title]));
  const mapped: Record<string, number> = {};
  Object.entries(sectionAverages).forEach(([sectionId, avg]) => {
    mapped[sectionMap[sectionId] || sectionId] = avg;
  });
  return mapped;
};

export const useAssessmentResultsStore = create<AssessmentResultsState>()(
  persist(
    (set, get) => ({
      results: [],
      assignments: [],
      analytics: null,
      comparisonData: [],
      isLoading: false,
      error: null,

      saveAssessmentResponse: async (assignmentId: string, questionId: string, response: Partial<AssessmentResponse>) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const responseData = {
            assignment_id: assignmentId,
            question_id: questionId,
            respondent_id: user.id,
            rating: response.rating,
            comment: response.comment,
            text_response: response.textResponse,
            selected_option_id: response.selectedOptionId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('assessment_responses')
            .upsert(responseData, { onConflict: 'assignment_id,question_id,respondent_id' });

          if (error) throw error;

          set({ isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      submitAssessment: async (assignmentId: string, responses: AssessmentResponse[]) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Get assignment details for email notification
          const { data: assignmentData, error: assignmentFetchError } = await supabase
            .from('assessment_assignments')
            .select(`
              *,
              assessments!inner(*),
              employees:users!assessment_assignments_employee_id_fkey(*),
              reviewers:users!assessment_assignments_reviewer_id_fkey(*)
            `)
            .eq('id', assignmentId)
            .single();

          if (assignmentFetchError) throw assignmentFetchError;

          // Save all responses
          const responseData = responses.map(response => ({
            assignment_id: assignmentId,
            question_id: response.questionId,
            respondent_id: user.id,
            rating: response.rating,
            comment: response.comment,
            text_response: response.textResponse,
            selected_option_id: response.selectedOptionId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const { error: responsesError } = await supabase
            .from('assessment_responses')
            .upsert(responseData, { onConflict: 'assignment_id,question_id,respondent_id' });

          if (responsesError) throw responsesError;

          // Update assignment status to completed
          const { error: assignmentError } = await supabase
            .from('assessment_assignments')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', assignmentId);

          if (assignmentError) throw assignmentError;

          // Calculate and save result analytics
          const questionAverages = calculateAverages(responses);
          const overallScore = Object.values(questionAverages).reduce((sum, avg) => sum + avg, 0) / Object.keys(questionAverages).length;

          const resultData = {
            assignment_id: assignmentId,
            overall_score: overallScore,
            section_scores: questionAverages,
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: resultError } = await supabase
            .from('assessment_results')
            .insert(resultData);

          if (resultError) throw resultError;

          // Send email notifications if enabled
          if (config.features.emailNotifications && config.email.provider !== 'demo' && assignmentData) {
            try {
              await emailNotificationService.sendAssessmentCompletionNotification({
                assignmentId: assignmentId,
                employeeEmail: assignmentData.employees?.email || '',
                reviewerEmail: assignmentData.reviewers?.email || '',
                employeeName: `${assignmentData.employees?.first_name || ''} ${assignmentData.employees?.last_name || ''}`.trim(),
                reviewerName: `${assignmentData.reviewers?.first_name || ''} ${assignmentData.reviewers?.last_name || ''}`.trim(),
                assessmentTitle: assignmentData.assessments?.title || 'Assessment',
                overallScore: overallScore,
                relationshipType: assignmentData.relationship_type,
                organizationName: assignmentData.assessments?.organization_name || 'Your Organization'
              });
            } catch (emailError) {
              console.error('Failed to send assessment completion notification:', emailError);
              // Don't fail the assessment submission if email fails
            }
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      fetchAssessmentResults: async (organizationId: string, filters?: any) => {
        set({ isLoading: true, error: null });
        try {
          let query = supabase
            .from('assessment_results')
            .select(`
              *,
              assessment_assignments!inner(
                *,
                assessments!inner(*),
                employees:users!assessment_assignments_employee_id_fkey(*),
                reviewers:users!assessment_assignments_reviewer_id_fkey(*)
              ),
              assessment_responses(*)
            `)
            .eq('assessment_assignments.assessments.organization_id', organizationId);

          if (filters?.assessmentId) {
            query = query.eq('assessment_assignments.assessment_id', filters.assessmentId);
          }

          if (filters?.status) {
            query = query.eq('assessment_assignments.status', filters.status);
          }

          if (filters?.relationshipType) {
            query = query.eq('assessment_assignments.relationship_type', filters.relationshipType);
          }

          const { data, error } = await query;

          if (error) throw error;

          const results: AssessmentResult[] = data?.map(item => ({
            id: item.id,
            assignmentId: item.assignment_id,
            assessmentId: item.assessment_assignments.assessment_id,
            employeeId: item.assessment_assignments.employee_id,
            reviewerId: item.assessment_assignments.reviewer_id,
            relationshipType: item.assessment_assignments.relationship_type,
            responses: item.assessment_responses || [],
            overallScore: item.overall_score,
            sectionScores: item.section_scores || {},
            completedAt: item.completed_at,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          })) || [];

          set({ results, isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      fetchUserResults: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_results')
            .select(`
              *,
              assessment_assignments!inner(
                *,
                assessments!inner(*),
                employees:users!assessment_assignments_employee_id_fkey(*),
                reviewers:users!assessment_assignments_reviewer_id_fkey(*)
              ),
              assessment_responses(*)
            `)
            .or(`assessment_assignments.employee_id.eq.${userId},assessment_assignments.reviewer_id.eq.${userId}`);

          if (error) throw error;

          const results: AssessmentResult[] = data?.map(item => ({
            id: item.id,
            assignmentId: item.assignment_id,
            assessmentId: item.assessment_assignments.assessment_id,
            employeeId: item.assessment_assignments.employee_id,
            reviewerId: item.assessment_assignments.reviewer_id,
            relationshipType: item.assessment_assignments.relationship_type,
            responses: item.assessment_responses || [],
            overallScore: item.overall_score,
            sectionScores: item.section_scores || {},
            completedAt: item.completed_at,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          })) || [];

          set({ results, isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      fetchAnalytics: async (organizationId: string, assessmentId?: string) => {
        set({ isLoading: true, error: null });
        try {
          let query = supabase
            .from('assessment_results')
            .select(`
              *,
              assessment_assignments!inner(
                *,
                assessments!inner(*),
                employees:users!assessment_assignments_employee_id_fkey(*),
                reviewers:users!assessment_assignments_reviewer_id_fkey(*)
              ),
              assessment_responses(*)
            `)
            .eq('assessment_assignments.assessments.organization_id', organizationId);

          if (assessmentId) {
            query = query.eq('assessment_assignments.assessment_id', assessmentId);
          }

          const { data, error } = await query;

          if (error) throw error;

          if (!data || data.length === 0) {
            set({ analytics: null, isLoading: false, error: null });
            return;
          }

          // Calculate analytics
          const totalAssessments = data.length;
          const completedAssessments = data.filter((r: any) => r.assessment_assignments.status === 'completed').length;
          const averageScore = data.reduce((sum: number, r: any) => sum + (r.overall_score || 0), 0) / totalAssessments;

          // Calculate section averages
          const sectionScores: Record<string, number> = {};
          const sectionCounts: Record<string, number> = {};

          data.forEach((result: any) => {
            Object.entries(result.section_scores || {}).forEach(([sectionId, score]) => {
              if (!sectionScores[sectionId]) {
                sectionScores[sectionId] = 0;
                sectionCounts[sectionId] = 0;
              }
              sectionScores[sectionId] += score as number;
              sectionCounts[sectionId]++;
            });
          });

          Object.keys(sectionScores).forEach(sectionId => {
            sectionScores[sectionId] = sectionScores[sectionId] / sectionCounts[sectionId];
          });

          // Map section IDs to names
          let sectionAverages = sectionScores;
          if (assessmentId) {
            sectionAverages = await mapSectionAveragesToNames(assessmentId, sectionScores);
          }

          // Calculate question averages
          const questionScores: Record<string, number> = {};
          const questionCounts: Record<string, number> = {};

          data.forEach((result: any) => {
            result.assessment_responses?.forEach((response: any) => {
              if (response.rating) {
                if (!questionScores[response.question_id]) {
                  questionScores[response.question_id] = 0;
                  questionCounts[response.question_id] = 0;
                }
                questionScores[response.question_id] += response.rating;
                questionCounts[response.question_id]++;
              }
            });
          });

          Object.keys(questionScores).forEach(questionId => {
            questionScores[questionId] = questionScores[questionId] / questionCounts[questionId];
          });

          // Calculate relationship type breakdown
          const relationshipTypeBreakdown: Record<string, number> = {};
          data.forEach((result: any) => {
            const type = result.assessment_assignments.relationship_type;
            relationshipTypeBreakdown[type] = (relationshipTypeBreakdown[type] || 0) + 1;
          });

          // Calculate completion and response rates
          const totalAssignments = await supabase
            .from('assessment_assignments')
            .select('id', { count: 'exact' })
            .eq('assessments.organization_id', organizationId);

          const completionRate = totalAssignments.count ? (completedAssessments / totalAssignments.count) * 100 : 0;
          const responseRate = totalAssignments.count ? (totalAssessments / totalAssignments.count) * 100 : 0;

          // Identify top strengths and areas for improvement
          const sortedQuestions = Object.entries(questionScores)
            .sort(([,a], [,b]) => (b as number) - (a as number));

          const topStrengths = sortedQuestions.slice(0, 3).map(([questionId]) => questionId);
          const areasForImprovement = sortedQuestions.slice(-3).map(([questionId]) => questionId);

          const analytics: AssessmentAnalytics = {
            totalAssessments,
            completedAssessments,
            averageScore,
            sectionAverages,
            questionAverages: questionScores,
            relationshipTypeBreakdown,
            completionRate,
            responseRate,
            topStrengths,
            areasForImprovement
          };

          set({ analytics, isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      fetchComparisonData: async (questionIds: string[], organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_responses')
            .select(`
              *,
              assessment_assignments!inner(
                *,
                assessments!inner(*),
                questions!inner(*)
              )
            `)
            .in('question_id', questionIds)
            .eq('assessment_assignments.assessments.organization_id', organizationId);

          if (error) throw error;

          const comparisonData: ComparisonData[] = questionIds.map(questionId => {
            const questionResponses = data?.filter(r => r.question_id === questionId) || [];
            const questionText = questionResponses[0]?.assessment_assignments?.questions?.text || '';

            // Calculate average score
            const totalRating = questionResponses.reduce((sum, r) => sum + (r.rating || 0), 0);
            const averageScore = questionResponses.length > 0 ? totalRating / questionResponses.length : 0;

            // Calculate score distribution
            const scoreDistribution: Record<number, number> = {};
            questionResponses.forEach(response => {
              if (response.rating) {
                scoreDistribution[response.rating] = (scoreDistribution[response.rating] || 0) + 1;
              }
            });

            // Calculate relationship type averages
            const relationshipTypeAverages: Record<string, number> = {};
            const relationshipTypeCounts: Record<string, number> = {};

            questionResponses.forEach(response => {
              const type = response.assessment_assignments?.relationship_type || 'unknown';
              if (response.rating) {
                if (!relationshipTypeAverages[type]) {
                  relationshipTypeAverages[type] = 0;
                  relationshipTypeCounts[type] = 0;
                }
                relationshipTypeAverages[type] += response.rating;
                relationshipTypeCounts[type]++;
              }
            });

            Object.keys(relationshipTypeAverages).forEach(type => {
              relationshipTypeAverages[type] = relationshipTypeAverages[type] / relationshipTypeCounts[type];
            });

            return {
              questionId,
              questionText,
              averageScore,
              totalResponses: questionResponses.length,
              scoreDistribution,
              relationshipTypeAverages
            };
          });

          set({ comparisonData, isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      createAssignment: async (data: Omit<AssessmentAssignment, 'id' | 'createdAt' | 'updatedAt'>) => {
        set({ isLoading: true, error: null });
        try {
          const assignmentData = {
            assessment_id: data.assessmentId,
            employee_id: data.employeeId,
            reviewer_id: data.reviewerId,
            relationship_type: data.relationshipType,
            status: data.status,
            due_date: data.dueDate,
            assigned_by_id: data.assignedById,
            notification_sent: data.notificationSent,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: result, error } = await supabase
            .from('assessment_assignments')
            .insert(assignmentData)
            .select()
            .single();

          if (error) throw error;

          set({ isLoading: false, error: null });
          return result.id;
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
          throw error;
        }
      },

      updateAssignmentStatus: async (assignmentId: string, status: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('assessment_assignments')
            .update({ 
              status,
              updated_at: new Date().toISOString()
            })
            .eq('id', assignmentId);

          if (error) throw error;

          set({ isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      fetchAssignments: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_assignments')
            .select(`
              *,
              assessments!inner(*),
              employees:users!assessment_assignments_employee_id_fkey(*),
              reviewers:users!assessment_assignments_reviewer_id_fkey(*)
            `)
            .eq('assessments.organization_id', organizationId);

          if (error) throw error;

          const assignments: AssessmentAssignment[] = data?.map(item => ({
            id: item.id,
            assessmentId: item.assessment_id,
            employeeId: item.employee_id,
            reviewerId: item.reviewer_id,
            relationshipType: item.relationship_type,
            status: item.status,
            dueDate: item.due_date,
            assignedById: item.assigned_by_id,
            notificationSent: item.notification_sent,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          })) || [];

          set({ assignments, isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      // Fetch self-assessments (where employeeId === userId and reviewerId === userId)
      fetchSelfAssessments: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_results')
            .select(`*, assessment_assignments!inner(*), assessment_responses(*)`)
            .eq('assessment_assignments.employee_id', userId)
            .eq('assessment_assignments.reviewer_id', userId);
          if (error) throw error;
          set({ results: data || [], isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      // Fetch reviews about me (where employeeId === userId and reviewerId !== userId)
      fetchReviewsAboutMe: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_results')
            .select(`*, assessment_assignments!inner(*), assessment_responses(*)`)
            .eq('assessment_assignments.employee_id', userId)
            .neq('assessment_assignments.reviewer_id', userId);
          if (error) throw error;
          set({ results: data || [], isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      // Fetch reviews I've done (where reviewerId === userId and employeeId !== userId)
      fetchReviewsIDone: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_results')
            .select(`*, assessment_assignments!inner(*), assessment_responses(*)`)
            .eq('assessment_assignments.reviewer_id', userId)
            .neq('assessment_assignments.employee_id', userId);
          if (error) throw error;
          set({ results: data || [], isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      // Fetch org/department breakdown for org admin
      fetchOrgDepartmentResults: async (organizationId: string, departmentId?: string) => {
        set({ isLoading: true, error: null });
        try {
          let query = supabase
            .from('assessment_results')
            .select(`*, assessment_assignments!inner(*, employees:users!assessment_assignments_employee_id_fkey(*)), assessment_responses(*)`)
            .eq('assessment_assignments.assessments.organization_id', organizationId);
          if (departmentId) {
            query = query.eq('assessment_assignments.employees.department_id', departmentId);
          }
          const { data, error } = await query;
          if (error) throw error;
          set({ results: data || [], isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      // Fetch all-org results for super admin
      fetchAllOrgResults: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_results')
            .select(`*, assessment_assignments!inner(*, assessments!inner(*), employees:users!assessment_assignments_employee_id_fkey(*), reviewers:users!assessment_assignments_reviewer_id_fkey(*)), assessment_responses(*)`);
          if (error) throw error;
          set({ results: data || [], isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      // Export all results as CSV (for super admin)
      exportAllResultsAsCSV: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_results')
            .select(`*, assessment_assignments!inner(*, assessments!inner(*), employees:users!assessment_assignments_employee_id_fkey(*), reviewers:users!assessment_assignments_reviewer_id_fkey(*)), assessment_responses(*)`);
          if (error) throw error;
          // Convert data to CSV
          const csvRows = [];
          if (data && data.length > 0) {
            const headers = Object.keys(data[0]);
            csvRows.push(headers.join(','));
            for (const row of data) {
              csvRows.push(headers.map((h: any) => JSON.stringify((row as any)[h] ?? '')).join(','));
            }
          }
          const csv = csvRows.join('\n');
          set({ isLoading: false, error: null });
          return csv;
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
          return '';
        }
      },

      // Utility functions
      generateOrganizationId,
      generateStaffId,
      calculateAverages
    }),
    {
      name: 'assessment-results-store',
      partialize: (state) => ({
        results: state.results,
        assignments: state.assignments,
        analytics: state.analytics
      })
    }
  )
); 