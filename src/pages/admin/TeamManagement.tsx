import React, { useEffect, useState } from 'react';
import {
    Users,
    Plus,
    Edit,
    Trash2,
    Search,
    UserPlus,
    Target,
    Shield,
    AlertCircle
} from 'lucide-react';
import { useTeamStore } from '../../stores/teamStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import TeamForm from '../../components/teams/TeamForm';
import TeamMemberManager from '../../components/teams/TeamMemberManager';
import TeamGoalManager from '../../components/teams/TeamGoalManager';

const TeamManagement: React.FC = () => {
    const { user } = useAuthStore();
    const { teams, isLoading, error, fetchTeams, deleteTeam, clearError } = useTeamStore();
    const { users, fetchUsers } = useUserStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [editingTeam, setEditingTeam] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'goals'>('members');

    const isOrgAdmin = user?.role === 'org_admin';
    const isSuperAdmin = user?.role === 'super_admin';

    useEffect(() => {
        if (user?.organizationId || isSuperAdmin) {
            fetchTeams(user?.organizationId);
            fetchUsers(user?.organizationId);
        }
    }, [user?.organizationId, isSuperAdmin]);

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateTeam = () => {
        setEditingTeam(null);
        setShowCreateModal(true);
    };

    const handleEditTeam = (team: any) => {
        setEditingTeam(team);
        setShowCreateModal(true);
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
            await deleteTeam(teamId);
        }
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingTeam(null);
    };

    const handleViewTeam = (teamId: string) => {
        setSelectedTeam(teamId);
        setActiveTab('members');
    };

    if (!isOrgAdmin && !isSuperAdmin) {
        return (
            <div className="space-y-6">
                <Card className="bg-error-50 border-error-200">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto text-error-600 mb-4" />
                        <h3 className="text-lg font-medium text-error-800 mb-2">Access Denied</h3>
                        <p className="text-error-700">
                            Only Organization Administrators can access team management.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 pb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Users className="h-6 w-6 mr-2 text-primary-600" />
                            Team Management
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Create and manage teams within your organization
                        </p>
                    </div>
                    <Button
                        onClick={handleCreateTeam}
                        leftIcon={<Plus className="h-4 w-4" />}
                    >
                        Create Team
                    </Button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <Card className="bg-error-50 border-error-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <AlertCircle className="h-5 w-5 text-error-600" />
                                <div>
                                    <h3 className="font-medium text-error-800">Error</h3>
                                    <p className="text-sm text-error-700">{error}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearError}
                            >
                                Dismiss
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
            </div>

            {/* Teams Grid */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading teams...</p>
                    </div>
                </div>
            ) : filteredTeams.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? 'No teams found' : 'No teams yet'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {searchTerm
                                ? 'Try adjusting your search criteria'
                                : 'Get started by creating your first team'
                            }
                        </p>
                        {!searchTerm && (
                            <Button onClick={handleCreateTeam} leftIcon={<Plus className="h-4 w-4" />}>
                                Create Your First Team
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map((team) => (
                        <Card key={team.id} className="hover:shadow-card-hover transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                            {team.name}
                                        </h3>
                                        {team.description && (
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {team.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{team.memberCount || 0} members</span>
                                    </div>

                                    {team.teamLead && (
                                        <div className="flex items-center text-sm text-gray-700">
                                            <Shield className="h-4 w-4 mr-2 text-gray-400" />
                                            <span className="truncate">
                                                {team.teamLead.full_name || team.teamLead.email}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewTeam(team.id)}
                                        className="flex-1"
                                    >
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditTeam(team)}
                                        leftIcon={<Edit className="h-4 w-4" />}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteTeam(team.id)}
                                        leftIcon={<Trash2 className="h-4 w-4" />}
                                        className="text-error-600 hover:bg-error-50"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Team Modal */}
            {showCreateModal && (
                <TeamForm
                    team={editingTeam}
                    onClose={handleCloseModal}
                    users={users}
                />
            )}

            {/* Team Details Panel */}
            {selectedTeam && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {teams.find(t => t.id === selectedTeam)?.name}
                                </h2>
                                <button
                                    onClick={() => setSelectedTeam(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <span className="sr-only">Close</span>
                                    ×
                                </button>
                            </div>

                            <div className="flex space-x-4 mt-4">
                                <button
                                    className={`px-4 py-2 font-medium rounded-md ${activeTab === 'members'
                                            ? 'bg-primary-100 text-primary-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setActiveTab('members')}
                                >
                                    <UserPlus className="h-4 w-4 inline mr-2" />
                                    Members
                                </button>
                                <button
                                    className={`px-4 py-2 font-medium rounded-md ${activeTab === 'goals'
                                            ? 'bg-primary-100 text-primary-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setActiveTab('goals')}
                                >
                                    <Target className="h-4 w-4 inline mr-2" />
                                    Goals
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'members' && (
                                <TeamMemberManager teamId={selectedTeam} users={users} />
                            )}
                            {activeTab === 'goals' && (
                                <TeamGoalManager teamId={selectedTeam} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamManagement;
