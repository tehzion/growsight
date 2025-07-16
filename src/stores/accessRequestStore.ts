import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AccessRequest } from '../types';

interface AccessRequestState {
  requests: AccessRequest[];
  isLoading: boolean;
  error: string | null;
  fetchRequests: () => Promise<void>;
  createRequest: (data: Omit<AccessRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  approveRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
}

const defaultMockRequests: AccessRequest[] = [
  {
    id: 'req-1',
    email: 'new.admin@example.com',
    firstName: 'John',
    lastName: 'Doe',
    organizationName: 'New Corp',
    requestedRole: 'org_admin',
    message: 'We are a new company and would like to use your platform.',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useAccessRequestStore = create<AccessRequestState>()(
  persist(
    (set, get) => ({
      requests: [],
      isLoading: false,
      error: null,

      fetchRequests: async () => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          const { requests: persistedRequests } = get();
          const customRequests = persistedRequests.filter(req => 
            !defaultMockRequests.some(defaultReq => defaultReq.id === req.id)
          );
          const allRequests = [...defaultMockRequests, ...customRequests];
          set({ requests: allRequests, isLoading: false, error: null });
        } catch (error) {
          set({ error: 'Failed to fetch access requests', isLoading: false });
        }
      },

      createRequest: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const newRequest: AccessRequest = {
            ...data,
            id: `req-${Date.now()}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set(state => ({ 
            requests: [...state.requests, newRequest],
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to create access request', isLoading: false });
        }
      },

      approveRequest: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          set(state => ({
            requests: state.requests.map(req =>
              req.id === id ? { ...req, status: 'approved', updatedAt: new Date().toISOString() } : req
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to approve access request', isLoading: false });
        }
      },

      rejectRequest: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          set(state => ({
            requests: state.requests.map(req =>
              req.id === id ? { ...req, status: 'rejected', updatedAt: new Date().toISOString() } : req
            ),
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to reject access request', isLoading: false });
        }
      },
    }),
    {
      name: 'access-request-storage',
      partialize: (state) => ({
        requests: state.requests.filter(req => 
          !defaultMockRequests.some(defaultReq => defaultReq.id === req.id)
        ),
      }),
    }
  )
);