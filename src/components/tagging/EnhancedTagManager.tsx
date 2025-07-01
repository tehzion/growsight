import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Brain, 
  TrendingUp, 
  Users, 
  Building2,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Filter,
  Search,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { Tag as TagType, UserTag, OrganizationTag, TagInsight } from '../../types';
import useTagStore from '../../stores/tagStore';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

interface EnhancedTagManagerProps {
  targetType: 'user' | 'organization';
  targetId: string;
  targetName: string;
  onTagUpdate?: () => void;
}

const EnhancedTagManager: React.FC<EnhancedTagManagerProps> = ({
  targetType,
  targetId,
  targetName,
  onTagUpdate
}) => {
  const { user: currentUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const {
    tags,
    userTags,
    organizationTags,
    insights,
    isLoading,
    error,
    fetchTags,
    fetchUserTags,
    fetchOrganizationTags,
    createTag,
    assignUserTag,
    assignOrganizationTag,
    removeUserTag,
    removeOrganizationTag,
    generateInsights,
    analyzeUserForTags,
    analyzeOrganizationForTags,
    clearError
  } = useTagStore();

  // State management
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('');

  // Form data
  const [newTag, setNewTag] = useState({
    name: '',
    category: 'custom' as TagType['category'],
    color: '#3B82F6',
    description: ''
  });

  // Load data
  useEffect(() => {
    if (targetType === 'user') {
      fetchUserTags(targetId);
    } else {
      fetchOrganizationTags(targetId);
    }
    fetchTags();
  }, [targetId, targetType, fetchUserTags, fetchOrganizationTags, fetchTags]);

  // Get current tags
  const currentTags = targetType === 'user' ? userTags : organizationTags;

  // Filter tags
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || tag.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter current tags
  const filteredCurrentTags = currentTags.filter(tag => {
    const matchesConfidence = !confidenceFilter || 
      (tag.confidence && tag.confidence >= parseInt(confidenceFilter));
    return matchesConfidence;
  });

  // Handle tag creation
  const handleCreateTag = async () => {
    if (!newTag.name.trim()) {
      addNotification({
        title: 'Error',
        message: 'Tag name is required',
        type: 'error'
      });
      return;
    }

    try {
      await createTag({
        ...newTag,
        organizationId: currentUser?.organizationId,
        createdById: currentUser?.id || ''
      });
      
      setNewTag({ name: '', category: 'custom', color: '#3B82F6', description: '' });
      setShowCreateTag(false);
      
      addNotification({
        title: 'Success',
        message: 'Tag created successfully',
        type: 'success'
      });
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to create tag',
        type: 'error'
      });
    }
  };

  // Handle tag assignment
  const handleAssignTag = async (tagId: string) => {
    try {
      if (targetType === 'user') {
        await assignUserTag({
          userId: targetId,
          tagId,
          assignedById: currentUser?.id || '',
          source: 'manual'
        });
      } else {
        await assignOrganizationTag({
          organizationId: targetId,
          tagId,
          assignedById: currentUser?.id || '',
          source: 'manual'
        });
      }
      
      addNotification({
        title: 'Success',
        message: 'Tag assigned successfully',
        type: 'success'
      });
      
      onTagUpdate?.();
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to assign tag',
        type: 'error'
      });
    }
  };

  // Handle tag removal
  const handleRemoveTag = async (tagId: string) => {
    try {
      if (targetType === 'user') {
        await removeUserTag(tagId);
      } else {
        await removeOrganizationTag(tagId);
      }
      
      addNotification({
        title: 'Success',
        message: 'Tag removed successfully',
        type: 'success'
      });
      
      onTagUpdate?.();
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to remove tag',
        type: 'error'
      });
    }
  };

  // Handle AI analysis
  const handleAIAnalysis = async () => {
    setShowAIAnalysis(true);
    try {
      let suggestedTags;
      if (targetType === 'user') {
        suggestedTags = await analyzeUserForTags(targetId);
      } else {
        suggestedTags = await analyzeOrganizationForTags(targetId);
      }
      
      if (suggestedTags.length > 0) {
        addNotification({
          title: 'AI Analysis Complete',
          message: `${suggestedTags.length} tags suggested`,
          type: 'success'
        });
      } else {
        addNotification({
          title: 'AI Analysis Complete',
          message: 'No new tags suggested',
          type: 'info'
        });
      }
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'AI analysis failed',
        type: 'error'
      });
    }
    setShowAIAnalysis(false);
  };

  // Handle insight generation
  const handleGenerateInsights = async () => {
    try {
      const newInsights = await generateInsights(
        targetType === 'user' ? targetId : undefined,
        targetType === 'organization' ? targetId : undefined
      );
      
      addNotification({
        title: 'Insights Generated',
        message: `${newInsights.length} new insights available`,
        type: 'success'
      });
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to generate insights',
        type: 'error'
      });
    }
  };

  const getTagColor = (category: TagType['category']) => {
    const colors = {
      strength: 'bg-green-100 text-green-800 border-green-200',
      development: 'bg-orange-100 text-orange-800 border-orange-200',
      insight: 'bg-blue-100 text-blue-800 border-blue-200',
      behavior: 'bg-purple-100 text-purple-800 border-purple-200',
      skill: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      performance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      custom: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category] || colors.custom;
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ai_analysis': return <Brain className="h-4 w-4" />;
      case 'assessment': return <BarChart3 className="h-4 w-4" />;
      case 'performance_review': return <TrendingUp className="h-4 w-4" />;
      case 'peer_feedback': return <Users className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {targetType === 'user' ? 'User' : 'Organization'} Tagging System
          </h2>
          <p className="text-sm text-gray-600">
            AI-powered tag detection and categorization for {targetName}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleAIAnalysis}
            disabled={showAIAnalysis}
            leftIcon={showAIAnalysis ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          >
            {showAIAnalysis ? 'Analyzing...' : 'AI Analysis'}
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateInsights}
            leftIcon={<Lightbulb className="h-4 w-4" />}
          >
            Generate Insights
          </Button>
          <Button
            onClick={() => setShowCreateTag(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Tag
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-error-50 border-error-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-error-600" />
              <div>
                <h3 className="font-medium text-error-800">Tag Error</h3>
                <p className="text-sm text-error-700">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Available Tags</span>
              <div className="flex space-x-2">
                <FormInput
                  type="text"
                  placeholder="Search tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                  leftIcon={<Search className="h-4 w-4" />}
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">All Categories</option>
                  <option value="strength">Strengths</option>
                  <option value="development">Development</option>
                  <option value="insight">Insights</option>
                  <option value="behavior">Behaviors</option>
                  <option value="skill">Skills</option>
                  <option value="performance">Performance</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(tag.category)}`}>
                      {tag.name}
                    </div>
                    {tag.description && (
                      <span className="text-sm text-gray-600">{tag.description}</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignTag(tag.id)}
                    leftIcon={<Plus className="h-3 w-3" />}
                  >
                    Assign
                  </Button>
                </div>
              ))}
              {filteredTags.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No tags available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Tags</span>
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">All Confidence</option>
                <option value="80">High (80%+)</option>
                <option value="60">Medium (60%+)</option>
                <option value="40">Low (40%+)</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredCurrentTags.map(tag => (
                <div key={tag.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getSourceIcon(tag.source)}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(tag.tag?.category || 'custom')}`}>
                        {tag.tag?.name || 'Unknown Tag'}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveTag(tag.id)}
                      leftIcon={<Trash2 className="h-3 w-3" />}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Confidence: <span className={getConfidenceColor(tag.confidence)}>{tag.confidence || 0}%</span></span>
                    <span>Source: {tag.source.replace('_', ' ')}</span>
                  </div>
                  {tag.metadata?.context && (
                    <p className="text-xs text-gray-500 mt-1">{tag.metadata.context}</p>
                  )}
                </div>
              ))}
              {filteredCurrentTags.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No tags assigned yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
              AI-Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.slice(0, 6).map(insight => (
                <div key={insight.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      insight.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      insight.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {insight.priority}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Confidence: {insight.confidence}%</span>
                    <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Tag Modal */}
      {showCreateTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Tag</h3>
            <div className="space-y-4">
              <FormInput
                label="Tag Name"
                value={newTag.name}
                onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter tag name"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newTag.category}
                  onChange={(e) => setNewTag(prev => ({ ...prev, category: e.target.value as TagType['category'] }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="strength">Strength</option>
                  <option value="development">Development</option>
                  <option value="insight">Insight</option>
                  <option value="behavior">Behavior</option>
                  <option value="skill">Skill</option>
                  <option value="performance">Performance</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <FormInput
                label="Description"
                value={newTag.description}
                onChange={(e) => setNewTag(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 rounded-md border-gray-300"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateTag(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTag}
                disabled={!newTag.name.trim()}
              >
                Create Tag
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTagManager; 