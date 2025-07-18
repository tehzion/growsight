import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
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

export const useDepartmentStore = create<DepartmentState>()(
  persist(
    (set, get) => ({
      departments: [],
      isLoading: false,
      error: null,
      
      fetchDepartments: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('name');

          if (error) throw error;

          const departments: Department[] = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            organizationId: item.organization_id,
            parentDepartmentId: item.parent_department_id,
            createdById: item.created_by_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          }));

          set({ 
            departments, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: handleSupabaseError(error), 
            isLoading: false 
          });
        }
      },
      
      createDepartment: async (data) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Check for duplicate name in the same organization
          const { data: existingDepartments, error: checkError } = await supabase
            .from('departments')
            .select('id')
            .eq('organization_id', data.organizationId)
            .eq('name', data.name.trim())
            .eq('is_active', true);

          if (checkError) throw checkError;

          if (existingDepartments && existingDepartments.length > 0) {
            throw new Error('A department with this name already exists in your organization');
          }

          const { data: newDepartment, error } = await supabase
            .from('departments')
            .insert({
              name: data.name.trim(),
              description: data.description?.trim(),
              organization_id: data.organizationId,
              parent_department_id: data.parentDepartmentId,
              created_by_id: user.id,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          const department: Department = {
            id: newDepartment.id,
            name: newDepartment.name,
            description: newDepartment.description,
            organizationId: newDepartment.organization_id,
            parentDepartmentId: newDepartment.parent_department_id,
            createdById: newDepartment.created_by_id,
            createdAt: newDepartment.created_at,
            updatedAt: newDepartment.updated_at
          };

          set(state => ({
            departments: [...state.departments, department],
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: handleSupabaseError(error), 
            isLoading: false 
          });
        }
      },
      
      updateDepartment: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          // Check for duplicate name if name is being updated
          if (data.name) {
            const { departments } = get();
            const department = departments.find(dept => dept.id === id);
            
            if (!department) {
              throw new Error('Department not found');
            }

            const { data: existingDepartments, error: checkError } = await supabase
              .from('departments')
              .select('id')
              .eq('organization_id', department.organizationId)
              .eq('name', data.name.trim())
              .neq('id', id)
              .eq('is_active', true);

            if (checkError) throw checkError;

            if (existingDepartments && existingDepartments.length > 0) {
              throw new Error('A department with this name already exists in your organization');
            }
          }

          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
          };

          if (data.name) updateData.name = data.name.trim();
          if (data.description !== undefined) updateData.description = data.description?.trim();
          if (data.parentDepartmentId !== undefined) updateData.parent_department_id = data.parentDepartmentId;

          const { data: updatedDepartment, error } = await supabase
            .from('departments')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          const department: Department = {
            id: updatedDepartment.id,
            name: updatedDepartment.name,
            description: updatedDepartment.description,
            organizationId: updatedDepartment.organization_id,
            parentDepartmentId: updatedDepartment.parent_department_id,
            createdById: updatedDepartment.created_by_id,
            createdAt: updatedDepartment.created_at,
            updatedAt: updatedDepartment.updated_at
          };

          set(state => ({
            departments: state.departments.map(dept =>
              dept.id === id ? department : dept
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
      
      deleteDepartment: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // Check if department has children
          const { data: childDepartments, error: checkError } = await supabase
            .from('departments')
            .select('id')
            .eq('parent_department_id', id)
            .eq('is_active', true);

          if (checkError) throw checkError;

          if (childDepartments && childDepartments.length > 0) {
            throw new Error('Cannot delete department with sub-departments. Please delete or reassign sub-departments first.');
          }

          // Check if department has users
          const { data: departmentUsers, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('department_id', id)
            .eq('is_active', true);

          if (userCheckError) throw userCheckError;

          if (departmentUsers && departmentUsers.length > 0) {
            throw new Error('Cannot delete department with assigned users. Please reassign users first.');
          }

          const { error } = await supabase
            .from('departments')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw error;

          set(state => ({
            departments: state.departments.filter(dept => dept.id !== id),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: handleSupabaseError(error), 
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