import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { useTeamStore } from '../../stores/teamStore';
import Button from '../ui/Button';

interface TeamMemberManagerProps {
    teamId: string;
    users: any[];
}

const TeamMemberManager: React.FC<TeamMemberManagerProps> = ({ teamId, users }) => {
    const { teamMembers, fetchTeamMembers, addTeamMember, removeTeamMember } = useTeamStore();
    const [showAddMember, setShowAddMember] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');

    const members = teamMembers.get(teamId) || [];

    useEffect(() => {
        fetchTeamMembers(teamId);
    }, [teamId]);

    const availableUsers = users.filter(
        user => !members.some(member => member.user_id === user.id)
    );

    const handleAddMember = async () => {
        if (selectedUserId) {
            await addTeamMember(teamId, selectedUserId);
            setSelectedUserId('');
            setShowAddMember(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (confirm('Remove this member from the team?')) {
            await removeTeamMember(teamId, userId);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Team Members ({members.length})</h3>
                <Button
                    size="sm"
                    onClick={() => setShowAddMember(!showAddMember)}
                    leftIcon={<UserPlus className="h-4 w-4" />}
                >
                    Add Member
                </Button>
            </div>

            {showAddMember && (
                <div className="p-4 bg-gray-50 rounded-md space-y-3">
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">Select a user...</option>
                        {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.full_name || user.email}
                            </option>
                        ))}
                    </select>
                    <div className="flex space-x-2">
                        <Button size="sm" onClick={handleAddMember} disabled={!selectedUserId}>
                            Add
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddMember(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {members.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No members yet. Add your first member above.</p>
                ) : (
                    members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center space-x-3">
                                {member.role === 'lead' && (
                                    <Shield className="h-4 w-4 text-primary-600" />
                                )}
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {member.user?.full_name || member.user?.email}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {member.role === 'lead' ? 'Team Lead' : 'Member'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveMember(member.user_id)}
                                leftIcon={<Trash2 className="h-4 w-4" />}
                                className="text-error-600 hover:bg-error-50"
                            >
                                Remove
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TeamMemberManager;
