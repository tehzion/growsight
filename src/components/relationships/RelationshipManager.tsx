import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit3, UserCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { useRelationshipStore } from '../../stores/relationshipStore';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { RelationshipType } from '../../types';

const RelationshipManager: React.FC = () => {
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUserStore();
  const { relationships, fetchRelationships, createRelationship, deleteRelationship, isLoading } = useRelationshipStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRelatedUser, setSelectedRelatedUser] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('peer');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.organizationId) {
      fetchUsers(user.organizationId);
      fetchRelationships();
    }
  }, [user, fetchUsers, fetchRelationships]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUser || !selectedRelatedUser) {
      setError('Please select both users');
      return;
    }

    if (selectedUser === selectedRelatedUser) {
      setError('Users cannot have a relationship with themselves');
      return;
    }

    try {
      await createRelationship({
        userId: selectedUser,
        relatedUserId: selectedRelatedUser,
        relationshipType,
      });

      // Reset form
      setSelectedUser('');
      setSelectedRelatedUser('');
      setRelationshipType('peer');
      setShowAddForm(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to create relationship');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this relationship?')) {
      try {
        await deleteRelationship(id);
      } catch (err) {
        console.error('Failed to delete relationship:', err);
      }
    }
  };

  const getRelationshipLabel = (type: RelationshipType) => {
    switch (type) {
      case 'peer': return 'Peer';
      case 'supervisor': return 'Supervisor';
      case 'team_member': return 'Team Member';
      default: return type;
    }
  };

  const getRelationshipColor = (type: RelationshipType) => {
    switch (type) {
      case 'peer': return 'bg-blue-100 text-blue-800';
      case 'supervisor': return 'bg-purple-100 text-purple-800';
      case 'team_member': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? `${foundUser.firstName} ${foundUser.lastName}` : 'Unknown User';
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Relationships</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage peer, supervisor, and team member relationships for assessment assignments
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {showAddForm ? 'Cancel' : 'Add Relationship'}
        </Button>
      </div>

      {/* Add Relationship Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Relationship</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary User
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related User
                  </label>
                  <select
                    value={selectedRelatedUser}
                    onChange={(e) => setSelectedRelatedUser(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select related user...</option>
                    {users.filter(u => u.id !== selectedUser).map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Type
                </label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  required
                >
                  <option value="peer">Peer - Colleague at same level</option>
                  <option value="supervisor">Supervisor - Manager or direct supervisor</option>
                  <option value="team_member">Team Member - Subordinate or team member</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={!selectedUser || !selectedRelatedUser || isLoading}
                >
                  Create Relationship
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Relationships List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Relationships ({relationships.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {relationships.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No relationships defined</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create relationships to enable targeted assessment assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {relationships.map((relationship) => (
                <div
                  key={relationship.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {getUserName(relationship.userId)}
                      </span>
                    </div>
                    <div className="text-gray-500">→</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900">
                        {getUserName(relationship.relatedUserId)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(relationship.relationshipType)}`}>
                        {getRelationshipLabel(relationship.relationshipType)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      Created {new Date(relationship.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(relationship.id)}
                      className="text-error-600 hover:text-error-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RelationshipManager;