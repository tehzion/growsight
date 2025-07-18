import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import SecureLogger from '../lib/secureLogger';

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  organizationId: string;
  createdBy: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagData {
  name: string;
  description?: string;
  color: string;
  organizationId: string;
}

export interface UpdateTagData {
  name?: string;
  description?: string;
  color?: string;
}

interface TagState {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  
  fetchTags: (organizationId: string) => Promise<void>;
  createTag: (data: CreateTagData, createdBy: string) => Promise<void>;
  updateTag: (id: string, data: UpdateTagData) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  getTagsByAssessment: (assessmentId: string) => Promise<Tag[]>;
  assignTagToAssessment: (tagId: string, assessmentId: string) => Promise<void>;
  removeTagFromAssessment: (tagId: string, assessmentId: string) => Promise<void>;
  clearError: () => void;
}

export const useTagStore = create<TagState>()(
  persist(
    (set, get) => ({
      tags: [],
      isLoading: false,
      error: null,

      fetchTags: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data: tags, error } = await supabase
            .from('tags')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('name', { ascending: true });

          if (error) throw error;

          // Get usage counts for each tag
          const tagsWithUsage = await Promise.all(
            (tags || []).map(async (tag: any) => {
              const { count: usageCount, error: countError } = await supabase
                .from('assessment_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', tag.id)
                .eq('is_active', true);

              if (countError) {
                SecureLogger.warn(`Failed to get usage count for tag ${tag.id}`, countError);
              }

              return {
                ...tag,
                usageCount: usageCount || 0
              };
            })
          );

          set({ tags: tagsWithUsage, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch tags:', error);
          set({ 
            error: (error as Error).message || 'Failed to fetch tags', 
            isLoading: false 
          });
        }
      },

      createTag: async (data: CreateTagData, createdBy: string) => {
        set({ isLoading: true, error: null });
        try {
          // Check if tag name already exists in organization
          const { data: existingTag, error: checkError } = await supabase
            .from('tags')
            .select('id')
            .eq('organization_id', data.organizationId)
            .eq('name', data.name.trim())
            .eq('is_active', true)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          if (existingTag) {
            throw new Error('A tag with this name already exists in your organization');
          }

          const { data: tag, error } = await supabase
            .from('tags')
            .insert({
              name: data.name.trim(),
              description: data.description?.trim(),
              color: data.color,
              organization_id: data.organizationId,
              created_by: createdBy,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          const newTag: Tag = {
            ...tag,
            usageCount: 0
          };

          set(state => ({
            tags: [...state.tags, newTag],
            isLoading: false
          }));

          SecureLogger.info(`Tag created: ${newTag.name} - ID: ${newTag.id}, Organization: ${newTag.organizationId}, Created by: ${createdBy}`);
        } catch (error) {
          console.error('Failed to create tag:', error);
          set({ 
            error: (error as Error).message || 'Failed to create tag',
            isLoading: false 
          });
        }
      },

      updateTag: async (id: string, data: UpdateTagData) => {
        set({ isLoading: true, error: null });
        try {
          const { data: tag, error } = await supabase
            .from('tags')
            .update({
              ...(data.name && { name: data.name.trim() }),
              ...(data.description !== undefined && { description: data.description?.trim() }),
              ...(data.color && { color: data.color }),
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          // Update local state
          set(state => ({
            tags: state.tags.map(t => 
              t.id === id 
                ? { ...t, ...tag }
                : t
            ),
            isLoading: false
          }));

          SecureLogger.info(`Tag updated: ${tag.name} - ID: ${id}, Organization: ${tag.organization_id}`);
        } catch (error) {
          console.error('Failed to update tag:', error);
          set({ 
            error: (error as Error).message || 'Failed to update tag',
            isLoading: false 
          });
        }
      },

      deleteTag: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // Check if tag is being used
          const { count: usageCount, error: countError } = await supabase
            .from('assessment_tags')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', id)
            .eq('is_active', true);

          if (countError) throw countError;

          if (usageCount && usageCount > 0) {
            throw new Error(`Cannot delete tag: it is being used by ${usageCount} assessment(s)`);
          }

          // Soft delete the tag
          const { error } = await supabase
            .from('tags')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw error;

          // Remove from local state
          set(state => ({
            tags: state.tags.filter(t => t.id !== id),
            isLoading: false
          }));

          SecureLogger.info(`Tag deleted: ${id}`);
        } catch (error) {
          console.error('Failed to delete tag:', error);
          set({ 
            error: (error as Error).message || 'Failed to delete tag',
            isLoading: false 
          });
        }
      },

      getTagsByAssessment: async (assessmentId: string): Promise<Tag[]> => {
        try {
          const { data: assessmentTags, error } = await supabase
            .from('assessment_tags')
            .select(`
              tag_id,
              tags (*)
            `)
            .eq('assessment_id', assessmentId)
            .eq('is_active', true);

          if (error) throw error;

          return (assessmentTags || []).map((at: any) => at.tags).filter(Boolean);
        } catch (error) {
          console.error('Failed to get tags by assessment:', error);
          return [];
        }
      },

      assignTagToAssessment: async (tagId: string, assessmentId: string) => {
        try {
          // Check if assignment already exists
          const { data: existingAssignment, error: checkError } = await supabase
            .from('assessment_tags')
            .select('id')
            .eq('tag_id', tagId)
            .eq('assessment_id', assessmentId)
            .eq('is_active', true)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          if (existingAssignment) {
            throw new Error('Tag is already assigned to this assessment');
          }

          const { error } = await supabase
            .from('assessment_tags')
            .insert({
              tag_id: tagId,
              assessment_id: assessmentId,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (error) throw error;

          // Update usage count in local state
          set(state => ({
            tags: state.tags.map(tag => 
              tag.id === tagId 
                ? { ...tag, usageCount: tag.usageCount + 1 }
                : tag
            )
          }));

          SecureLogger.info(`Tag assigned to assessment - Tag ID: ${tagId}, Assessment ID: ${assessmentId}`);
        } catch (error) {
          console.error('Failed to assign tag to assessment:', error);
          throw error;
        }
      },

      removeTagFromAssessment: async (tagId: string, assessmentId: string) => {
        try {
          const { error } = await supabase
            .from('assessment_tags')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('tag_id', tagId)
            .eq('assessment_id', assessmentId);

          if (error) throw error;

          // Update usage count in local state
          set(state => ({
            tags: state.tags.map(tag => 
              tag.id === tagId 
                ? { ...tag, usageCount: Math.max(0, tag.usageCount - 1) }
                : tag
            )
          }));

          SecureLogger.info(`Tag removed from assessment - Tag ID: ${tagId}, Assessment ID: ${assessmentId}`);
        } catch (error) {
          console.error('Failed to remove tag from assessment:', error);
          throw error;
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'tag-storage',
      partialize: (state) => ({
        tags: state.tags
      })
    }
  )
); 