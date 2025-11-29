import { useState, useEffect } from 'react';
import { Plus, Target, Calendar, CheckCircle, Clock, AlertCircle, Trash2, Edit2, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useGoalStore } from '../../stores/goalStore';
import { Goal } from '../../types';

export default function MyGoals() {
    const { goals, fetchGoals, createGoal, updateGoal, deleteGoal, isLoading } = useGoalStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'pending' as const,
        dueDate: '',
        progress: 0
    });

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingGoal) {
            await updateGoal(editingGoal.id, formData);
        } else {
            await createGoal(formData);
        }
        closeModal();
    };

    const openModal = (goal?: Goal) => {
        if (goal) {
            setEditingGoal(goal);
            setFormData({
                title: goal.title,
                description: goal.description || '',
                status: goal.status,
                dueDate: goal.dueDate || '',
                progress: goal.progress
            });
        } else {
            setEditingGoal(null);
            setFormData({
                title: '',
                description: '',
                status: 'pending',
                dueDate: '',
                progress: 0
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingGoal(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-success-100 text-success-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Goals</h1>
                    <p className="text-gray-500">Track your personal development goals</p>
                </div>
                <Button onClick={() => openModal()} leftIcon={<Plus className="h-4 w-4" />}>
                    Add Goal
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : goals.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Target className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No goals yet</h3>
                        <p className="text-gray-500 mb-4">Set your first goal to start tracking your progress.</p>
                        <Button onClick={() => openModal()}>Create Goal</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {goals.map((goal) => (
                        <Card key={goal.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                                        {goal.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <div className="flex space-x-1">
                                        <button onClick={() => openModal(goal)} className="p-1 text-gray-400 hover:text-primary-600">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => deleteGoal(goal.id)} className="p-1 text-gray-400 hover:text-error-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <CardTitle className="text-lg mt-2">{goal.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{goal.description}</p>

                                <div className="space-y-3">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <Calendar className="h-4 w-4 mr-2" />
                                        {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'No deadline'}
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Progress</span>
                                            <span className="font-medium">{goal.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-primary-600 h-2 rounded-full transition-all"
                                                style={{ width: `${goal.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-semibold">{editingGoal ? 'Edit Goal' : 'New Goal'}</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Progress ({formData.progress}%)</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    className="mt-1 block w-full"
                                    value={formData.progress}
                                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                                <Button type="submit">{editingGoal ? 'Update Goal' : 'Create Goal'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
