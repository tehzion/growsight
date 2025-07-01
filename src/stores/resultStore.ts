import { create } from 'zustand';
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

// Enhanced mock data with 1-7 scale and new terminology
const mockResults: Record<string, AssessmentResult[]> = {
  '2': [
    {
      sectionId: 'demo-section-1',
      sectionTitle: 'Communication & Interpersonal Skills',
      questions: [
        {
          id: 'demo-question-1',
          text: 'How effectively does this person communicate complex ideas to team members?',
          selfRating: 5,
          avgReviewerRating: 4,
          gap: 1,
          alignment: 'blind_spot',
          comments: [
            'Good communicator but sometimes too technical for non-technical team members',
            'Clear in written communication, could improve verbal presentation skills'
          ],
          competencies: [
            { id: 'comp-2', name: 'Communication' }
          ]
        },
        {
          id: 'demo-question-2',
          text: 'Rate their ability to provide constructive feedback',
          selfRating: 4,
          avgReviewerRating: 6,
          gap: -2,
          alignment: 'hidden_strength',
          comments: [
            'Excellent at providing balanced feedback',
            'Very thoughtful in approach to difficult conversations'
          ],
          competencies: [
            { id: 'comp-2', name: 'Communication' },
            { id: 'comp-1', name: 'Leadership' }
          ]
        }
      ],
      selfAverage: 4.5,
      reviewerAverage: 5.0,
      overallGap: -0.5,
      overallAlignment: 'aligned',
      competencyResults: [
        {
          competencyId: 'comp-2',
          competencyName: 'Communication',
          selfAverage: 4.5,
          reviewerAverage: 5.0,
          gap: -0.5,
          alignment: 'aligned'
        },
        {
          competencyId: 'comp-1',
          competencyName: 'Leadership',
          selfAverage: 4.0,
          reviewerAverage: 6.0,
          gap: -2.0,
          alignment: 'hidden_strength'
        }
      ]
    },
    {
      sectionId: 'demo-section-2',
      sectionTitle: 'Decision Making & Problem Solving',
      questions: [
        {
          id: 'demo-question-3',
          text: 'How well does this person analyze complex problems?',
          selfRating: 5,
          avgReviewerRating: 6.5,
          gap: -1.5,
          alignment: 'hidden_strength',
          comments: [
            'Exceptional analytical skills',
            'Breaks down complex issues very effectively',
            'Could be more confident in presenting solutions'
          ],
          competencies: [
            { id: 'comp-3', name: 'Problem Solving' }
          ]
        }
      ],
      selfAverage: 5.0,
      reviewerAverage: 6.5,
      overallGap: -1.5,
      overallAlignment: 'hidden_strength',
      competencyResults: [
        {
          competencyId: 'comp-3',
          competencyName: 'Problem Solving',
          selfAverage: 5.0,
          reviewerAverage: 6.5,
          gap: -1.5,
          alignment: 'hidden_strength'
        }
      ]
    }
  ],
  '4': [
    {
      sectionId: 'demo-section-1',
      sectionTitle: 'Communication & Interpersonal Skills',
      questions: [
        {
          id: 'demo-question-1',
          text: 'How effectively does this person communicate complex ideas to team members?',
          selfRating: 4,
          avgReviewerRating: 5,
          gap: -1,
          alignment: 'hidden_strength',
          comments: [
            'Strong communicator with good clarity',
            'Adapts communication style well to different audiences'
          ],
          competencies: [
            { id: 'comp-2', name: 'Communication' }
          ]
        },
        {
          id: 'demo-question-2',
          text: 'Rate their ability to provide constructive feedback',
          selfRating: 6,
          avgReviewerRating: 4,
          gap: 2,
          alignment: 'blind_spot',
          comments: [
            'Sometimes feedback could be more specific',
            'Good intentions but delivery needs work'
          ],
          competencies: [
            { id: 'comp-2', name: 'Communication' },
            { id: 'comp-1', name: 'Leadership' }
          ]
        }
      ],
      selfAverage: 5.0,
      reviewerAverage: 4.5,
      overallGap: 0.5,
      overallAlignment: 'aligned',
      competencyResults: [
        {
          competencyId: 'comp-2',
          competencyName: 'Communication',
          selfAverage: 5.0,
          reviewerAverage: 4.5,
          gap: 0.5,
          alignment: 'aligned'
        },
        {
          competencyId: 'comp-1',
          competencyName: 'Leadership',
          selfAverage: 6.0,
          reviewerAverage: 4.0,
          gap: 2.0,
          alignment: 'blind_spot'
        }
      ]
    }
  ]
};

// Mock organization results (anonymized)
const mockOrganizationResults: Record<string, AssessmentResult[]> = {
  'demo-org-1': [
    {
      sectionId: 'org-section-1',
      sectionTitle: 'Communication & Interpersonal Skills',
      questions: [
        {
          id: 'org-question-1',
          text: 'How effectively do team members communicate complex ideas?',
          selfRating: 0, // Not applicable for org level
          avgReviewerRating: 4.7,
          gap: 0, // Not applicable for org level
          alignment: 'aligned',
          comments: [] // No individual comments at org level
        },
        {
          id: 'org-question-2',
          text: 'Rate the team\'s ability to provide constructive feedback',
          selfRating: 0, // Not applicable for org level
          avgReviewerRating: 5.2,
          gap: 0, // Not applicable for org level
          alignment: 'aligned',
          comments: [] // No individual comments at org level
        }
      ],
      selfAverage: 0, // Not applicable for org level
      reviewerAverage: 4.95,
      overallGap: 0, // Not applicable for org level
      overallAlignment: 'aligned',
      competencyResults: [
        {
          competencyId: 'comp-2',
          competencyName: 'Communication',
          selfAverage: 0,
          reviewerAverage: 4.95,
          gap: 0,
          alignment: 'aligned'
        }
      ]
    },
    {
      sectionId: 'org-section-2',
      sectionTitle: 'Decision Making & Problem Solving',
      questions: [
        {
          id: 'org-question-3',
          text: 'How well do team members analyze complex problems?',
          selfRating: 0,
          avgReviewerRating: 5.3,
          gap: 0,
          alignment: 'aligned',
          comments: [],
          competencies: [
            { id: 'comp-3', name: 'Problem Solving' }
          ]
        },
        {
          id: 'org-question-4',
          text: 'Rate the team\'s ability to make decisions under pressure',
          selfRating: 0,
          avgReviewerRating: 4.8,
          gap: 0,
          alignment: 'aligned',
          comments: [],
          competencies: [
            { id: 'comp-3', name: 'Problem Solving' }
          ]
        }
      ],
      selfAverage: 0,
      reviewerAverage: 5.05,
      overallGap: 0,
      overallAlignment: 'aligned',
      competencyResults: [
        {
          competencyId: 'comp-3',
          competencyName: 'Problem Solving',
          selfAverage: 0,
          reviewerAverage: 5.05,
          gap: 0,
          alignment: 'aligned'
        }
      ]
    }
  ],
  'demo-org-2': [
    {
      sectionId: 'org-section-1',
      sectionTitle: 'Communication & Interpersonal Skills',
      questions: [
        {
          id: 'org-question-1',
          text: 'How effectively do team members communicate complex ideas?',
          selfRating: 0,
          avgReviewerRating: 5.1,
          gap: 0,
          alignment: 'aligned',
          comments: [],
          competencies: [
            { id: 'comp-2', name: 'Communication' }
          ]
        }
      ],
      selfAverage: 0,
      reviewerAverage: 5.1,
      overallGap: 0,
      overallAlignment: 'aligned',
      competencyResults: [
        {
          competencyId: 'comp-2',
          competencyName: 'Communication',
          selfAverage: 0,
          reviewerAverage: 5.1,
          gap: 0,
          alignment: 'aligned'
        }
      ]
    }
  ]
};

export const useResultStore = create<ResultState>((set, get) => ({
  results: {},
  isLoading: false,
  error: null,
  
  fetchResults: async (employeeId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Enhanced demo with more realistic loading time
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const employeeResults = mockResults[employeeId] || [];
      
      set(state => ({ 
        results: { 
          ...state.results, 
          [employeeId]: employeeResults 
        }, 
        isLoading: false 
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  fetchOrganizationResults: async (organizationId: string, anonymized: boolean = true) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Always return anonymized data for org admins
      const orgResults = mockOrganizationResults[organizationId] || [];
      
      set({ isLoading: false });
      return orgResults;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },
  
  fetchSystemResults: async (anonymized: boolean = false) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let systemResults: Record<string, AssessmentResult[]> = {};
      
      if (anonymized) {
        // Return organization-level aggregated data
        Object.entries(mockOrganizationResults).forEach(([orgId, results]) => {
          systemResults[orgId] = results;
        });
      } else {
        // Return all results (for super admin only)
        systemResults = { ...mockResults };
      }
      
      set({ isLoading: false });
      return systemResults;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return {};
    }
  },
  
  exportResults: async (format: 'csv' | 'pdf', userId?: string, anonymized: boolean = false) => {
    set({ isLoading: true, error: null });
    try {
      // Enhanced demo with realistic export simulation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock response - in a real implementation this would return a URL
      const timestamp = new Date().toISOString().split('T')[0];
      const userSuffix = userId ? `-user-${userId.slice(-4)}` : '-organization';
      const anonymizedSuffix = anonymized ? '-anonymized' : '';
      const downloadUrl = `https://demo-exports.example.com/assessment-results${userSuffix}${anonymizedSuffix}-${timestamp}.${format}`;
      
      set({ isLoading: false });
      return downloadUrl;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return '';
    }
  }
}));