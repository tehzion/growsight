/**
 * Employee Development Center
 * Comprehensive personal and professional development features
 */

import React, { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  Award, 
  BookOpen, 
  Users, 
  MessageSquare,
  Calendar,
  CheckCircle2,
  Plus,
  BarChart3,
  Star,
  ArrowRight,
  Clock,
  Lightbulb,
  Zap,
  Map
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuthStore } from '../../stores/authStore';
import EnhancedRBAC from '../../lib/rbac/enhancedPermissions';

interface DevelopmentGoal {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'career' | 'performance' | 'leadership' | 'technical';
  targetDate: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  progress: number;
  milestones: Milestone[];
  resources: Resource[];
  mentorId?: string;
  createdAt: Date;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
}

interface Resource {
  id: string;
  title: string;
  type: 'course' | 'book' | 'article' | 'video' | 'mentor' | 'workshop';
  url?: string;
  description: string;
  estimatedHours: number;
  completed: boolean;
}

interface SkillAssessment {
  skillId: string;
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  lastAssessed: Date;
  category: string;
  trend: 'improving' | 'stable' | 'declining';
}

interface PeerFeedback {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  feedback: string;
  rating: number;
  skills: string[];
  anonymous: boolean;
  createdAt: Date;
}

interface CareerPath {
  id: string;
  title: string;
  description: string;
  currentRole: string;
  targetRole: string;
  timeframe: string;
  requiredSkills: RequiredSkill[];
  estimatedSteps: CareerStep[];
}

interface RequiredSkill {
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  priority: 'high' | 'medium' | 'low';
}

interface CareerStep {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  prerequisites: string[];
  completed: boolean;
}

export const DevelopmentCenter: React.FC = () => {
  const { user } = useAuthStore();
  const rbac = EnhancedRBAC.getInstance();

  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'skills' | 'feedback' | 'career'>('overview');
  const [goals, setGoals] = useState<DevelopmentGoal[]>([]);
  const [skills, setSkills] = useState<SkillAssessment[]>([]);
  const [feedback, setFeedback] = useState<PeerFeedback[]>([]);
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Check permissions
  const canManageGoals = rbac.hasPermission(user, 'development.goals');
  const canViewAnalytics = rbac.hasPermission(user, 'analytics.personal');
  const canGiveFeedback = rbac.hasPermission(user, 'collaboration.peer_feedback');

  useEffect(() => {
    loadDevelopmentData();
  }, []);

  const loadDevelopmentData = () => {
    // Mock data - in real implementation, load from API
    const mockGoals: DevelopmentGoal[] = [
      {
        id: '1',
        title: 'Master React Advanced Patterns',
        description: 'Learn advanced React patterns including render props, HOCs, and compound components',
        category: 'technical',
        targetDate: new Date('2024-12-31'),
        status: 'in_progress',
        progress: 65,
        milestones: [
          {
            id: 'm1',
            title: 'Complete React Patterns Course',
            description: 'Finish the advanced React patterns online course',
            dueDate: new Date('2024-08-31'),
            completed: true,
            completedAt: new Date('2024-08-15')
          },
          {
            id: 'm2',
            title: 'Build Practice Project',
            description: 'Create a project demonstrating learned patterns',
            dueDate: new Date('2024-10-31'),
            completed: false
          }
        ],
        resources: [
          {
            id: 'r1',
            title: 'Advanced React Patterns',
            type: 'course',
            url: 'https://example.com/react-course',
            description: 'Comprehensive course on React patterns',
            estimatedHours: 20,
            completed: true
          }
        ],
        createdAt: new Date('2024-06-01')
      },
      {
        id: '2',
        title: 'Develop Leadership Skills',
        description: 'Improve leadership and team management capabilities',
        category: 'leadership',
        targetDate: new Date('2025-03-31'),
        status: 'in_progress',
        progress: 30,
        milestones: [
          {
            id: 'm3',
            title: 'Complete Leadership Assessment',
            description: 'Take comprehensive leadership skills assessment',
            dueDate: new Date('2024-09-30'),
            completed: false
          }
        ],
        resources: [],
        mentorId: 'mentor1',
        createdAt: new Date('2024-07-01')
      }
    ];

    const mockSkills: SkillAssessment[] = [
      {
        skillId: 'react',
        skillName: 'React Development',
        currentLevel: 4,
        targetLevel: 5,
        lastAssessed: new Date('2024-07-01'),
        category: 'Technical',
        trend: 'improving'
      },
      {
        skillId: 'leadership',
        skillName: 'Team Leadership',
        currentLevel: 2,
        targetLevel: 4,
        lastAssessed: new Date('2024-06-15'),
        category: 'Leadership',
        trend: 'stable'
      },
      {
        skillId: 'communication',
        skillName: 'Communication',
        currentLevel: 3,
        targetLevel: 4,
        lastAssessed: new Date('2024-06-01'),
        category: 'Soft Skills',
        trend: 'improving'
      }
    ];

    const mockFeedback: PeerFeedback[] = [
      {
        id: 'f1',
        fromUserId: 'user2',
        fromUserName: 'John Smith',
        toUserId: user?.id || '',
        feedback: 'Great collaboration on the recent project. Your technical skills and problem-solving approach were excellent.',
        rating: 5,
        skills: ['React Development', 'Problem Solving', 'Teamwork'],
        anonymous: false,
        createdAt: new Date('2024-07-10')
      }
    ];

    setGoals(mockGoals);
    setSkills(mockSkills);
    setFeedback(mockFeedback);
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Development Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Goals</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {goals.filter(g => g.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Skills Improving</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {skills.filter(s => s.trend === 'improving').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Feedback</p>
                <p className="text-2xl font-semibold text-gray-900">{feedback.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {canManageGoals && (
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => setShowGoalForm(true)}
              >
                <Plus className="h-6 w-6 mb-2" />
                Set New Goal
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => setActiveTab('skills')}
            >
              <BarChart3 className="h-6 w-6 mb-2" />
              Assess Skills
            </Button>

            {canGiveFeedback && (
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center"
                onClick={() => setShowFeedbackForm(true)}
              >
                <MessageSquare className="h-6 w-6 mb-2" />
                Give Feedback
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goals.slice(0, 3).map((goal) => (
              <div key={goal.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  goal.status === 'completed' ? 'bg-green-500' :
                  goal.status === 'in_progress' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`} />
                <div className="flex-1">
                  <p className="font-medium">{goal.title}</p>
                  <p className="text-sm text-gray-600">{goal.progress}% complete</p>
                </div>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const GoalsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Development Goals</h2>
        {canManageGoals && (
          <Button onClick={() => setShowGoalForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {goals.map((goal) => (
          <Card key={goal.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{goal.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                      goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      goal.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {goal.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      goal.category === 'technical' ? 'bg-purple-100 text-purple-800' :
                      goal.category === 'leadership' ? 'bg-orange-100 text-orange-800' :
                      goal.category === 'career' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {goal.category}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{goal.description}</p>
                  
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Target Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      Target: {goal.targetDate.toLocaleDateString()}
                    </div>

                    {/* Milestones */}
                    <div>
                      <p className="text-sm font-medium mb-2">Milestones ({goal.milestones.filter(m => m.completed).length}/{goal.milestones.length})</p>
                      <div className="space-y-1">
                        {goal.milestones.map((milestone) => (
                          <div key={milestone.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className={`h-4 w-4 ${
                              milestone.completed ? 'text-green-600' : 'text-gray-400'
                            }`} />
                            <span className={milestone.completed ? 'line-through text-gray-500' : ''}>
                              {milestone.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const SkillsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Skills Assessment</h2>
        <Button variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          Take Assessment
        </Button>
      </div>

      {/* Skills Radar Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Skills Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Skills radar chart would go here
          </div>
        </CardContent>
      </Card>

      {/* Skills List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => (
          <Card key={skill.skillId}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{skill.skillName}</h3>
                <span className={`text-sm ${
                  skill.trend === 'improving' ? 'text-green-600' :
                  skill.trend === 'declining' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {skill.trend === 'improving' ? '↗' : skill.trend === 'declining' ? '↘' : '→'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Level</span>
                  <span>{skill.currentLevel}/5</span>
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 h-2 rounded ${
                        level <= skill.currentLevel ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Target: {skill.targetLevel}/5</span>
                  <span>Last assessed: {skill.lastAssessed.toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const FeedbackTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Peer Feedback</h2>
        {canGiveFeedback && (
          <Button onClick={() => setShowFeedbackForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Give Feedback
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {feedback.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {item.fromUserName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{item.anonymous ? 'Anonymous' : item.fromUserName}</p>
                    <p className="text-sm text-gray-600">{item.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <p className="text-gray-700 mb-3">{item.feedback}</p>
              
              <div className="flex gap-2">
                {item.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const CareerTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Career Development</h2>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Career Path Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto mb-4" />
            <p>Career path planning feature coming soon</p>
            <Button variant="outline" className="mt-4">
              Explore Career Paths
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Development Center</h1>
        <p className="text-gray-600">Track your professional growth and development</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'goals', name: 'Goals', icon: Target },
            { id: 'skills', name: 'Skills', icon: Award },
            { id: 'feedback', name: 'Feedback', icon: MessageSquare },
            { id: 'career', name: 'Career', icon: TrendingUp }
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
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'goals' && <GoalsTab />}
        {activeTab === 'skills' && <SkillsTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'career' && <CareerTab />}
      </div>
    </div>
  );
};

export default DevelopmentCenter;