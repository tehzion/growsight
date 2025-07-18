import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { UserRelationship, RelationshipType } from '../types';

interface RelationshipState {
  relationships: UserRelationship[];
  isLoading: boolean;
  error: string | null;
  fetchRelationships: (userId?: string) => Promise<void>;
  createRelationship: (data: {
    userId: string;
    relatedUserId: string;
    relationshipType: RelationshipType;
  }) => Promise<void>;
  updateRelationship: (id: string, data: Partial<UserRelationship>) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;
  getUserRelationships: (userId: string, type?: RelationshipType) => UserRelationship[];
}

export const useRelationshipStore = create<RelationshipState>()(
  persist(
    (set, get) => ({
      relationships: [],
      isLoading: false,
      error: null,

      fetchRelationships: async (userId?: string) => {
        set({ isLoading: true, error: null });
        try {
          let query = supabase
            .from('user_relationships')
            .select(`
              *,
              users!user_relationships_user_id_fkey(*),
              related_users:users!user_relationships_related_user_id_fkey(*)
            `)
            .eq('is_active', true);

          if (userId) {
            query = query.or(`user_id.eq.${userId},related_user_id.eq.${userId}`);
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (error) throw error;

          const relationships: UserRelationship[] = (data || []).map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            relatedUserId: item.related_user_id,
            relationshipType: item.relationship_type,
            createdById: item.created_by_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));

          set({ relationships, isLoading: false });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      createRelationship: async (data) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Check for existing relationship
          const { data: existingRelationship, error: checkError } = await supabase
            .from('user_relationships')
            .select('id')
            .or(`and(user_id.eq.${data.userId},related_user_id.eq.${data.relatedUserId}),and(user_id.eq.${data.relatedUserId},related_user_id.eq.${data.userId})`)
            .eq('is_active', true)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          if (existingRelationship) {
            throw new Error('A relationship already exists between these users');
          }

          // Validate that users exist and are in the same organization
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, organization_id')
            .in('id', [data.userId, data.relatedUserId])
            .eq('is_active', true);

          if (usersError) throw usersError;

          if (!users || users.length !== 2) {
            throw new Error('One or both users not found');
          }

          if (users[0].organization_id !== users[1].organization_id) {
            throw new Error('Users must be in the same organization');
          }

          const { data: newRelationship, error } = await supabase
            .from('user_relationships')
            .insert({
              user_id: data.userId,
              related_user_id: data.relatedUserId,
              relationship_type: data.relationshipType,
              created_by_id: user.id,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;

          const relationship: UserRelationship = {
            id: newRelationship.id,
            userId: newRelationship.user_id,
            relatedUserId: newRelationship.related_user_id,
            relationshipType: newRelationship.relationship_type,
            createdById: newRelationship.created_by_id,
            createdAt: newRelationship.created_at,
            updatedAt: newRelationship.updated_at,
          };

          set(state => ({
            relationships: [relationship, ...state.relationships],
            isLoading: false,
          }));
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      updateRelationship: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
          };

          if (data.relationshipType) updateData.relationship_type = data.relationshipType;

          const { data: updatedRelationship, error } = await supabase
            .from('user_relationships')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          const relationship: UserRelationship = {
            id: updatedRelationship.id,
            userId: updatedRelationship.user_id,
            relatedUserId: updatedRelationship.related_user_id,
            relationshipType: updatedRelationship.relationship_type,
            createdById: updatedRelationship.created_by_id,
            createdAt: updatedRelationship.created_at,
            updatedAt: updatedRelationship.updated_at,
          };

          set(state => ({
            relationships: state.relationships.map(rel =>
              rel.id === id ? relationship : rel
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      deleteRelationship: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('user_relationships')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw error;

          set(state => ({
            relationships: state.relationships.filter(rel => rel.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      getUserRelationships: (userId: string, type?: RelationshipType) => {
        const { relationships } = get();
        return relationships.filter(rel => {
          const isUserInRelationship = rel.userId === userId || rel.relatedUserId === userId;
          const matchesType = !type || rel.relationshipType === type;
          return isUserInRelationship && matchesType;
        });
      },
    }),
    {
      name: 'relationship-storage',
      partialize: (state) => ({
        relationships: state.relationships,
      }),
    }
  )
);