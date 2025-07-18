import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { AssessmentResult } from '../types';

interface ResultState {
  results: Record<string, AssessmentResult[]>; // employeeId -> results
  isLoading: boolean;
  error: string | null;
  fetchResults: (employeeId: string) => Promise<void>;
  fetchOrganizationResults: (organizationId: string, anonymized?: boolean) => Promise<AssessmentResult[]>;
  fetchSystemResults: (anonymized?: boolean) => Promise<Record<string, AssessmentResult[]>>;
  exportResults: (format: 'csv' | 'pdf', userId?: string, anonymized?: boolean) => Promise<string>;
}

export const useResultStore = create<ResultState>((set) => ({
  results: {},
  isLoading: false,
  error: null,
  
  fetchResults: async (employeeId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch assessment results for the employee
      const { data: results, error } = await supabase
        .from('assessment_results')
        .select(`
          *,
          assessment_assignments!inner(
            *,
            assessments!inner(*),
            employees:users!assessment_assignments_employee_id_fkey(*)
          ),
          assessment_responses!inner(
            *,
            assessment_questions!inner(*)
          )
        `)
        .eq('assessment_assignments.employee_id', employeeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process and group results by assignment
      const processedResults: AssessmentResult[] = [];
      
      if (results) {
        // Group by assignment and process
        const groupedByAssignment = results.reduce((acc: any, result: any) => {
          const assignmentId = result.assessment_assignments.id;
          if (!acc[assignmentId]) {
            acc[assignmentId] = {
              assignment: result.assessment_assignments,
              results: [],
              responses: []
            };
          }
          acc[assignmentId].results.push(result);
          acc[assignmentId].responses.push(...result.assessment_responses);
          return acc;
        }, {});

        // Convert to AssessmentResult format
        Object.values(groupedByAssignment).forEach((group: any) => {
          const assignment = group.assignment;
          const responses = group.responses;

          // Group responses by section/question
          const sectionResults = processResponsesBySection(responses);

          processedResults.push(...sectionResults);
        });
      }

      set(state => ({ 
        results: { 
          ...state.results, 
          [employeeId]: processedResults 
        }, 
        isLoading: false 
      }));
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },
  
  fetchOrganizationResults: async (organizationId: string, anonymized: boolean = true) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('assessment_results')
        .select(`
          *,
          assessment_assignments!inner(
            *,
            assessments!inner(*),
            employees:users!assessment_assignments_employee_id_fkey(*)
          ),
          assessment_responses!inner(
            *,
            assessment_questions!inner(*)
          )
        `)
        .eq('assessment_assignments.employees.organization_id', organizationId)
        .eq('is_active', true);

      if (anonymized) {
        // For anonymized results, aggregate by competency/section
        query = query.select('assessment_responses.assessment_questions.competency_id, assessment_responses.rating');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      let orgResults: AssessmentResult[] = [];

      if (anonymized && data) {
        // Aggregate anonymized results
        orgResults = aggregateAnonymizedResults(data);
      } else if (data) {
        // Process individual results (for org admins with permission)
        orgResults = processOrganizationResults(data);
      }

      set({ isLoading: false });
      return orgResults;
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
      return [];
    }
  },
  
  fetchSystemResults: async (anonymized: boolean = false) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('assessment_results')
        .select(`
          *,
          assessment_assignments!inner(
            *,
            assessments!inner(*),
            employees:users!assessment_assignments_employee_id_fkey(*)
          ),
          assessment_responses!inner(
            *,
            assessment_questions!inner(*)
          )
        `)
        .eq('is_active', true);

      if (anonymized) {
        // For anonymized results, aggregate by organization
        query = query.select('assessment_assignments.employees.organization_id, assessment_responses.rating');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      let systemResults: Record<string, AssessmentResult[]> = {};

      if (anonymized && data) {
        // Aggregate by organization
        systemResults = aggregateSystemResultsByOrganization(data);
      } else if (data) {
        // Process individual results by organization
        systemResults = processSystemResults(data);
      }

      set({ isLoading: false });
      return systemResults;
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
      return {};
    }
  },
  
  exportResults: async (format: 'csv' | 'pdf', userId?: string, anonymized: boolean = false) => {
    set({ isLoading: true, error: null });
    try {
      // Create export record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: exportRecord, error } = await supabase
        .from('assessment_exports')
        .insert({
          user_id: user.id,
          export_type: format,
          anonymized,
          status: 'processing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // In a real implementation, this would trigger a background job
      // For now, we'll simulate the export process
      const timestamp = new Date().toISOString().split('T')[0];
      const userSuffix = userId ? `-user-${userId.slice(-4)}` : '-organization';
      const anonymizedSuffix = anonymized ? '-anonymized' : '';
      const downloadUrl = `https://exports.leadership360.com/assessment-results${userSuffix}${anonymizedSuffix}-${timestamp}.${format}`;

      // Update export record with download URL
      await supabase
        .from('assessment_exports')
        .update({ 
          download_url: downloadUrl,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', exportRecord.id);

      set({ isLoading: false });
      return downloadUrl;
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
      return '';
    }
  }
}));

// Helper functions for processing results
function processResponsesBySection(responses: any[]): AssessmentResult[] {
  // Group responses by section/question and calculate averages
  const sectionMap = new Map<string, any>();

  responses.forEach((response: any) => {
    const question = response.assessment_questions;
    const sectionId = question.section_id || 'default';
    
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        sectionId,
        sectionTitle: question.section_title || 'Assessment Section',
        questions: [],
        selfRatings: [],
        reviewerRatings: [],
        comments: []
      });
    }

    const section = sectionMap.get(sectionId);
    section.questions.push({
      id: question.id,
      text: question.question_text,
      selfRating: response.respondent_id === response.assignment_employee_id ? response.rating : 0,
      avgReviewerRating: response.respondent_id !== response.assignment_employee_id ? response.rating : 0,
      gap: 0, // Will be calculated
      alignment: 'aligned', // Will be calculated
      comments: response.comment ? [response.comment] : [],
      competencies: question.competency_id ? [{ id: question.competency_id, name: question.competency_name }] : []
    });

    if (response.respondent_id === response.assignment_employee_id) {
      section.selfRatings.push(response.rating);
    } else {
      section.reviewerRatings.push(response.rating);
    }

    if (response.comment) {
      section.comments.push(response.comment);
    }
  });

  // Calculate averages and gaps
  const results: AssessmentResult[] = [];
  sectionMap.forEach((section) => {
    const selfAverage = section.selfRatings.length > 0 
      ? section.selfRatings.reduce((a: number, b: number) => a + b, 0) / section.selfRatings.length 
      : 0;
    const reviewerAverage = section.reviewerRatings.length > 0 
      ? section.reviewerRatings.reduce((a: number, b: number) => a + b, 0) / section.reviewerRatings.length 
      : 0;
    const overallGap = selfAverage - reviewerAverage;

    // Calculate alignment
    const overallAlignment = Math.abs(overallGap) < 0.5 ? 'aligned' 
      : overallGap > 0 ? 'blind_spot' : 'hidden_strength';

    // Process questions
    section.questions.forEach((question: any) => {
      const gap = question.selfRating - question.avgReviewerRating;
      question.gap = gap;
      question.alignment = Math.abs(gap) < 0.5 ? 'aligned' 
        : gap > 0 ? 'blind_spot' : 'hidden_strength';
    });

    results.push({
      sectionId: section.sectionId,
      sectionTitle: section.sectionTitle,
      questions: section.questions,
      selfAverage,
      reviewerAverage,
      overallGap,
      overallAlignment,
      competencyResults: [] // Will be calculated based on competencies
    });
  });

  return results;
}

function aggregateAnonymizedResults(data: any[]): AssessmentResult[] {
  // Aggregate results by competency/section for anonymized view
  const competencyMap = new Map<string, any>();

  data.forEach((item: any) => {
    const competencyId = item.assessment_responses?.assessment_questions?.competency_id;
    const rating = item.assessment_responses?.rating;

    if (competencyId && rating) {
      if (!competencyMap.has(competencyId)) {
        competencyMap.set(competencyId, {
          competencyId,
          ratings: [],
          competencyName: item.assessment_responses?.assessment_questions?.competency_name || 'Unknown'
        });
      }
      competencyMap.get(competencyId).ratings.push(rating);
    }
  });

  const results: AssessmentResult[] = [];
  competencyMap.forEach((competency) => {
    const avgRating = competency.ratings.reduce((a: number, b: number) => a + b, 0) / competency.ratings.length;
    
    results.push({
      sectionId: `comp-${competency.competencyId}`,
      sectionTitle: competency.competencyName,
      questions: [],
      selfAverage: 0,
      reviewerAverage: avgRating,
      overallGap: 0,
      overallAlignment: 'aligned',
      competencyResults: [{
        competencyId: competency.competencyId,
        competencyName: competency.competencyName,
        selfAverage: 0,
        reviewerAverage: avgRating,
        gap: 0,
        alignment: 'aligned'
      }]
    });
  });

  return results;
}

function processOrganizationResults(data: any[]): AssessmentResult[] {
  // Process individual results for organization view
  return processResponsesBySection(data.flatMap((item: any) => item.assessment_responses || []));
}

function aggregateSystemResultsByOrganization(data: any[]): Record<string, AssessmentResult[]> {
  // Aggregate results by organization
  const orgMap = new Map<string, any[]>();

  data.forEach((item: any) => {
    const orgId = item.assessment_assignments?.employees?.organization_id;
    if (orgId) {
      if (!orgMap.has(orgId)) {
        orgMap.set(orgId, []);
      }
      orgMap.get(orgId)!.push(item);
    }
  });

  const results: Record<string, AssessmentResult[]> = {};
  orgMap.forEach((orgData, orgId) => {
    results[orgId] = aggregateAnonymizedResults(orgData);
  });

  return results;
}

function processSystemResults(data: any[]): Record<string, AssessmentResult[]> {
  // Process individual results by organization
  const orgMap = new Map<string, any[]>();

  data.forEach((item: any) => {
    const orgId = item.assessment_assignments?.employees?.organization_id;
    if (orgId) {
      if (!orgMap.has(orgId)) {
        orgMap.set(orgId, []);
      }
      orgMap.get(orgId)!.push(item);
    }
  });

  const results: Record<string, AssessmentResult[]> = {};
  orgMap.forEach((orgData, orgId) => {
    results[orgId] = processOrganizationResults(orgData);
  });

  return results;
}