/**
 * Enhanced Team Management Component
 * Provides comprehensive team creation, management, and analytics
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Target, 
  TrendingUp, 
  UserPlus, 
  Settings,
  BarChart3,
  Calendar,
  Award,
  MessageSquare,
  Filter,
  Search,
  Download,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import EnhancedRBAC from '../../lib/rbac/enhancedPermissions';

interface Team {
  id: string;
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
  departmentId?: string;
  goals: TeamGoal[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'archived';
  metrics: TeamMetrics;
}

interface TeamGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  dueDate: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  assignedTo: string[];
}

interface TeamMetrics {
  assessmentCompletion: number;
  averageScore: number;
  goalCompletion: number;
  memberSatisfaction: number;
  collaborationScore: number;
}

interface TeamFilter {
  status: 'all' | 'active' | 'inactive' | 'archived';
  department: string;
  search: string;
  lead: string;
}

export const TeamManagement: React.FC = () => {
  const { user } = useAuthStore();
  const { users } = useUserStore();
  const rbac = EnhancedRBAC.getInstance();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'goals' | 'analytics'>('overview');
  const [filters, setFilters] = useState<TeamFilter>({
    status: 'all',
    department: '',
    search: '',
    lead: ''
  });

  // Check permissions
  const canManageTeams = rbac.hasPermission(user, 'teams.manage');
  const canCreateTeams = rbac.hasPermission(user, 'teams.create');
  const canAssignMembers = rbac.hasPermission(user, 'teams.assign');
  const canManageGoals = rbac.hasPermission(user, 'teams.goals');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      // Load teams from Supabase
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (user_id),
          team_goals (*),
          departments (name)
        `)
        .eq('organization_id', user?.organizationId)
        .eq('is_active', true);

      if (error) throw error;

      const transformedTeams: Team[] = teamsData.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        leadId: team.lead_id,
        memberIds: team.team_members?.map((tm: any) => tm.user_id) || [],
        departmentId: team.department_id,
        goals: team.team_goals?.map((goal: any) => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          targetValue: goal.target_value,
          currentValue: goal.current_value,
          unit: goal.unit,
          dueDate: new Date(goal.due_date),
          status: goal.status,
          assignedTo: goal.assigned_to || []
        })) || [],
        createdAt: new Date(team.created_at),
        updatedAt: new Date(team.updated_at),
        status: team.status,
        metrics: {
          assessmentCompletion: team.assessment_completion || 0,
          averageScore: team.average_score || 0,
          goalCompletion: team.goal_completion || 0,
          memberSatisfaction: team.member_satisfaction || 0,
          collaborationScore: team.collaboration_score || 0
        }
      }));

      setTeams(transformedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setTeams([]);
    }
  };

  const filteredTeams = teams.filter(team => {
    if (filters.status !== 'all' && team.status !== filters.status) return false;
    if (filters.department && team.departmentId !== filters.department) return false;
    if (filters.lead && team.leadId !== filters.lead) return false;
    if (filters.search && !team.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getTeamLead = (leadId: string) => {
    return users.find(u => u.id === leadId);
  };

  const getTeamMembers = (memberIds: string[]) => {
    return users.filter(u => memberIds.includes(u.id));
  };

  const TeamCard: React.FC<{ team: Team }> = ({ team }) => (
    <div className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTeam(team)}>
      <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{team.name}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{team.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              team.status === 'active' ? 'bg-green-100 text-green-800' :
              team.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {team.status}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Team Lead */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm">
              Lead: {getTeamLead(team.leadId)?.firstName} {getTeamLead(team.leadId)?.lastName}
            </span>
          </div>

          {/* Members Count */}
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{team.memberIds.length} members</span>
          </div>

          {/* Goals Progress */}
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{team.goals.length} active goals</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${team.metrics.goalCompletion}%` }}
              />
            </div>
            <span className="text-sm font-medium">{team.metrics.goalCompletion}%</span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{team.metrics.assessmentCompletion}%</div>
              <div className="text-xs text-gray-500">Assessments</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{team.metrics.averageScore}</div>
              <div className="text-xs text-gray-500">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{team.metrics.collaborationScore}</div>
              <div className="text-xs text-gray-500">Collaboration</div>
            </div>
          </div>
        </div>
      </CardContent>
      </Card>
    </div>
  );

  const TeamDetailView: React.FC<{ team: Team }> = ({ team }) => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{team.name}</h2>
          <p className="text-gray-600 mt-1">{team.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageTeams && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Team
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setSelectedTeam(null)}>
            Back to Teams
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'members', name: 'Members', icon: Users },
            { id: 'goals', name: 'Goals', icon: Target },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Metrics Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Assessment Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{team.metrics.assessmentCompletion}%</div>
                <div className="flex items-center mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${team.metrics.assessmentCompletion}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{team.metrics.averageScore}/5</div>
                <div className="flex items-center mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Award
                      key={star}
                      className={`h-4 w-4 ${
                        star <= team.metrics.averageScore ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Goal Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{team.metrics.goalCompletion}%</div>
                <div className="text-sm text-gray-500 mt-1">
                  {team.goals.filter(g => g.status === 'completed').length} of {team.goals.length} completed
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Team Members ({team.memberIds.length})</h3>
              {canAssignMembers && (
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getTeamMembers(team.memberIds).map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {member.firstName[0]}{member.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{member.firstName} {member.lastName}</div>
                        <div className="text-sm text-gray-500">{member.role}</div>
                        {member.id === team.leadId && (
                          <div className="text-xs text-blue-600 font-medium">Team Lead</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Team Goals</h3>
              {canManageGoals && (
                <Button variant="outline" size="sm" onClick={() => setShowGoalForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {team.goals.map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{goal.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{goal.description}</div>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Progress:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-32">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(goal.currentValue / goal.targetValue) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {goal.currentValue}/{goal.targetValue} {goal.unit}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Due: {goal.dueDate.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                        goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        goal.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Performance chart would go here
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Collaboration Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Member Satisfaction</span>
                    <span className="font-medium">{team.metrics.memberSatisfaction}/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Collaboration Score</span>
                    <span className="font-medium">{team.metrics.collaborationScore}/100</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  if (!canManageTeams && !rbac.hasPermission(user, 'teams.view')) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">You don't have permission to view team management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedTeam ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600">Manage teams, members, and goals</p>
            </div>
            {canCreateTeams && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">All Teams</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search teams..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>

          {filteredTeams.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
              <p className="text-gray-500">
                {filters.search || filters.status !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first team to get started'
                }
              </p>
            </div>
          )}
        </>
      ) : (
        <TeamDetailView team={selectedTeam} />
      )}
    </div>
  );
};

export default TeamManagement;