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
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { assessments: currentAssessments } = get();
          
          // Merge preset assessments with custom assessments
          const presetAssessments = defaultMockAssessments;
          const customAssessments = currentAssessments.filter(a => a.assessmentType !== 'preset');
          const allAssessments = [...presetAssessments, ...customAssessments];
          
          const filteredAssessments = organizationId 
            ? allAssessments.filter(a => 
                a.organizationId === organizationId || 
                a.assignedOrganizations?.some(org => org.id === organizationId)
              )
            : allAssessments;
          
          set({ assessments: filteredAssessments, isLoading: false, error: null });
        } catch (error) {
          set({ error: 'Failed to fetch assessments', isLoading: false });
        }
      },

      fetchAssessment: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { assessments } = get();
          const allAssessments = [...defaultMockAssessments, ...assessments];
          const assessment = allAssessments.find(a => a.id === id);
          
          if (assessment) {
            set({ currentAssessment: assessment, isLoading: false, error: null });
          } else {
            set({ error: 'Assessment not found', isLoading: false });
          }
        } catch (error) {
          set({ error: 'Failed to fetch assessment', isLoading: false });
        }
      },

      fetchUserAssessments: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Include both preset and published custom assessments
          const { publishedAssessments } = get();
          const allPublishedAssessments = [...defaultMockAssessments, ...publishedAssessments];
          
          set({ 
            userAssessments: allPublishedAssessments, 
            isLoading: false, 
            error: null 
          });
        } catch (error) {
          set({ error: 'Failed to fetch user assessments', isLoading: false });
        }
      },

      createAssessment: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const newAssessment: Assessment = {
            id: `custom-assessment-${Date.now()}`,
            title: data.title,
            description: data.description,
            organizationId: data.organizationId,
            createdById: data.createdById,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assessmentType: 'custom',
            isDeletable: true,
            sections: [],
            assignedOrganizations: []
          };

          set(state => ({
            assessments: [newAssessment, ...state.assessments],
            isLoading: false,
            error: null
          }));

          return newAssessment.id;
        } catch (error) {
          set({ error: 'Failed to create assessment', isLoading: false });
          return undefined;
        }
      },

      updateAssessment: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));

          set(state => ({
            assessments: state.assessments.map(assessment =>
              assessment.id === id ? { ...assessment, ...data, updatedAt: new Date().toISOString() } : assessment
            ),
            currentAssessment: state.currentAssessment?.id === id
              ? { ...state.currentAssessment, ...data, updatedAt: new Date().toISOString() }
              : state.currentAssessment,
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to update assessment', isLoading: false });
        }
      },

      deleteAssessment: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));

          // Check if assessment is deletable
          const { assessments } = get();
          const assessment = assessments.find(a => a.id === id);
          
          if (assessment && !assessment.isDeletable) {
            throw new Error('This assessment cannot be deleted as it is a system preset.');
          }

          set(state => ({
            assessments: state.assessments.filter(a => a.id !== id),
            currentAssessment: state.currentAssessment?.id === id ? null : state.currentAssessment,
            publishedAssessments: state.publishedAssessments.filter(a => a.id !== id),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to delete assessment', isLoading: false });
        }
      },

      addSection: async (assessmentId, section) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));

          const newSection: AssessmentSection = {
            id: `section-${Date.now()}`,
            ...section,
            questions: []
          };

          const { currentAssessment } = get();
          if (!currentAssessment) throw new Error('No current assessment loaded');

          const updatedAssessment = {
            ...currentAssessment,
            sections: [...currentAssessment.sections, newSection],
            updatedAt: new Date().toISOString()
          };

          set(state => ({
            currentAssessment: updatedAssessment,
            assessments: state.assessments.map(a => 
              a.id === assessmentId ? updatedAssessment : a
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to add section', isLoading: false });
        }
      },

      updateSection: async (assessmentId, sectionId, data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));

          const { currentAssessment } = get();
          if (!currentAssessment) throw new Error('No current assessment loaded');

          const updatedSections = currentAssessment.sections.map(s =>
            s.id === sectionId ? { ...s, ...data } : s
          );

          const updatedAssessment = {
            ...currentAssessment,
            sections: updatedSections,
            updatedAt: new Date().toISOString()
          };

          set(state => ({
            currentAssessment: updatedAssessment,
            assessments: state.assessments.map(a => 
              a.id === assessmentId ? updatedAssessment : a
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to update section', isLoading: false });
        }
      },

      deleteSection: async (assessmentId, sectionId) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));

          const { currentAssessment } = get();
          if (!currentAssessment) throw new Error('No current assessment loaded');

          const updatedAssessment = {
            ...currentAssessment,
            sections: currentAssessment.sections.filter(s => s.id !== sectionId),
            updatedAt: new Date().toISOString()
          };

          set(state => ({
            currentAssessment: updatedAssessment,
            assessments: state.assessments.map(a => 
              a.id === assessmentId ? updatedAssessment : a
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to delete section', isLoading: false });
        }
      },

      addQuestion: async (assessmentId, sectionId, question) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));

          const newQuestion: AssessmentQuestion = {
            id: `question-${Date.now()}`,
            ...question,
            scaleMax: question.questionType === 'rating' ? (question.scaleMax || 7) : question.scaleMax,
            options: question.options || []
          };

          const { currentAssessment } = get();
          if (!currentAssessment) throw new Error('No current assessment loaded');

          const updatedSections = currentAssessment.sections.map(s => {
            if (s.id === sectionId) {
              return {
                ...s,
                questions: [...s.questions, newQuestion]
              };
            }
            return s;
          });

          const updatedAssessment = {
            ...currentAssessment,
            sections: updatedSections,
            updatedAt: new Date().toISOString()
          };

          set(state => ({
            currentAssessment: updatedAssessment,
            assessments: state.assessments.map(a => 
              a.id === assessmentId ? updatedAssessment : a
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to add question', isLoading: false });
        }
      },

      updateQuestion: async (assessmentId, sectionId, questionId, data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));

          const { currentAssessment } = get();
          if (!currentAssessment) throw new Error('No current assessment loaded');

          const updatedSections = currentAssessment.sections.map(s => {
            if (s.id === sectionId) {
              return {
                ...s,
                questions: s.questions.map(q =>
                  q.id === questionId ? { ...q, ...data } : q
                )
              };
            }
            return s;
          });

          const updatedAssessment = {
            ...currentAssessment,
            sections: updatedSections,
            updatedAt: new Date().toISOString()
          };

          set(state => ({
            currentAssessment: updatedAssessment,
            assessments: state.assessments.map(a => 
              a.id === assessmentId ? updatedAssessment : a
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to update question', isLoading: false });
        }
      },

      deleteQuestion: async (assessmentId, sectionId, questionId) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));

          const { currentAssessment } = get();
          if (!currentAssessment) throw new Error('No current assessment loaded');

          const updatedSections = currentAssessment.sections.map(s => {
            if (s.id === sectionId) {
              return {
                ...s,
                questions: s.questions.filter(q => q.id !== questionId)
              };
            }
            return s;
          });

          const updatedAssessment = {
            ...currentAssessment,
            sections: updatedSections,
            updatedAt: new Date().toISOString()
          };

          set(state => ({
            currentAssessment: updatedAssessment,
            assessments: state.assessments.map(a => 
              a.id === assessmentId ? updatedAssessment : a
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to delete question', isLoading: false });
        }
      },

      assignUsers: async (assessmentId, employeeIds, reviewerIds) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          set({ isLoading: false, error: null });
        } catch (error) {
          set({ error: 'Failed to assign users', isLoading: false });
        }
      },

      assignOrganizations: async (assessmentId, organizationIds) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const { currentAssessment, assessments } = get();
          
          if (currentAssessment && currentAssessment.id === assessmentId) {
            const mockOrgs = [
              { id: 'demo-org-1', name: 'Acme Corporation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
              { id: 'demo-org-2', name: 'TechStart Solutions', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
              { id: 'demo-org-3', name: 'Global Enterprises', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            ];
            
            const assignedOrgs = mockOrgs.filter(org => organizationIds.includes(org.id));
            
            const updatedAssessment = {
              ...currentAssessment,
              assignedOrganizations: assignedOrgs,
              updatedAt: new Date().toISOString()
            };
            
            set(state => ({
              currentAssessment: updatedAssessment,
              assessments: state.assessments.map(a => 
                a.id === assessmentId ? updatedAssessment : a
              ),
              publishedAssessments: [
                ...state.publishedAssessments.filter(a => a.id !== assessmentId),
                updatedAssessment
              ],
              isLoading: false,
              error: null
            }));
          }
          
          set({ isLoading: false, error: null });
        } catch (error) {
          set({ error: 'Failed to assign organizations', isLoading: false });
        }
      },
    }),
    {
      name: 'assessment-storage',
      partialize: (state) => ({
        assessments: state.assessments.filter(a => a.assessmentType !== 'preset'),
        publishedAssessments: state.publishedAssessments.filter(a => a.assessmentType !== 'preset'),
      }),
    }
  )
);