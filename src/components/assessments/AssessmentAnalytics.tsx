import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Target, Award, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { useAuthStore } from '../../stores/authStore';

interface AssessmentAnalyticsProps {
  userId?: string;
  organizationId?: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

interface PerformanceMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface CategoryPerformance {
  category: string;
  averageScore: number;
  totalAssessments: number;
  improvement: number;
}

const AssessmentAnalytics = ({ 
  userId, 
  organizationId, 
  timeRange = 'month' 
}: AssessmentAnalyticsProps) => {
  const { user } = useAuthStore();
  const { fetchUserResults, fetchOrganizationResults, userResults, organizationResults } = useAssessmentResultsStore();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [peerComparison, setPeerComparison] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserId = userId || user?.id;

  const calculatePerformanceMetrics = useCallback(() => {
    const now = new Date();
    const timeRangeMs = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };

    const cutoffDate = new Date(now.getTime() - timeRangeMs[selectedTimeRange]);
    
    const recentResults = userResults.filter(result => 
      new Date(result.completedAt) >= cutoffDate
    );

    const previousPeriodStart = new Date(cutoffDate.getTime() - timeRangeMs[selectedTimeRange]);
    const previousResults = userResults.filter(result => 
      new Date(result.completedAt) >= previousPeriodStart && 
      new Date(result.completedAt) < cutoffDate
    );

    const metrics: PerformanceMetric[] = [
      {
        label: 'Completion Rate',
        value: recentResults.length > 0 ? (recentResults.filter(r => r.status === 'completed').length / recentResults.length) * 100 : 0,
        change: calculateChange(
          recentResults.filter(r => r.status === 'completed').length / recentResults.length,
          previousResults.filter(r => r.status === 'completed').length / previousResults.length
        ),
        trend: getTrend(
          recentResults.filter(r => r.status === 'completed').length / recentResults.length,
          previousResults.filter(r => r.status === 'completed').length / previousResults.length
        )
      },
      {
        label: 'Average Score',
        value: recentResults.length > 0 ? 
          recentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / recentResults.length : 0,
        change: calculateChange(
          recentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / recentResults.length,
          previousResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / previousResults.length
        ),
        trend: getTrend(
          recentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / recentResults.length,
          previousResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / previousResults.length
        )
      },
      {
        label: 'Assessments Completed',
        value: recentResults.length,
        change: calculateChange(recentResults.length, previousResults.length),
        trend: getTrend(recentResults.length, previousResults.length)
      },
      {
        label: 'Time to Complete',
        value: recentResults.length > 0 ? 
          recentResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60); // in minutes
          }, 0) / recentResults.length : 0,
        change: calculateChange(
          recentResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60);
          }, 0) / recentResults.length,
          previousResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60);
          }, 0) / previousResults.length
        ),
        trend: getTrend(
          recentResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60);
          }, 0) / recentResults.length,
          previousResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60);
          }, 0) / previousResults.length
        )
      }
    ];

    setPerformanceMetrics(metrics);
  }, [userResults, selectedTimeRange]);

  const calculateCategoryPerformance = useCallback(() => {
    const categoryMap = new Map<string, { scores: number[], count: number }>();

    userResults.forEach(result => {
      if (result.sectionResults) {
        result.sectionResults.forEach(section => {
          if (!categoryMap.has(section.sectionName)) {
            categoryMap.set(section.sectionName, { scores: [], count: 0 });
          }
          const category = categoryMap.get(section.sectionName)!;
          category.scores.push(section.averageScore || 0);
          category.count++;
        });
      }
    });

    const categories: CategoryPerformance[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
      totalAssessments: data.count,
      improvement: 0 // This would be calculated based on historical data
    }));

    setCategoryPerformance(categories.sort((a, b) => b.averageScore - a.averageScore));
  }, [userResults]);

  const calculatePeerComparison = useCallback(() => {
    if (!organizationResults || organizationResults.length === 0) {
      setPeerComparison(null);
      return;
    }

    const userAvgScore = userResults.length > 0 ? 
      userResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / userResults.length : 0;
    
    const orgAvgScore = organizationResults.length > 0 ?
      organizationResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / organizationResults.length : 0;

    const percentile = organizationResults.filter(r => (r.totalScore || 0) <= userAvgScore).length / organizationResults.length * 100;

    setPeerComparison({
      userAverage: userAvgScore,
      organizationAverage: orgAvgScore,
      percentile: Math.round(percentile),
      rank: organizationResults.filter(r => (r.totalScore || 0) > userAvgScore).length + 1,
      totalPeers: organizationResults.length
    });
  }, [organizationResults, userResults]);

  const loadAnalytics = useCallback(async () => {
    if (!currentUserId) return;

    setIsLoading(true);
    try {
      // Fetch user results
      await fetchUserResults(currentUserId);
      
      // Fetch organization results for comparison if org admin or super admin
      if (organizationId || user?.role === 'org_admin' || user?.role === 'super_admin') {
        await fetchOrganizationResults(organizationId || user?.organizationId);
      }

      // Calculate analytics
      calculatePerformanceMetrics();
      calculateCategoryPerformance();
      calculatePeerComparison();
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, fetchUserResults, fetchOrganizationResults, organizationId, user?.role, user?.organizationId, calculatePerformanceMetrics, calculateCategoryPerformance, calculatePeerComparison]);

  useEffect(() => {
    if (currentUserId) {
      loadAnalytics();
    }
  }, [currentUserId, selectedTimeRange, loadAnalytics]);

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const change = current - previous;
    if (Math.abs(change) < 0.01) return 'stable';
    return change > 0 ? 'up' : 'down';
  };

  const calculatePerformanceMetrics = () => {
    const now = new Date();
    const timeRangeMs = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };

    const cutoffDate = new Date(now.getTime() - timeRangeMs[selectedTimeRange]);
    
    const recentResults = userResults.filter(result => 
      new Date(result.completedAt) >= cutoffDate
    );

    const previousPeriodStart = new Date(cutoffDate.getTime() - timeRangeMs[selectedTimeRange]);
    const previousResults = userResults.filter(result => 
      new Date(result.completedAt) >= previousPeriodStart && 
      new Date(result.completedAt) < cutoffDate
    );

    const metrics: PerformanceMetric[] = [
      {
        label: 'Completion Rate',
        value: recentResults.length > 0 ? (recentResults.filter(r => r.status === 'completed').length / recentResults.length) * 100 : 0,
        change: calculateChange(
          recentResults.filter(r => r.status === 'completed').length / recentResults.length,
          previousResults.filter(r => r.status === 'completed').length / previousResults.length
        ),
        trend: getTrend(
          recentResults.filter(r => r.status === 'completed').length / recentResults.length,
          previousResults.filter(r => r.status === 'completed').length / previousResults.length
        )
      },
      {
        label: 'Average Score',
        value: recentResults.length > 0 ? 
          recentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / recentResults.length : 0,
        change: calculateChange(
          recentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / recentResults.length,
          previousResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / previousResults.length
        ),
        trend: getTrend(
          recentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / recentResults.length,
          previousResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / previousResults.length
        )
      },
      {
        label: 'Assessments Completed',
        value: recentResults.length,
        change: calculateChange(recentResults.length, previousResults.length),
        trend: getTrend(recentResults.length, previousResults.length)
      },
      {
        label: 'Time to Complete',
        value: recentResults.length > 0 ? 
          recentResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60); // in minutes
          }, 0) / recentResults.length : 0,
        change: calculateChange(
          recentResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60);
          }, 0) / recentResults.length,
          previousResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60);
          }, 0) / previousResults.length
        ),
        trend: getTrend(
          recentResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60);
          }, 0) / recentResults.length,
          previousResults.reduce((sum, r) => {
            const startTime = new Date(r.startedAt).getTime();
            const endTime = new Date(r.completedAt).getTime();
            return sum + (endTime - startTime) / (1000 * 60);
          }, 0) / previousResults.length
        )
      }
    ];

    setPerformanceMetrics(metrics);
  };

  const calculateCategoryPerformance = () => {
    const categoryMap = new Map<string, { scores: number[], count: number }>();

    userResults.forEach(result => {
      if (result.sectionResults) {
        result.sectionResults.forEach(section => {
          if (!categoryMap.has(section.sectionName)) {
            categoryMap.set(section.sectionName, { scores: [], count: 0 });
          }
          const category = categoryMap.get(section.sectionName)!;
          category.scores.push(section.averageScore || 0);
          category.count++;
        });
      }
    });

    const categories: CategoryPerformance[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
      totalAssessments: data.count,
      improvement: 0 // This would be calculated based on historical data
    }));

    setCategoryPerformance(categories.sort((a, b) => b.averageScore - a.averageScore));
  };

  const calculatePeerComparison = () => {
    if (!organizationResults || organizationResults.length === 0) {
      setPeerComparison(null);
      return;
    }

    const userAvgScore = userResults.length > 0 ? 
      userResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / userResults.length : 0;
    
    const orgAvgScore = organizationResults.length > 0 ?
      organizationResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / organizationResults.length : 0;

    const percentile = organizationResults.filter(r => (r.totalScore || 0) <= userAvgScore).length / organizationResults.length * 100;

    setPeerComparison({
      userAverage: userAvgScore,
      organizationAverage: orgAvgScore,
      percentile: Math.round(percentile),
      rank: organizationResults.filter(r => (r.totalScore || 0) > userAvgScore).length + 1,
      totalPeers: organizationResults.length
    });
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const change = current - previous;
    if (Math.abs(change) < 0.01) return 'stable';
    return change > 0 ? 'up' : 'down';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Assessment Analytics</h2>
        <div className="flex space-x-2">
          {(['week', 'month', 'quarter', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                selectedTimeRange === range
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metric.label === 'Completion Rate' || metric.label === 'Average Score' 
                      ? `${Math.round(metric.value)}%`
                      : metric.label === 'Time to Complete'
                      ? `${Math.round(metric.value)}m`
                      : Math.round(metric.value)
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                    {metric.change > 0 ? '+' : ''}{Math.round(metric.change)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Peer Comparison */}
      {peerComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Peer Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(peerComparison.percentile)}%
                </div>
                <div className="text-sm text-gray-600">Percentile</div>
                <div className="text-xs text-gray-500 mt-1">
                  Rank {peerComparison.rank} of {peerComparison.totalPeers}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(peerComparison.userAverage)}%
                </div>
                <div className="text-sm text-gray-600">Your Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(peerComparison.organizationAverage)}%
                </div>
                <div className="text-sm text-gray-600">Org Average</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Performance */}
      {categoryPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Performance by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryPerformance.slice(0, 5).map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-600">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{category.category}</div>
                      <div className="text-sm text-gray-500">
                        {category.totalAssessments} assessment{category.totalAssessments !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {Math.round(category.averageScore)}%
                    </div>
                    <div className="text-sm text-gray-500">Average Score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userResults.slice(0, 5).map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {result.assessmentTitle || 'Assessment'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(result.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {Math.round(result.totalScore || 0)}%
                  </div>
                  <div className="text-sm text-gray-500">Score</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssessmentAnalytics; 