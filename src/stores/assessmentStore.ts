import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { Assessment, AssessmentSection, AssessmentQuestion, QuestionOption } from '../types';

interface AssessmentState {
  assessments: Assessment[];
  currentAssessment: Assessment | null;
  publishedAssessments: Assessment[];
  userAssessments: Assessment[];
  isLoading: boolean;
  error: string | null;
  fetchAssessments: (organizationId?: string) => Promise<void>;
  fetchAssessment: (id: string) => Promise<void>;
  fetchUserAssessments: (userId: string) => Promise<void>;
  createAssessment: (data: Omit<Assessment, 'id' | 'sections' | 'createdAt' | 'updatedAt'>) => Promise<string | undefined>;
  createAssessmentFromTemplate: (templateId: string, organizationId: string, title: string, description?: string) => Promise<string | undefined>;
  updateAssessment: (id: string, data: Partial<Omit<Assessment, 'sections'>>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  addSection: (assessmentId: string, section: Omit<AssessmentSection, 'id' | 'questions'>) => Promise<void>;
  updateSection: (assessmentId: string, sectionId: string, data: Partial<Omit<AssessmentSection, 'questions'>>) => Promise<void>;
  deleteSection: (assessmentId: string, sectionId: string) => Promise<void>;
  addQuestion: (assessmentId: string, sectionId: string, question: Omit<AssessmentQuestion, 'id'>) => Promise<void>;
  updateQuestion: (assessmentId: string, sectionId: string, questionId: string, data: Partial<AssessmentQuestion>) => Promise<void>;
  deleteQuestion: (assessmentId: string, sectionId: string, questionId: string) => Promise<void>;
  assignUsers: (assessmentId: string, employeeIds: string[], reviewerIds: string[]) => Promise<void>;
  assignOrganizations: (assessmentId: string, organizationIds: string[]) => Promise<void>;
}

// Enhanced mock data with preset assessments using 1-7 scale
const defaultMockAssessments: Assessment[] = [
  {
    id: 'preset-assessment-1',
    title: 'Leadership Excellence Assessment',
    description: 'Comprehensive evaluation of leadership capabilities and management skills',
    organizationId: 'demo-org-1',
    createdById: '1',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assessmentType: 'preset',
    isDeletable: false,
    sections: [
      {
        id: 'preset-section-1',
        title: 'Communication & Interpersonal Skills',
        description: 'Evaluate communication effectiveness and relationship building',
        order: 1,
        questions: [
          {
            id: 'preset-question-1',
            text: 'How effectively does this person communicate complex ideas to team members?',
            order: 1,
            questionType: 'rating',
            scaleMax: 7,
            isRequired: true,
            options: []
          },
          {
            id: 'preset-question-2',
            text: 'Rate their ability to provide constructive feedback',
            order: 2,
            questionType: 'rating',
            scaleMax: 7,
            isRequired: true,
            options: []
          }
        ]
      },
      {
        id: 'preset-section-2',
        title: 'Decision Making & Problem Solving',
        description: 'Assess analytical thinking and decision-making capabilities',
        order: 2,
        questions: [
          {
            id: 'preset-question-3',
            text: 'How well does this person analyze complex problems?',
            order: 1,
            questionType: 'rating',
            scaleMax: 7,
            isRequired: true,
            options: []
          }
        ]
      }
    ],
    assignedOrganizations: [
      { id: 'demo-org-1', name: 'Acme Corporation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'demo-org-2', name: 'TechStart Solutions', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'demo-org-3', name: 'Global Enterprises', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]
  },
  {
    id: 'preset-assessment-2',
    title: 'Team Collaboration Assessment',
    description: 'Evaluate teamwork, collaboration, and interpersonal effectiveness',
    organizationId: 'demo-org-1',
    createdById: '1',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assessmentType: 'preset',
    isDeletable: false,
    sections: [
      {
        id: 'preset-section-3',
        title: 'Teamwork & Collaboration',
        description: 'Assess ability to work effectively with others',
        order: 1,
        questions: [
          {
            id: 'preset-question-4',
            text: 'How well does this person collaborate with cross-functional teams?',
            order: 1,
            questionType: 'rating',
            scaleMax: 7,
            isRequired: true,
            options: []
          }
        ]
      }
    ],
    assignedOrganizations: [
      { id: 'demo-org-1', name: 'Acme Corporation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'demo-org-2', name: 'TechStart Solutions', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]
  }
];

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      assessments: [],
      currentAssessment: null,
      publishedAssessments: [],
      userAssessments: [],
      isLoading: false,
      error: null,

      fetchAssessments: async (organizationId?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Try to fetch from Supabase first
          let query = supabase
            .from('assessments')
            .select(`
              *,
              organizations (name),
              users (first_name, last_name, email),
              assessment_questions (
                *,
                question_options (*)
              )
            `)
            .eq('is_active', true);

          if (organizationId) {
            query = query.eq('organization_id', organizationId);
          }

          const { data: dbAssessments, error } = await query.order('created_at', { ascending: false });

          if (error) {
            console.warn('Failed to fetch from database, using mock data:', error);
            // Fallback to mock data
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { assessments: currentAssessments } = get();
            
            // Merge preset assessments with custom assessments
            const presetAssessments = defaultMockAssessments;
            const customAssessments = currentAssessments.filter(a => a.assessmentType !== 'preset');
            const allAssessments = [...presetAssessments, ...customAssessments];
            
            const filteredAssessments = organizationId 
              ? allAssessments.filter(a => 
                  a.organizationId === organizationId || 
                  (a.assessmentType === 'preset' && a.assignedOrganizations?.some(org => org.id === organizationId))
                )
              : allAssessments;
            
            set({ assessments: filteredAssessments, isLoading: false, error: null });
          } else {
            // Transform database assessments to match our interface
            const transformedAssessments = dbAssessments.map(dbAssessment => {
              // Group questions by section
              const questionsBySection = dbAssessment.assessment_questions.reduce((acc: any, question: any) => {
                const section = question.section || 'General';
                if (!acc[section]) {
                  acc[section] = [];
                }
                acc[section].push({
                  id: question.id,
                  text: question.question_text,
                  order: question.order_index,
                  questionType: question.question_type,
                  scaleMax: question.scale_max || 7,
                  isRequired: question.is_required,
                  options: question.question_options || []
                });
                return acc;
              }, {});

              // Create sections from grouped questions
              const sections = Object.entries(questionsBySection).map(([sectionName, questions]: [string, any], index) => ({
                id: `section-${index}`,
                title: sectionName,
                description: `${sectionName} assessment questions`,
                order: index + 1,
                questions: questions.sort((a: any, b: any) => a.order - b.order)
              }));

              return {
                id: dbAssessment.id,
                title: dbAssessment.title,
                description: dbAssessment.description,
                organizationId: dbAssessment.organization_id,
                createdById: dbAssessment.created_by_id,
                createdAt: dbAssessment.created_at,
                updatedAt: dbAssessment.updated_at,
                assessmentType: dbAssessment.assessment_type || 'custom',
                isDeletable: dbAssessment.is_deletable !== false,
                sections,
                assignedOrganizations: dbAssessment.assigned_organizations || []
              };
            });

            set({ assessments: transformedAssessments, isLoading: false, error: null });
          }
        } catch (error) {
          set({ error: 'Failed to fetch assessments', isLoading: false });
        }
      },

      fetchAssessment: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // Try to fetch from Supabase first
          const { data: dbAssessment, error } = await supabase
            .from('assessments')
            .select(`
              *,
              organizations (name),
              users (first_name, last_name, email),
              assessment_questions (
                *,
                question_options (*)
              )
            `)
            .eq('id', id)
            .single();

          if (error) {
            console.warn('Failed to fetch from database, using mock data:', error);
            // Fallback to mock data
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { assessments } = get();
            const allAssessments = [...defaultMockAssessments, ...assessments];
            const assessment = allAssessments.find(a => a.id === id);
            
            if (assessment) {
              set({ currentAssessment: assessment, isLoading: false, error: null });
            } else {
              set({ error: 'Assessment not found', isLoading: false });
            }
          } else {
            // Transform database assessment
            const questionsBySection = dbAssessment.assessment_questions.reduce((acc: any, question: any) => {
              const section = question.section || 'General';
              if (!acc[section]) {
                acc[section] = [];
              }
              acc[section].push({
                id: question.id,
                text: question.question_text,
                order: question.order_index,
                questionType: question.question_type,
                scaleMax: question.scale_max || 7,
                isRequired: question.is_required,
                options: question.question_options || []
              });
              return acc;
            }, {});

            const sections = Object.entries(questionsBySection).map(([sectionName, questions]: [string, any], index) => ({
              id: `section-${index}`,
              title: sectionName,
              description: `${sectionName} assessment questions`,
              order: index + 1,
              questions: questions.sort((a: any, b: any) => a.order - b.order)
            }));

            const assessment = {
              id: dbAssessment.id,
              title: dbAssessment.title,
              description: dbAssessment.description,
              organizationId: dbAssessment.organization_id,
              createdById: dbAssessment.created_by_id,
              createdAt: dbAssessment.created_at,
              updatedAt: dbAssessment.updated_at,
              assessmentType: dbAssessment.assessment_type || 'custom',
              isDeletable: dbAssessment.is_deletable !== false,
              sections,
              assignedOrganizations: dbAssessment.assigned_organizations || []
            };

            set({ currentAssessment: assessment, isLoading: false, error: null });
          }
        } catch (error) {
          set({ error: 'Failed to fetch assessment', isLoading: false });
        }
      },

      fetchUserAssessments: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          // Try to fetch from Supabase first
          const { data: dbAssessments, error } = await supabase
            .from('assessments')
            .select(`
              *,
              organizations (name),
              assessment_questions (*)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (error) {
            console.warn('Failed to fetch from database, using mock data:', error);
            // Fallback to mock data
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Include both preset and published custom assessments
            const { publishedAssessments } = get();
            const allPublishedAssessments = [...defaultMockAssessments, ...publishedAssessments];
            
            set({ 
              userAssessments: allPublishedAssessments, 
              isLoading: false, 
              error: null 
            });
          } else {
            // Transform database assessments
            const transformedAssessments = dbAssessments.map(dbAssessment => ({
              id: dbAssessment.id,
              title: dbAssessment.title,
              description: dbAssessment.description,
              organizationId: dbAssessment.organization_id,
              createdById: dbAssessment.created_by_id,
              createdAt: dbAssessment.created_at,
              updatedAt: dbAssessment.updated_at,
              assessmentType: dbAssessment.assessment_type || 'custom',
              isDeletable: dbAssessment.is_deletable !== false,
              sections: [], // Simplified for user view
              assignedOrganizations: dbAssessment.assigned_organizations || []
            }));

            set({ 
              userAssessments: transformedAssessments, 
              isLoading: false, 
              error: null 
            });
          }
        } catch (error) {
          set({ error: 'Failed to fetch user assessments', isLoading: false });
        }
      },

      createAssessment: async (data: Omit<Assessment, 'id' | 'sections' | 'createdAt' | 'updatedAt'>) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { data: assessment, error } = await supabase
            .from('assessments')
            .insert({
              title: data.title,
              description: data.description,
              organization_id: data.organizationId,
              created_by_id: user.id,
              assessment_type: data.assessmentType || 'custom',
              is_deletable: data.isDeletable !== false
            })
            .select()
            .single();

          if (error) throw error;

          const newAssessment: Assessment = {
            id: assessment.id,
            title: assessment.title,
            description: assessment.description,
            organizationId: assessment.organization_id,
            createdById: assessment.created_by_id,
            createdAt: assessment.created_at,
            updatedAt: assessment.updated_at,
            assessmentType: assessment.assessment_type || 'custom',
            isDeletable: assessment.is_deletable !== false,
            sections: [],
            assignedOrganizations: []
          };

          set(state => ({
            assessments: [newAssessment, ...state.assessments],
            isLoading: false
          }));

          return assessment.id;
        } catch (error) {
          const errorMessage = handleSupabaseError(error);
          set({ error: errorMessage, isLoading: false });
          return undefined;
        }
      },

      createAssessmentFromTemplate: async (templateId: string, organizationId: string, title: string, description?: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Use the RPC function to create assessment from template
          const { data: assessmentId, error } = await supabase.rpc('create_assessment_from_template', {
            template_id: templateId,
            organization_id: organizationId,
            title: title,
            description: description
          });

          if (error) throw error;

          // Fetch the newly created assessment
          await get().fetchAssessment(assessmentId);

          set({ isLoading: false });
          return assessmentId;
        } catch (error) {
          const errorMessage = handleSupabaseError(error);
          set({ error: errorMessage, isLoading: false });
          return undefined;
        }
      },

      updateAssessment: async (id: string, data: Partial<Omit<Assessment, 'sections'>>) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('assessments')
            .update({
              title: data.title,
              description: data.description,
              assessment_type: data.assessmentType,
              is_deletable: data.isDeletable,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw error;

          set(state => ({
            assessments: state.assessments.map(a => 
              a.id === id 
                ? { ...a, ...data, updatedAt: new Date().toISOString() }
                : a
            ),
            currentAssessment: state.currentAssessment?.id === id
              ? { ...state.currentAssessment, ...data, updatedAt: new Date().toISOString() }
              : state.currentAssessment,
            isLoading: false
          }));
        } catch (error) {
          const errorMessage = handleSupabaseError(error);
          set({ error: errorMessage, isLoading: false });
        }
      },

      deleteAssessment: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('assessments')
            .update({ is_active: false })
            .eq('id', id);

          if (error) throw error;

          set(state => ({
            assessments: state.assessments.filter(a => a.id !== id),
            currentAssessment: state.currentAssessment?.id === id ? null : state.currentAssessment,
            isLoading: false
          }));
        } catch (error) {
          const errorMessage = handleSupabaseError(error);
          set({ error: errorMessage, isLoading: false });
        }
      },

      addSection: async (assessmentId: string, section: Omit<AssessmentSection, 'id' | 'questions'>) => {
        // Implementation for adding sections
      },

      updateSection: async (assessmentId: string, sectionId: string, data: Partial<Omit<AssessmentSection, 'questions'>>) => {
        // Implementation for updating sections
      },

      deleteSection: async (assessmentId: string, sectionId: string) => {
        // Implementation for deleting sections
      },

      addQuestion: async (assessmentId: string, sectionId: string, question: Omit<AssessmentQuestion, 'id'>) => {
        // Implementation for adding questions
      },

      updateQuestion: async (assessmentId: string, sectionId: string, questionId: string, data: Partial<AssessmentQuestion>) => {
        // Implementation for updating questions
      },

      deleteQuestion: async (assessmentId: string, sectionId: string, questionId: string) => {
        // Implementation for deleting questions
      },

      assignUsers: async (assessmentId: string, employeeIds: string[], reviewerIds: string[]) => {
        // Implementation for assigning users
      },

      assignOrganizations: async (assessmentId: string, organizationIds: string[]) => {
        // Implementation for assigning organizations
      }
    }),
    {
      name: 'assessment-store',
      partialize: (state) => ({
        assessments: state.assessments.filter(a => a.assessmentType !== 'preset'),
        publishedAssessments: state.publishedAssessments
      })
    }
  )
);