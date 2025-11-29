import React, { useEffect, useState } from 'react';
import { Plus, Target, CheckCircle, Clock } from 'lucide-react';
import { useTeamStore } from '../../stores/teamStore';
import Button from '../ui/Button';

interface TeamGoalManagerProps {
    teamId: string;
}

const TeamGoalManager: React.FC<TeamGoalManagerProps> = ({ teamId }) => {
    const { teamGoals, fetchTeamGoals, createTeamGoal } = useTeamStore();
    const [showCreateGoal, setShowCreateGoal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        targetValue: '',
        metric: '',
        deadline: ''
    });

    const goals = teamGoals.get(teamId) || [];

    useEffect(() => {
        fetchTeamGoals(teamId);
    }, [teamId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createTeamGoal({
            teamId,
            title: formData.title,
            description: formData.description,
            targetValue: parseFloat(formData.targetValue),
            metric: formData.metric,
            deadline: formData.deadline
        });
        setFormData({ title: '', description: '', targetValue: '', metric: '', deadline: '' });
        setShowCreateGoal(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Team Goals ({goals.length})</h3>
                <Button
                    size="sm"
                    onClick={() => setShowCreateGoal(!showCreateGoal)}
                    leftIcon={<Plus className="h-4 w-4" />}
                >
                    Add Goal
                </Button>
            </div>

            {showCreateGoal && (
                <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-md space-y-3">
                    <input
                        type="text"
                        placeholder="Goal title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                    />
                    <textarea
                        placeholder="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="number"
                            step="0.1"
                            placeholder="Target (e.g. 6.5)"
                            value={formData.targetValue}
                            onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Metric (e.g. Score/7)"
                            value={formData.metric}
                            onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <input
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <div className="flex space-x-2">
                        <Button size="sm" type="submit">Create Goal</Button>
                        <Button size="sm" variant="outline" type="button" onClick={() => setShowCreateGoal(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {goals.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No goals set. Create your first goal above.</p>
                ) : (
                    goals.map(goal => (
                        <div key={goal.id} className="p-4 bg-gray-50 rounded-md">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Target className="h-4 w-4 text-primary-600" />
                                        <h4 className="font-medium text-gray-900">{goal.title}</h4>
                                    </div>
                                    {goal.description && (
                                        <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                                    )}
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>Target: {goal.target_value} {goal.metric}</span>
                                        <span>Current: {goal.current_value} {goal.metric}</span>
                                        {goal.deadline && (
                                            <span className="flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {new Date(goal.deadline).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        goal.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                    }`}>
                                    {goal.status === 'completed' && <CheckCircle className="h-3 w-3 inline mr-1" />}
                                    {goal.status}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TeamGoalManager;
