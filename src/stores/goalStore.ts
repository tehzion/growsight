import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Goal } from '../types';

interface GoalState {
    goals: Goal[];
    isLoading: boolean;
    error: string | null;
    fetchGoals: () => Promise<void>;
    createGoal: (goal: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
    goals: [],
    isLoading: false,
    error: null,

    fetchGoals: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('user_goals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to match Goal interface (camelCase)
            const goals: Goal[] = data.map((g: any) => ({
                id: g.id,
                userId: g.user_id,
                title: g.title,
                description: g.description,
                status: g.status,
                dueDate: g.due_date,
                progress: g.progress,
                createdAt: g.created_at,
                updatedAt: g.updated_at
            }));

            set({ goals, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    createGoal: async (goalData) => {
        set({ isLoading: true, error: null });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('user_goals')
                .insert({
                    user_id: user.id,
                    title: goalData.title,
                    description: goalData.description,
                    status: goalData.status,
                    due_date: goalData.dueDate,
                    progress: goalData.progress
                })
                .select()
                .single();

            if (error) throw error;

            const newGoal: Goal = {
                id: data.id,
                userId: data.user_id,
                title: data.title,
                description: data.description,
                status: data.status,
                dueDate: data.due_date,
                progress: data.progress,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };

            set(state => ({
                goals: [newGoal, ...state.goals],
                isLoading: false
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    updateGoal: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            // Map camelCase to snake_case for DB
            const dbUpdates: any = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
            if (updates.progress !== undefined) dbUpdates.progress = updates.progress;

            const { error } = await supabase
                .from('user_goals')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;

            set(state => ({
                goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g),
                isLoading: false
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    deleteGoal: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase
                .from('user_goals')
                .delete()
                .eq('id', id);

            if (error) throw error;

            set(state => ({
                goals: state.goals.filter(g => g.id !== id),
                isLoading: false
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    }
}));
