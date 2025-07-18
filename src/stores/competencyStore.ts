import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
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

export const useCompetencyStore = create<CompetencyState>()(
  persist(
    (set, get) => ({
      competencies: [],
      isLoading: false,
      error: null,
      
      fetchCompetencies: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('competencies')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('name');

          if (error) throw error;

          const competencies: Competency[] = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            organizationId: item.organization_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          }));

          set({ 
            competencies, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: handleSupabaseError(error), 
            isLoading: false 
          });
        }
      },
      
      createCompetency: async (data) => {
        set({ isLoading: true, error: null });
        try {
          // Check for duplicate name in the same organization
          const { data: existingCompetencies, error: checkError } = await supabase
            .from('competencies')
            .select('id')
            .eq('organization_id', data.organizationId)
            .eq('name', data.name.trim())
            .eq('is_active', true);

          if (checkError) throw checkError;

          if (existingCompetencies && existingCompetencies.length > 0) {
            throw new Error('A competency with this name already exists in your organization');
          }

          const { data: newCompetency, error } = await supabase
            .from('competencies')
            .insert({
              name: data.name.trim(),
              description: data.description?.trim(),
              organization_id: data.organizationId,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          const competency: Competency = {
            id: newCompetency.id,
            name: newCompetency.name,
            description: newCompetency.description,
            organizationId: newCompetency.organization_id,
            createdAt: newCompetency.created_at,
            updatedAt: newCompetency.updated_at
          };

          set(state => ({
            competencies: [...state.competencies, competency],
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: handleSupabaseError(error), 
            isLoading: false 
          });
        }
      },
      
      updateCompetency: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          // Check for duplicate name if name is being updated
          if (data.name) {
            const { competencies } = get();
            const competency = competencies.find(comp => comp.id === id);
            
            if (!competency) {
              throw new Error('Competency not found');
            }

            const { data: existingCompetencies, error: checkError } = await supabase
              .from('competencies')
              .select('id')
              .eq('organization_id', competency.organizationId)
              .eq('name', data.name.trim())
              .neq('id', id)
              .eq('is_active', true);

            if (checkError) throw checkError;

            if (existingCompetencies && existingCompetencies.length > 0) {
              throw new Error('A competency with this name already exists in your organization');
            }
          }

          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
          };

          if (data.name) updateData.name = data.name.trim();
          if (data.description !== undefined) updateData.description = data.description?.trim();

          const { data: updatedCompetency, error } = await supabase
            .from('competencies')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          const competency: Competency = {
            id: updatedCompetency.id,
            name: updatedCompetency.name,
            description: updatedCompetency.description,
            organizationId: updatedCompetency.organization_id,
            createdAt: updatedCompetency.created_at,
            updatedAt: updatedCompetency.updated_at
          };

          set(state => ({
            competencies: state.competencies.map(comp =>
              comp.id === id ? competency : comp
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: handleSupabaseError(error), 
            isLoading: false 
          });
        }
      },
      
      deleteCompetency: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('competencies')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw error;

          set(state => ({
            competencies: state.competencies.filter(comp => comp.id !== id),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: handleSupabaseError(error), 
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