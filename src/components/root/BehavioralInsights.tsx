import React, { useState } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Building2, 
  Users2, 
  Target,
  Eye,
  Lock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  PieChart,
  LineChart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';

interface BehavioralPattern {
  id: string;
  organizationType: string;
  behaviorPattern: string;
  confidence: number;
  evidence: string[];
  trend: 'improving' | 'declining' | 'stable';
  impact: 'high' | 'medium' | 'low';
  affectedCount: number;
}

interface CrossOrganizationInsight {
  id: string;
  insight: string;
  description: string;
  affectedOrganizations: number;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
  confidence: number;
}

interface BehavioralMetrics {
  averageCompletionRate: number;
  averageResponseTime: number;
  participationTrend: string;
  qualityScore: number;
  engagementLevel: string;
  innovationIndex: number;
}

interface BehavioralInsightsProps {
  privacyLevel: 'aggregated' | 'anonymized' | 'detailed';
}

const BehavioralInsights: React.FC<BehavioralInsightsProps> = ({ privacyLevel }) => {
  const [activeView, setActiveView] = useState<'patterns' | 'insights' | 'metrics' | 'trends'>('patterns');

  // Mock behavioral data - replace with actual API calls
  const behavioralPatterns: BehavioralPattern[] = [
    {
      id: '1',
      organizationType: 'Technology',
      behaviorPattern: 'High Innovation Focus',
      confidence: 92,
      evidence: [
        'High assessment completion rates (94%)',
        'Strong competency in technical skills',
        'Active participation in development programs',
        'Quick adoption of new assessment features'
      ],
      trend: 'improving',
      impact: 'high',
      affectedCount: 15
    },
    {
      id: '2',
      organizationType: 'Healthcare',
      behaviorPattern: 'Patient-Centric Approach',
      confidence: 88,
      evidence: [
        'Strong communication skills ratings',
        'High empathy and care competency scores',
        'Focus on quality and safety metrics',
        'Consistent patient satisfaction correlation'
      ],
      trend: 'stable',
      impact: 'high',
      affectedCount: 12
    },
    {
      id: '3',
      organizationType: 'Finance',
      behaviorPattern: 'Risk-Averse Decision Making',
      confidence: 85,
      evidence: [
        'Conservative assessment response patterns',
        'High focus on compliance and regulation',
        'Detailed analysis and documentation',
        'Cautious approach to new initiatives'
      ],
      trend: 'stable',
      impact: 'medium',
      affectedCount: 18
    },
    {
      id: '4',
      organizationType: 'Education',
      behaviorPattern: 'Collaborative Learning Culture',
      confidence: 78,
      evidence: [
        'High peer feedback participation',
        'Strong team collaboration scores',
        'Continuous learning mindset',
        'Knowledge sharing behaviors'
      ],
      trend: 'improving',
      impact: 'medium',
      affectedCount: 8
    }
  ];

  const crossOrganizationInsights: CrossOrganizationInsight[] = [
    {
      id: '1',
      insight: 'Leadership Development Gap',
      description: 'Organizations across sectors show consistent gaps in strategic leadership competencies, particularly in digital transformation and change management.',
      affectedOrganizations: 15,
      severity: 'high',
      recommendation: 'Implement targeted leadership development programs focusing on digital skills and change management',
      confidence: 89
    },
    {
      id: '2',
      insight: 'Digital Transformation Readiness',
      description: 'Technology adoption patterns vary significantly across organization sizes, with smaller organizations showing higher agility but lower resources.',
      affectedOrganizations: 23,
      severity: 'medium',
      recommendation: 'Provide digital transformation support and resources for smaller organizations',
      confidence: 76
    },
    {
      id: '3',
      insight: 'Employee Engagement Correlation',
      description: 'Organizations with high assessment participation show 40% better retention rates and 25% higher productivity scores.',
      affectedOrganizations: 8,
      severity: 'medium',
      recommendation: 'Encourage assessment participation through engagement initiatives and recognition programs',
      confidence: 82
    },
    {
      id: '4',
      insight: 'Remote Work Adaptation',
      description: 'Organizations that quickly adapted to remote work show stronger digital collaboration and communication patterns.',
      affectedOrganizations: 19,
      severity: 'low',
      recommendation: 'Share best practices for remote work adaptation and digital collaboration',
      confidence: 71
    }
  ];

  const behavioralMetrics: BehavioralMetrics = {
    averageCompletionRate: 78.5,
    averageResponseTime: 2.3,
    participationTrend: '+12%',
    qualityScore: 4.2,
    engagementLevel: 'high',
    innovationIndex: 3.8
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <BarChart3 className="h-4 w-4 text-blue-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-800">Privacy Protection Active</h3>
              <p className="text-sm text-blue-700">
                All organizational data is anonymized and aggregated. Individual identities are protected while maintaining valuable behavioral insights.
                Current privacy level: <span className="font-medium capitalize">{privacyLevel}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'patterns', label: 'Behavioral Patterns', icon: <Brain className="h-4 w-4" /> },
            { id: 'insights', label: 'Cross-Organization Insights', icon: <Eye className="h-4 w-4" /> },
            { id: 'metrics', label: 'Key Metrics', icon: <BarChart3 className="h-4 w-4" /> },
            { id: 'trends', label: 'Emerging Trends', icon: <TrendingUp className="h-4 w-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeView === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Behavioral Patterns View */}
      {activeView === 'patterns' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-primary-600" />
              Organizational Behavioral Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {behavioralPatterns.map(pattern => (
                <div key={pattern.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{pattern.organizationType}</h4>
                      <p className="text-sm text-gray-600">{pattern.behaviorPattern}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(pattern.trend)}
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getConfidenceColor(pattern.confidence)}`}>
                          {pattern.confidence}%
                        </div>
                        <div className="text-xs text-gray-500">Confidence</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Supporting Evidence:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {pattern.evidence.map((item, index) => (
                        <li key={index} className="flex items-center">
                          <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pattern.impact === 'high' ? 'bg-red-100 text-red-800' :
                        pattern.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {pattern.impact} impact
                      </div>
                      <div className="text-xs text-gray-500">
                        {pattern.affectedCount} organizations affected
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Analyze Pattern
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cross-Organization Insights View */}
      {activeView === 'insights' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2 text-primary-600" />
              Cross-Organization Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {crossOrganizationInsights.map(insight => (
                <div key={insight.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.insight}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(insight.severity)}`}>
                      {insight.severity}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Recommendation:</h5>
                    <p className="text-sm text-gray-600">{insight.recommendation}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{insight.affectedOrganizations} orgs affected</span>
                    <span className={`font-medium ${getConfidenceColor(insight.confidence)}`}>
                      {insight.confidence}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics View */}
      {activeView === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Avg Completion Rate</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {behavioralMetrics.averageCompletionRate}%
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Across all organizations</p>
                </div>
                <div className="p-3 bg-blue-500 bg-opacity-10 rounded-full">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Engagement Level</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900 capitalize">
                    {behavioralMetrics.engagementLevel}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Participation trend: {behavioralMetrics.participationTrend}</p>
                </div>
                <div className="p-3 bg-green-500 bg-opacity-10 rounded-full">
                  <Users2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Quality Score</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {behavioralMetrics.qualityScore}/5
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Assessment quality</p>
                </div>
                <div className="p-3 bg-purple-500 bg-opacity-10 rounded-full">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Innovation Index</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {behavioralMetrics.innovationIndex}/5
                  </p>
                  <p className="text-xs text-orange-600 mt-1">Creative thinking patterns</p>
                </div>
                <div className="p-3 bg-orange-500 bg-opacity-10 rounded-full">
                  <Brain className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-teal-700">Response Time</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {behavioralMetrics.averageResponseTime} days
                  </p>
                  <p className="text-xs text-teal-600 mt-1">Average completion time</p>
                </div>
                <div className="p-3 bg-teal-500 bg-opacity-10 rounded-full">
                  <Clock className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-l-4 border-indigo-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-700">Global Reach</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    45+
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">Organizations analyzed</p>
                </div>
                <div className="p-3 bg-indigo-500 bg-opacity-10 rounded-full">
                  <Globe className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Emerging Trends View */}
      {activeView === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
              Emerging Behavioral Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-green-800">Remote Work Adaptation</h5>
                    <p className="text-sm text-green-700">
                      Organizations showing improved digital collaboration patterns and virtual team effectiveness
                    </p>
                    <div className="mt-2 text-xs text-green-600">
                      <strong>Impact:</strong> 19 organizations affected | <strong>Trend:</strong> Strongly improving
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-blue-800">Data-Driven Decision Making</h5>
                    <p className="text-sm text-blue-700">
                      Increased reliance on analytics and metrics for strategic decision making
                    </p>
                    <div className="mt-2 text-xs text-blue-600">
                      <strong>Impact:</strong> 23 organizations affected | <strong>Trend:</strong> Steadily increasing
                    </div>
                  </div>
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-purple-800">Sustainability Focus</h5>
                    <p className="text-sm text-purple-700">
                      Growing emphasis on environmental and social responsibility in organizational behavior
                    </p>
                    <div className="mt-2 text-xs text-purple-600">
                      <strong>Impact:</strong> 12 organizations affected | <strong>Trend:</strong> Emerging
                    </div>
                  </div>
                  <Globe className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-orange-800">Agile Methodology Adoption</h5>
                    <p className="text-sm text-orange-700">
                      Organizations increasingly adopting flexible, iterative approaches to project management
                    </p>
                    <div className="mt-2 text-xs text-orange-600">
                      <strong>Impact:</strong> 16 organizations affected | <strong>Trend:</strong> Growing adoption
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BehavioralInsights; 