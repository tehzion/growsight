import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Competency } from '../types';

interface CompetencyState {
  competencies: Competency[];
  isLoading: boolean;
  error: string | null;
  fetchCompetencies: (organizationId: string) => Promise<void>;
  createCompetency: (data: Omit<Competency, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCompetency: (id: string, data: Partial<Omit<Competency, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteCompetency: (id: string) => Promise<void>;
  getCompetenciesByIds: (ids: string[]) => Competency[];
}

// Mock competencies for demo
const defaultMockCompetencies: Competency[] = [
  {
    id: 'comp-1',
    name: 'Leadership',
    description: 'Ability to lead and inspire teams',
    organizationId: 'demo-org-1',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comp-2',
    name: 'Communication',
    description: 'Effective verbal and written communication skills',
    organizationId: 'demo-org-1',
    createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comp-3',
    name: 'Problem Solving',
    description: 'Ability to analyze and solve complex problems',
    organizationId: 'demo-org-1',
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comp-4',
    name: 'Teamwork',
    description: 'Ability to collaborate effectively with others',
    organizationId: 'demo-org-1',
    createdAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comp-5',
    name: 'Technical Skills',
    description: 'Proficiency in required technical areas',
    organizationId: 'demo-org-1',
    createdAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comp-6',
    name: 'Innovation',
    description: 'Ability to generate new ideas and approaches',
    organizationId: 'demo-org-2',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comp-7',
    name: 'Customer Focus',
    description: 'Understanding and meeting customer needs',
    organizationId: 'demo-org-2',
    createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comp-8',
    name: 'Strategic Thinking',
    description: 'Ability to think and plan for the long term',
    organizationId: 'demo-org-3',
    createdAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const useCompetencyStore = create<CompetencyState>()(
  persist(
    (set, get) => ({
      competencies: [],
      isLoading: false,
      error: null,
      
      fetchCompetencies: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // For demo, filter mock competencies by organization
          const filteredCompetencies = defaultMockCompetencies.filter(
            comp => comp.organizationId === organizationId
          );
          
          set({ 
            competencies: filteredCompetencies, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: (error as Error).message || 'Failed to fetch competencies', 
            isLoading: false 
          });
        }
      },
      
      createCompetency: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check for duplicate name in the same organization
          const { competencies } = get();
          const isDuplicate = competencies.some(
            comp => comp.organizationId === data.organizationId && 
                   comp.name.toLowerCase() === data.name.toLowerCase()
          );
          
          if (isDuplicate) {
            throw new Error('A competency with this name already exists in your organization');
          }
          
          const newCompetency: Competency = {
            id: `comp-${Date.now()}`,
            name: data.name.trim(),
            description: data.description?.trim(),
            organizationId: data.organizationId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set(state => ({
            competencies: [...state.competencies, newCompetency],
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: (error as Error).message || 'Failed to create competency', 
            isLoading: false 
          });
        }
      },
      
      updateCompetency: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Check for duplicate name if name is being updated
          if (data.name) {
            const { competencies } = get();
            const competency = competencies.find(comp => comp.id === id);
            
            if (!competency) {
              throw new Error('Competency not found');
            }
            
            const isDuplicate = competencies.some(
              comp => comp.id !== id && 
                     comp.organizationId === competency.organizationId && 
                     comp.name.toLowerCase() === data.name.toLowerCase()
            );
            
            if (isDuplicate) {
              throw new Error('A competency with this name already exists in your organization');
            }
          }
          
          set(state => ({
            competencies: state.competencies.map(comp =>
              comp.id === id ? { 
                ...comp, 
                ...data,
                name: data.name ? data.name.trim() : comp.name,
                description: data.description !== undefined ? data.description?.trim() : comp.description,
                updatedAt: new Date().toISOString() 
              } : comp
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: (error as Error).message || 'Failed to update competency', 
            isLoading: false 
          });
        }
      },
      
      deleteCompetency: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => ({
            competencies: state.competencies.filter(comp => comp.id !== id),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: (error as Error).message || 'Failed to delete competency', 
            isLoading: false 
          });
        }
      },
      
      getCompetenciesByIds: (ids) => {
        const { competencies } = get();
        return competencies.filter(comp => ids.includes(comp.id));
      }
    }),
    {
      name: 'competency-storage',
      partialize: (state) => ({
        competencies: state.competencies,
      }),
    }
  )
);