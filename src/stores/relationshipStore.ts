import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

// Mock relationships for demo
const defaultMockRelationships: UserRelationship[] = [
  {
    id: 'rel-1',
    userId: '3', // John Doe
    relatedUserId: '4', // Jane Smith
    relationshipType: 'peer',
    createdById: '2', // Org Admin
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rel-2',
    userId: '3', // John Doe
    relatedUserId: '2', // Michael Chen (Org Admin as supervisor)
    relationshipType: 'supervisor',
    createdById: '2',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rel-3',
    userId: '5', // Mike Wilson
    relatedUserId: '3', // John Doe
    relationshipType: 'team_member',
    createdById: '2',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rel-4',
    userId: '5', // Mike Wilson
    relatedUserId: '6', // Lisa Brown
    relationshipType: 'peer',
    createdById: '2',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export const useRelationshipStore = create<RelationshipState>()(
  persist(
    (set, get) => ({
      relationships: [],
      isLoading: false,
      error: null,

      fetchRelationships: async (userId?: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const { relationships: currentRelationships } = get();
          const allRelationships = currentRelationships.length > 0 ? currentRelationships : defaultMockRelationships;
          
          const filteredRelationships = userId 
            ? allRelationships.filter(r => r.userId === userId || r.relatedUserId === userId)
            : allRelationships;
          
          set({ relationships: filteredRelationships, isLoading: false });
        } catch {
          set({ error: 'Failed to fetch relationships', isLoading: false });
        }
      },

      createRelationship: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const newRelationship: UserRelationship = {
            id: `rel-${Date.now()}`,
            ...data,
            createdById: 'current-user-id', // Would be actual user ID
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set(state => ({
            relationships: [...state.relationships, newRelationship],
            isLoading: false,
          }));
        } catch {
          set({ error: 'Failed to create relationship', isLoading: false });
        }
      },

      updateRelationship: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => ({
            relationships: state.relationships.map(rel =>
              rel.id === id ? { ...rel, ...data, updatedAt: new Date().toISOString() } : rel
            ),
            isLoading: false,
          }));
        } catch {
          set({ error: 'Failed to update relationship', isLoading: false });
        }
      },

      deleteRelationship: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => ({
            relationships: state.relationships.filter(rel => rel.id !== id),
            isLoading: false,
          }));
        } catch {
          set({ error: 'Failed to delete relationship', isLoading: false });
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