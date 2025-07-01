import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Department } from '../types';

interface DepartmentState {
  departments: Department[];
  isLoading: boolean;
  error: string | null;
  fetchDepartments: (organizationId: string) => Promise<void>;
  createDepartment: (data: Omit<Department, 'id' | 'createdById' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDepartment: (id: string, data: Partial<Omit<Department, 'id' | 'organizationId' | 'createdById' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
}

// Mock departments for demo
const defaultMockDepartments: Department[] = [
  {
    id: 'dept-1',
    name: 'Executive',
    description: 'Executive leadership team',
    organizationId: 'demo-org-1',
    createdById: '1',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'dept-2',
    name: 'Human Resources',
    description: 'HR department',
    organizationId: 'demo-org-1',
    createdById: '1',
    createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'dept-3',
    name: 'Engineering',
    description: 'Software engineering department',
    organizationId: 'demo-org-1',
    createdById: '1',
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'dept-4',
    name: 'Frontend Team',
    description: 'Frontend development team',
    organizationId: 'demo-org-1',
    parentDepartmentId: 'dept-3',
    createdById: '1',
    createdAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'dept-5',
    name: 'Backend Team',
    description: 'Backend development team',
    organizationId: 'demo-org-1',
    parentDepartmentId: 'dept-3',
    createdById: '1',
    createdAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'dept-6',
    name: 'Marketing',
    description: 'Marketing department',
    organizationId: 'demo-org-1',
    createdById: '1',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const useDepartmentStore = create<DepartmentState>()(
  persist(
    (set, get) => ({
      departments: [],
      isLoading: false,
      error: null,
      
      fetchDepartments: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // For demo, filter mock departments by organization
          const filteredDepartments = defaultMockDepartments.filter(
            dept => dept.organizationId === organizationId
          );
          
          set({ 
            departments: filteredDepartments, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: (error as Error).message || 'Failed to fetch departments', 
            isLoading: false 
          });
        }
      },
      
      createDepartment: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const newDepartment: Department = {
            id: `dept-${Date.now()}`,
            name: data.name,
            description: data.description,
            organizationId: data.organizationId,
            parentDepartmentId: data.parentDepartmentId,
            createdById: 'current-user-id', // Would be actual user ID
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set(state => ({
            departments: [...state.departments, newDepartment],
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: (error as Error).message || 'Failed to create department', 
            isLoading: false 
          });
        }
      },
      
      updateDepartment: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => ({
            departments: state.departments.map(dept =>
              dept.id === id ? { 
                ...dept, 
                ...data,
                updatedAt: new Date().toISOString() 
              } : dept
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: (error as Error).message || 'Failed to update department', 
            isLoading: false 
          });
        }
      },
      
      deleteDepartment: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Check if department has children
          const { departments } = get();
          const hasChildren = departments.some(dept => dept.parentDepartmentId === id);
          
          if (hasChildren) {
            throw new Error('Cannot delete department with sub-departments. Please delete or reassign sub-departments first.');
          }
          
          set(state => ({
            departments: state.departments.filter(dept => dept.id !== id),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: (error as Error).message || 'Failed to delete department', 
            isLoading: false 
          });
        }
      }
    }),
    {
      name: 'department-storage',
      partialize: (state) => ({
        departments: state.departments,
      }),
    }
  )
);