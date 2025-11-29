import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

export interface Team {
    id: string;
    name: string;
    description?: string;
    organizationId: string;
    teamLeadId?: string;
    teamLead?: {
        id: string;
        fullName: string;
        email: string;
    };
    memberCount?: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    isActive: boolean;
}

export interface TeamMember {
    id: string;
    teamId: string;
    userId: string;
    role: 'member' | 'lead';
    joinedAt: string;
    user?: {
        id: string;
        fullName: string;
        email: string;
        role: string;
    };
}

export interface TeamGoal {
    id: string;
    teamId: string;
    title: string;
    description?: string;
    targetValue: number;
    currentValue: number;
    metric: string;
    deadline?: string;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

interface TeamStore {
    teams: Team[];
    teamMembers: Map<string, TeamMember[]>;
    teamGoals: Map<string, TeamGoal[]>;
    isLoading: boolean;
    error: string | null;

    // Team CRUD
    fetchTeams: (organizationId?: string) => Promise<void>;
    createTeam: (data: Partial<Team>) => Promise<Team | null>;
    updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
    deleteTeam: (id: string) => Promise<void>;

    // Team Members
    fetchTeamMembers: (teamId: string) => Promise<void>;
    addTeamMember: (teamId: string, userId: string, role?: 'member' | 'lead') => Promise<void>;
    removeTeamMember: (teamId: string, userId: string) => Promise<void>;
    updateTeamMemberRole: (teamId: string, userId: string, role: 'member' | 'lead') => Promise<void>;

    // Team Goals
    fetchTeamGoals: (teamId: string) => Promise<void>;
    createTeamGoal: (data: Partial<TeamGoal>) => Promise<void>;
    updateTeamGoal: (id: string, data: Partial<TeamGoal>) => Promise<void>;
    deleteTeamGoal: (id: string) => Promise<void>;

    // Utility
    clearError: () => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
    teams: [],
    teamMembers: new Map(),
    teamGoals: new Map(),
    isLoading: false,
    error: null,

    fetchTeams: async (organizationId?: string) => {
        set({ isLoading: true, error: null });
        try {
            const { user } = useAuthStore.getState();

            let query = supabase
                .from('teams')
                .select(`
          *,
          teamLead:users!teams_team_lead_id_fkey(id, full_name, email)
        `)
                .eq('is_active', true)
                .order('name');

            // Filter by organization for org admins
            if (organizationId) {
                query = query.eq('organization_id', organizationId);
            } else if (user?.organizationId && user?.role === 'org_admin') {
                query = query.eq('organization_id', user.organizationId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Get member counts
            const teamsWithCounts = await Promise.all(
                (data || []).map(async (team) => {
                    const { count } = await supabase
                        .from('team_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('team_id', team.id);

                    return {
                        ...team,
                        memberCount: count || 0,
                        teamLead: team.teamLead
                    };
                })
            );

            set({ teams: teamsWithCounts, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error fetching teams:', error);
        }
    },

    createTeam: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const { user } = useAuthStore.getState();

            if (!user) throw new Error('User not authenticated');

            const teamData = {
                name: data.name,
                description: data.description,
                organization_id: data.organizationId || user.organizationId,
                team_lead_id: data.teamLeadId,
                created_by: user.id,
                is_active: true
            };

            const { data: team, error } = await supabase
                .from('teams')
                .insert([teamData])
                .select()
                .single();

            if (error) throw error;

            // Add team lead as member if specified
            if (data.teamLeadId) {
                await supabase
                    .from('team_members')
                    .insert([{
                        team_id: team.id,
                        user_id: data.teamLeadId,
                        role: 'lead'
                    }]);
            }

            await get().fetchTeams(teamData.organization_id);
            set({ isLoading: false });
            return team;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error creating team:', error);
            return null;
        }
    },

    updateTeam: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const updateData: any = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.teamLeadId !== undefined) updateData.team_lead_id = data.teamLeadId;
            if (data.isActive !== undefined) updateData.is_active = data.isActive;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('teams')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Update team lead membership if changed
            if (data.teamLeadId !== undefined) {
                // Remove old lead role
                await supabase
                    .from('team_members')
                    .update({ role: 'member' })
                    .eq('team_id', id)
                    .eq('role', 'lead');

                // Check if new lead is already a member
                const { data: existingMember } = await supabase
                    .from('team_members')
                    .select('id')
                    .eq('team_id', id)
                    .eq('user_id', data.teamLeadId)
                    .single();

                if (existingMember) {
                    // Update existing member to lead
                    await supabase
                        .from('team_members')
                        .update({ role: 'lead' })
                        .eq('id', existingMember.id);
                } else {
                    // Add new lead as member
                    await supabase
                        .from('team_members')
                        .insert([{
                            team_id: id,
                            user_id: data.teamLeadId,
                            role: 'lead'
                        }]);
                }
            }

            await get().fetchTeams();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error updating team:', error);
        }
    },

    deleteTeam: async (id) => {
        set({ isLoading: true, error: null });
        try {
            // Soft delete - set is_active to false
            const { error } = await supabase
                .from('teams')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;

            await get().fetchTeams();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error deleting team:', error);
        }
    },

    fetchTeamMembers: async (teamId) => {
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select(`
          *,
          user:users(id, full_name, email, role)
        `)
                .eq('team_id', teamId)
                .order('role', { ascending: false });

            if (error) throw error;

            const members = data.map(member => ({
                ...member,
                user: member.user
            }));

            set(state => ({
                teamMembers: new Map(state.teamMembers).set(teamId, members)
            }));
        } catch (error: any) {
            console.error('Error fetching team members:', error);
            set({ error: error.message });
        }
    },

    addTeamMember: async (teamId, userId, role = 'member') => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase
                .from('team_members')
                .insert([{
                    team_id: teamId,
                    user_id: userId,
                    role
                }]);

            if (error) throw error;

            await get().fetchTeamMembers(teamId);
            await get().fetchTeams();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error adding team member:', error);
        }
    },

    removeTeamMember: async (teamId, userId) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('team_id', teamId)
                .eq('user_id', userId);

            if (error) throw error;

            await get().fetchTeamMembers(teamId);
            await get().fetchTeams();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error removing team member:', error);
        }
    },

    updateTeamMemberRole: async (teamId, userId, role) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase
                .from('team_members')
                .update({ role })
                .eq('team_id', teamId)
                .eq('user_id', userId);

            if (error) throw error;

            await get().fetchTeamMembers(teamId);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error updating team member role:', error);
        }
    },

    fetchTeamGoals: async (teamId) => {
        try {
            const { data, error } = await supabase
                .from('team_goals')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            set(state => ({
                teamGoals: new Map(state.teamGoals).set(teamId, data || [])
            }));
        } catch (error: any) {
            console.error('Error fetching team goals:', error);
            set({ error: error.message });
        }
    },

    createTeamGoal: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase
                .from('team_goals')
                .insert([{
                    team_id: data.teamId,
                    title: data.title,
                    description: data.description,
                    target_value: data.targetValue,
                    current_value: data.currentValue || 0,
                    metric: data.metric,
                    deadline: data.deadline,
                    status: 'active'
                }]);

            if (error) throw error;

            if (data.teamId) {
                await get().fetchTeamGoals(data.teamId);
            }
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error creating team goal:', error);
        }
    },

    updateTeamGoal: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const updateData: any = {};
            if (data.title !== undefined) updateData.title = data.title;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.targetValue !== undefined) updateData.target_value = data.targetValue;
            if (data.currentValue !== undefined) updateData.current_value = data.currentValue;
            if (data.metric !== undefined) updateData.metric = data.metric;
            if (data.deadline !== undefined) updateData.deadline = data.deadline;
            if (data.status !== undefined) updateData.status = data.status;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('team_goals')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error updating team goal:', error);
        }
    },

    deleteTeamGoal: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase
                .from('team_goals')
                .delete()
                .eq('id', id);

            if (error) throw error;

            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            console.error('Error deleting team goal:', error);
        }
    },

    clearError: () => set({ error: null })
}));
