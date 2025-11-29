import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTeamStore } from '../../stores/teamStore';
import Button from '../ui/Button';

interface TeamFormProps {
    team?: any;
    onClose: () => void;
    users: any[];
}

const TeamForm: React.FC<TeamFormProps> = ({ team, onClose, users }) => {
    const { createTeam, updateTeam, isLoading } = useTeamStore();

    const [formData, setFormData] = useState({
        name: team?.name || '',
        description: team?.description || '',
        teamLeadId: team?.teamLeadId || ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Team name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        if (team) {
            await updateTeam(team.id, formData);
        } else {
            await createTeam(formData);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        {team ? 'Edit Team' : 'Create New Team'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Team Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Team Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${errors.name ? 'border-error-500' : 'border-gray-300'
                                }`}
                            placeholder="e.g. Engineering Team"
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-error-600">{errors.name}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Describe the team's purpose and responsibilities..."
                        />
                    </div>

                    {/* Team Lead */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Team Lead
                        </label>
                        <select
                            value={formData.teamLeadId}
                            onChange={(e) => setFormData({ ...formData, teamLeadId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">Select a team lead...</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.full_name || user.email}
                                    {user.role && ` (${user.role})`}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-sm text-gray-500">
                            Optional: Assign a team lead to manage this team
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isLoading}
                        >
                            {team ? 'Update Team' : 'Create Team'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeamForm;
