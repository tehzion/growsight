import { useEffect, useState } from 'react';
import { BarChart4, TrendingUp, TrendingDown, CheckCircle, Lock, Eye, EyeOff, Download, Calendar, Award, Target, Zap, Tag } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useResultStore } from '../../stores/resultStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import ResultChart from '../../components/results/ResultChart';
import PDFExportButton from '../../components/ui/PDFExportButton';
import Button from '../../components/ui/Button';

const UserResults = () => {
  const { user } = useAuthStore();
  const { results, fetchResults, isLoading } = useResultStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'development' | 'competencies'>('overview');
  
  useEffect(() => {
    if (user) {
      fetchResults(user.id);
    }
  }, [user, fetchResults]);
  
  const userResults = user ? results[user.id] || [] : [];

  // Calculate overall statistics
  const calculateOverallStats = () => {
    if (userResults.length === 0) return null;

    let totalSelfRating = 0;
    let totalReviewerRating = 0;
    let totalQuestions = 0;
    let alignedCount = 0;
    let blindSpotCount = 0;
    let hiddenStrengthCount = 0;

    userResults.forEach(section => {
      section.questions.forEach(question => {
        totalSelfRating += question.selfRating;
        totalReviewerRating += question.avgReviewerRating;
        totalQuestions++;

        switch (question.alignment) {
          case 'aligned':
            alignedCount++;
            break;
          case 'blind_spot':
            blindSpotCount++;
            break;
          case 'hidden_strength':
            hiddenStrengthCount++;
            break;
        }
      });
    });

    // Aggregate competency data
    const competencyMap = new Map<string, {
      id: string;
      name: string;
      selfTotal: number;
      reviewerTotal: number;
      count: number;
    }>();
    
    userResults.forEach(section => {
      section.questions.forEach(question => {
        if (question.competencies && question.competencies.length > 0) {
          question.competencies.forEach(comp => {
            const existing = competencyMap.get(comp.id);
            if (existing) {
              existing.selfTotal += question.selfRating;
              existing.reviewerTotal += question.avgReviewerRating;
              existing.count += 1;
            } else {
              competencyMap.set(comp.id, {
                id: comp.id,
                name: comp.name,
                selfTotal: question.selfRating,
                reviewerTotal: question.avgReviewerRating,
                count: 1
              });
            }
          });
        }
      });
    });
    
    // Convert competency map to array of results
    const competencyResults = Array.from(competencyMap.values()).map(comp => {
      const selfAvg = comp.selfTotal / comp.count;
      const reviewerAvg = comp.reviewerTotal / comp.count;
      const gap = selfAvg - reviewerAvg;
      
      let alignment: 'aligned' | 'blind_spot' | 'hidden_strength';
      if (Math.abs(gap) <= 1) {
        alignment = 'aligned';
      } else if (gap > 1) {
        alignment = 'blind_spot';
      } else {
        alignment = 'hidden_strength';
      }
      
      return {
        competencyId: comp.id,
        competencyName: comp.name,
        selfAverage: selfAvg,
        reviewerAverage: reviewerAvg,
        gap: gap,
        alignment: alignment,
        questionCount: comp.count
      };
    });

    return {
      avgSelfRating: totalSelfRating / totalQuestions,
      avgReviewerRating: totalReviewerRating / totalQuestions,
      overallGap: (totalSelfRating - totalReviewerRating) / totalQuestions,
      alignedPercentage: (alignedCount / totalQuestions) * 100,
      blindSpotPercentage: (blindSpotCount / totalQuestions) * 100,
      hiddenStrengthPercentage: (hiddenStrengthCount / totalQuestions) * 100,
      totalQuestions,
      competencyResults,
      // Add more insights
      topStrengths: userResults.flatMap(section => 
        section.questions
          .filter(q => q.avgReviewerRating >= 5.5)
          .sort((a, b) => b.avgReviewerRating - a.avgReviewerRating)
          .slice(0, 3)
      ),
      developmentAreas: userResults.flatMap(section => 
        section.questions
          .filter(q => q.avgReviewerRating < 4.5)
          .sort((a, b) => a.avgReviewerRating - b.avgReviewerRating)
          .slice(0, 3)
      ),
      blindSpots: userResults.flatMap(section => 
        section.questions
          .filter(q => q.alignment === 'blind_spot' && q.gap > 1)
          .sort((a, b) => b.gap - a.gap)
          .slice(0, 3)
      ),
      hiddenStrengths: userResults.flatMap(section => 
        section.questions
          .filter(q => q.alignment === 'hidden_strength' && q.gap < -1)
          .sort((a, b) => a.gap - b.gap)
          .slice(0, 3)
      ),
      // Top and bottom competencies
      topCompetencies: competencyResults
        .sort((a, b) => b.reviewerAverage - a.reviewerAverage)
        .slice(0, 3),
      bottomCompetencies: competencyResults
        .sort((a, b) => a.reviewerAverage - b.reviewerAverage)
        .slice(0, 3)
    };
  };

  const overallStats = calculateOverallStats();

  // Get section with highest and lowest average ratings
  const getHighestRatedSection = () => {
    if (userResults.length === 0) return null;
    return userResults.reduce((highest, current) => 
      current.reviewerAverage > highest.reviewerAverage ? current : highest
    );
  };

  const getLowestRatedSection = () => {
    if (userResults.length === 0) return null;
    return userResults.reduce((lowest, current) => 
      current.reviewerAverage < lowest.reviewerAverage ? current : lowest
    );
  };

  const highestSection = getHighestRatedSection();
  const lowestSection = getLowestRatedSection();
  
  // Check if we have competency data
  const hasCompetencyData = overallStats?.competencyResults && overallStats.competencyResults.length > 0;
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assessment Results</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your personal feedback results and performance insights
          </p>
        </div>
        {userResults.length > 0 && (
          <div className="flex space-x-2">
            <PDFExportButton 
              exportType="results" 
              format="csv" 
              userId={user?.id}
              anonymizeData={false}
            >
              Export CSV
            </PDFExportButton>
            <PDFExportButton 
              exportType="results" 
              format="pdf" 
              userId={user?.id}
              anonymizeData={false}
            >
              Export PDF
            </PDFExportButton>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <Card className="bg-primary-50 border-primary-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="font-medium text-primary-800">Your Personal Results</h3>
              <p className="text-sm text-primary-700">
                These are your personal assessment results. Individual reviewer responses remain anonymous to protect privacy while providing you with valuable aggregated feedback.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Results Guide */}
      <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-primary-100 p-3 rounded-full">
              <BarChart4 className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-medium mb-3 text-gray-900">Understanding Your Feedback Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">What You'll See:</h3>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Self-ratings vs. reviewer averages (1-7 scale)</li>
                    <li>• Alignment indicators for each competency</li>
                    <li>• Aggregated feedback themes</li>
                    <li>• Development opportunities</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Alignment Indicators:</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-success-600" />
                      <span className="text-xs bg-success-100 text-success-800 px-2 py-1 rounded-full font-medium">Aligned</span>
                      <span className="text-gray-600">Self and reviewer ratings match</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <EyeOff className="h-4 w-4 text-warning-600" />
                      <span className="text-xs bg-warning-100 text-warning-800 px-2 py-1 rounded-full font-medium">Blind Spot</span>
                      <span className="text-gray-600">Self-rating higher than reviewers</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-primary-600" />
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full font-medium">Hidden Strength</span>
                      <span className="text-gray-600">Self-rating lower than reviewers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      {overallStats && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart4 className="h-4 w-4 mr-1" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'detailed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Target className="h-4 w-4 mr-1" />
              Detailed Results
            </button>
            {hasCompetencyData && (
              <button
                onClick={() => setActiveTab('competencies')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'competencies'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Tag className="h-4 w-4 mr-1" />
                Competencies
              </button>
            )}
            <button
              onClick={() => setActiveTab('development')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'development'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Zap className="h-4 w-4 mr-1" />
              Development Plan
            </button>
          </nav>
        </div>
      )}

      {/* Overall Statistics */}
      {activeTab === 'overview' && overallStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-700">
                    {overallStats.avgSelfRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-primary-600">Average Self-Rating</div>
                  <div className="text-xs text-primary-500 mt-1">out of 7</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary-700">
                    {overallStats.avgReviewerRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-secondary-600">Average Reviewer Rating</div>
                  <div className="text-xs text-secondary-500 mt-1">out of 7</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-success-50 to-success-100">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-700">
                    {overallStats.alignedPercentage.toFixed(0)}%
                  </div>
                  <div className="text-sm text-success-600">Aligned Ratings</div>
                  <div className="text-xs text-success-500 mt-1">
                    {overallStats.alignedPercentage > 70 ? 'Excellent self-awareness' : 
                     overallStats.alignedPercentage > 50 ? 'Good alignment' : 
                     'Room for improvement'}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-accent-50 to-accent-100">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-700">
                    {overallStats.totalQuestions}
                  </div>
                  <div className="text-sm text-accent-600">Total Questions</div>
                  <div className="text-xs text-accent-500 mt-1">
                    Across {userResults.length} competency areas
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-lg font-semibold text-gray-900">
                    {overallStats.overallGap > 0 ? '+' : ''}{overallStats.overallGap.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Overall Rating Gap</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {overallStats.overallGap > 1 ? 'Consider areas for growth' :
                     overallStats.overallGap < -1 ? 'You may be undervaluing yourself' :
                     'Well-aligned self-awareness'}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-lg font-semibold text-gray-900">
                    {overallStats.alignedPercentage.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Alignment Rate</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {overallStats.alignedPercentage > 70 ? 'Excellent self-awareness' :
                     overallStats.alignedPercentage > 50 ? 'Good alignment' :
                     'Room for improved self-awareness'}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-lg font-semibold text-gray-900">
                    {Math.max(overallStats.blindSpotPercentage, overallStats.hiddenStrengthPercentage).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {overallStats.blindSpotPercentage > overallStats.hiddenStrengthPercentage ? 'Blind Spots' : 'Hidden Strengths'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Primary development pattern
                  </div>
                </div>
              </div>

              {/* Highest and Lowest Rated Sections */}
              {highestSection && lowestSection && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                    <h3 className="font-medium text-success-800 mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-2" />
                      Highest Rated Area: {highestSection.sectionTitle}
                    </h3>
                    <div className="text-sm text-success-700">
                      <div className="flex justify-between mb-1">
                        <span>Reviewer Average:</span>
                        <span className="font-medium">{highestSection.reviewerAverage.toFixed(1)}/7</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Self Rating:</span>
                        <span className="font-medium">{highestSection.selfAverage.toFixed(1)}/7</span>
                      </div>
                      <div className="mt-2 text-xs">
                        This is your strongest competency area. Continue to leverage these skills.
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <h3 className="font-medium text-warning-800 mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Development Area: {lowestSection.sectionTitle}
                    </h3>
                    <div className="text-sm text-warning-700">
                      <div className="flex justify-between mb-1">
                        <span>Reviewer Average:</span>
                        <span className="font-medium">{lowestSection.reviewerAverage.toFixed(1)}/7</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Self Rating:</span>
                        <span className="font-medium">{lowestSection.selfAverage.toFixed(1)}/7</span>
                      </div>
                      <div className="mt-2 text-xs">
                        Focus on developing skills in this area for greatest improvement impact.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Competency Insights - if available */}
              {hasCompetencyData && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Competency Insights
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                      <h4 className="font-medium text-primary-800 mb-2">Top Competencies</h4>
                      <div className="space-y-2">
                        {overallStats.topCompetencies.map(comp => (
                          <div key={comp.competencyId} className="flex justify-between items-center">
                            <span className="text-sm text-primary-700">{comp.competencyName}</span>
                            <span className="font-medium text-primary-800">{comp.reviewerAverage.toFixed(1)}/7</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                      <h4 className="font-medium text-warning-800 mb-2">Development Competencies</h4>
                      <div className="space-y-2">
                        {overallStats.bottomCompetencies.map(comp => (
                          <div key={comp.competencyId} className="flex justify-between items-center">
                            <span className="text-sm text-warning-700">{comp.competencyName}</span>
                            <span className="font-medium text-warning-800">{comp.reviewerAverage.toFixed(1)}/7</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strengths and Development Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-success-600" />
                  Your Top Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overallStats.topStrengths.length > 0 ? (
                  <div className="space-y-3">
                    {overallStats.topStrengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-success-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{strength.text}</span>
                          <span className="font-medium text-success-700">{strength.avgReviewerRating.toFixed(1)}/7</span>
                        </div>
                        <div className="mt-2 text-sm text-success-700">
                          {strength.alignment === 'hidden_strength' ? (
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
                              <span>Hidden strength - others rate you higher than you rate yourself</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span>Recognized strength - you and others agree on this strength</span>
                            </div>
                          )}
                        </div>
                        {/* Show competencies if available */}
                        {strength.competencies && strength.competencies.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {strength.competencies.map(comp => (
                              <span key={comp.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700 border border-success-200">
                                <Tag className="h-3 w-3 mr-1" />
                                {comp.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    No strength data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Development Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-warning-600" />
                  Development Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overallStats.developmentAreas.length > 0 ? (
                  <div className="space-y-3">
                    {overallStats.developmentAreas.map((area, index) => (
                      <div key={index} className="p-3 bg-warning-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{area.text}</span>
                          <span className="font-medium text-warning-700">{area.avgReviewerRating.toFixed(1)}/7</span>
                        </div>
                        <div className="mt-2 text-sm text-warning-700">
                          {area.alignment === 'blind_spot' ? (
                            <div className="flex items-center">
                              <EyeOff className="h-4 w-4 mr-1" />
                              <span>Blind spot - you rate yourself higher than others do</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span>Recognized development area - you and others agree</span>
                            </div>
                          )}
                        </div>
                        {/* Show competencies if available */}
                        {area.competencies && area.competencies.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {area.competencies.map(comp => (
                              <span key={comp.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-700 border border-warning-200">
                                <Tag className="h-3 w-3 mr-1" />
                                {comp.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    No development area data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Items */}
          <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-primary-600" />
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-primary-600" />
                      Schedule Follow-ups
                    </h3>
                    <p className="text-sm text-gray-600">
                      Arrange 1-on-1 meetings with your manager to discuss feedback and create an action plan.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Schedule Meeting
                    </Button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-2 text-warning-600" />
                      Focus on Development
                    </h3>
                    <p className="text-sm text-gray-600">
                      Create a personal development plan focusing on your identified growth areas.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Create Plan
                    </Button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-2 text-success-600" />
                      Leverage Strengths
                    </h3>
                    <p className="text-sm text-gray-600">
                      Identify opportunities to apply your strengths to help others and take on new challenges.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Explore Opportunities
                    </Button>
                  </div>
                </div>
                
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                  <h3 className="font-medium text-primary-800 mb-2">Personal Development Resources</h3>
                  <div className="text-sm text-primary-700 space-y-2">
                    <p>• Access our learning library for courses related to your development areas</p>
                    <p>• Join the mentorship program to connect with experienced colleagues</p>
                    <p>• Schedule regular check-ins to track your progress</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {/* Detailed Results Tab */}
      {activeTab === 'detailed' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your assessment results...</p>
              </div>
            </div>
          ) : userResults.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart4 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Results Available Yet</h3>
                <p className="text-gray-500 mb-4">
                  You haven't completed any assessments yet, or your results are still being processed by reviewers.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                  <h4 className="font-medium text-gray-800 mb-2">What happens next?</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>1. Complete your assigned assessments</li>
                    <li>2. Wait for reviewers to complete their evaluations</li>
                    <li>3. Results will appear here automatically</li>
                    <li>4. You'll receive an email notification when ready</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Detailed Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Assessment Results</CardTitle>
                  <p className="text-sm text-gray-600">
                    Compare your self-ratings with aggregated feedback from your reviewers (1-7 scale)
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {userResults.map(result => (
                      <ResultChart key={result.sectionId} result={result} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
      
      {/* Competencies Tab */}
      {activeTab === 'competencies' && hasCompetencyData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Competency Analysis
              </CardTitle>
              <p className="text-sm text-gray-600">
                View your performance across key competency areas
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Competency Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overallStats?.competencyResults.map(comp => (
                    <div key={comp.competencyId} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 flex items-center">
                          <Tag className="h-4 w-4 text-primary-600 mr-2" />
                          {comp.competencyName}
                        </h3>
                        {getAlignmentBadge(comp.alignment)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Self:</span>
                          <span className="ml-1 font-medium text-primary-700">{comp.selfAverage.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Reviewers:</span>
                          <span className="ml-1 font-medium text-secondary-700">{comp.reviewerAverage.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gap:</span>
                          <span className={`ml-1 font-medium ${
                            comp.gap > 0 ? 'text-warning-600' : 
                            comp.gap < 0 ? 'text-primary-600' : 
                            'text-success-600'
                          }`}>
                            {comp.gap > 0 ? '+' : ''}{comp.gap.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Questions:</span>
                          <span className="ml-1 font-medium text-gray-700">{comp.questionCount}</span>
                        </div>
                      </div>
                      
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-600 rounded-full"
                          style={{ width: `${(comp.reviewerAverage / 7) * 100}%` }}
                        ></div>
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-500">
                        {comp.reviewerAverage >= 5.5 ? 'Strength area - continue to leverage' :
                         comp.reviewerAverage <= 4 ? 'Focus area for development' :
                         'Solid performance - maintain or improve'}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Competency Comparison Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Competency Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={overallStats?.competencyResults.map(comp => ({
                            name: comp.competencyName,
                            Self: comp.selfAverage,
                            'Reviewer Avg': comp.reviewerAverage,
                            Gap: comp.gap
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={70} 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            domain={[0, 7]} 
                            ticks={[0, 1, 2, 3, 4, 5, 6, 7]}
                          />
                          <Tooltip />
                          <Legend />
                          <ReferenceLine y={4} stroke="#CBD5E1" strokeDasharray="3 3" />
                          <Bar dataKey="Self" fill="#3B82F6" />
                          <Bar dataKey="Reviewer Avg" fill="#7E22CE" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Development Recommendations */}
                <Card className="bg-primary-50 border-primary-200">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="h-5 w-5 mr-2" />
                      Competency-Based Development Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Top Competency */}
                      {overallStats?.topCompetencies[0] && (
                        <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                          <h3 className="font-medium text-success-800 mb-2 flex items-center">
                            <Award className="h-4 w-4 mr-2" />
                            Leverage Your Strength: {overallStats.topCompetencies[0].competencyName}
                          </h3>
                          <p className="text-sm text-success-700">
                            This is your highest-rated competency. Consider how you can use this strength to:
                          </p>
                          <ul className="mt-2 text-sm text-success-700 list-disc list-inside">
                            <li>Mentor others who need development in this area</li>
                            <li>Take on projects or roles that showcase this competency</li>
                            <li>Share your approach and techniques with your team</li>
                          </ul>
                        </div>
                      )}
                      
                      {/* Bottom Competency */}
                      {overallStats?.bottomCompetencies[0] && (
                        <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                          <h3 className="font-medium text-warning-800 mb-2 flex items-center">
                            <Target className="h-4 w-4 mr-2" />
                            Development Focus: {overallStats.bottomCompetencies[0].competencyName}
                          </h3>
                          <p className="text-sm text-warning-700">
                            This competency has been identified as your primary development area. Consider these actions:
                          </p>
                          <ul className="mt-2 text-sm text-warning-700 list-disc list-inside">
                            <li>Seek training or courses specifically focused on this competency</li>
                            <li>Request more frequent feedback when practicing these skills</li>
                            <li>Find a mentor who excels in this area</li>
                            <li>Set specific, measurable goals to track your improvement</li>
                          </ul>
                        </div>
                      )}
                      
                      {/* Blind Spot Competency */}
                      {overallStats?.competencyResults.find(c => c.alignment === 'blind_spot') && (
                        <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg">
                          <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                            <EyeOff className="h-4 w-4 mr-2 text-warning-600" />
                            Address Blind Spots
                          </h3>
                          <p className="text-sm text-gray-700">
                            You've rated yourself higher than others in some competencies. To address this:
                          </p>
                          <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
                            <li>Seek specific examples and feedback</li>
                            <li>Practice active listening without defensiveness</li>
                            <li>Consider keeping a reflection journal to track your progress</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Development Plan Tab */}
      {activeTab === 'development' && overallStats && (
        <div className="space-y-6">
          {/* Development Plan Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-primary-600" />
                Personal Development Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                  <h3 className="font-medium text-primary-800 mb-3">How to Use This Plan</h3>
                  <div className="text-sm text-primary-700 space-y-2">
                    <p>1. Review your assessment results to understand your strengths and development areas</p>
                    <p>2. Set SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)</p>
                    <p>3. Identify specific actions and resources needed</p>
                    <p>4. Track your progress and adjust as needed</p>
                    <p>5. Schedule regular check-ins with your manager or mentor</p>
                  </div>
                </div>

                {/* Development Areas */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Development Areas</h3>
                  <div className="space-y-4">
                    {overallStats.developmentAreas.length > 0 ? (
                      overallStats.developmentAreas.map((area, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                          <div className="bg-warning-50 px-4 py-3 border-b border-warning-200">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium text-gray-900">{area.text}</h4>
                              <span className="text-sm font-medium text-warning-700">{area.avgReviewerRating.toFixed(1)}/7</span>
                            </div>
                            {/* Show competencies if available */}
                            {area.competencies && area.competencies.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {area.competencies.map(comp => (
                                  <span key={comp.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-700 border border-warning-200">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {comp.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</h5>
                              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                                <li>Take online courses or workshops focused on this skill</li>
                                <li>Seek mentorship from colleagues who excel in this area</li>
                                <li>Practice this skill in low-risk situations to build confidence</li>
                                <li>Request specific feedback on your progress in this area</li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Resources:</h5>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>• Internal training: "Mastering {area.text.split(' ')[0]}" workshop</p>
                                <p>• Recommended book: "The Complete Guide to {area.text.split(' ')[0]}"</p>
                                <p>• Online course: "{area.text} Fundamentals"</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        No development areas identified
                      </div>
                    )}
                  </div>
                </div>

                {/* Blind Spots */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <EyeOff className="h-5 w-5 mr-2 text-warning-600" />
                    Blind Spots to Address
                  </h3>
                  <div className="space-y-4">
                    {overallStats.blindSpots.length > 0 ? (
                      overallStats.blindSpots.map((area, index) => (
                        <div key={index} className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900">{area.text}</h4>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-warning-700">
                                <span>Self: {area.selfRating.toFixed(1)}</span>
                                <span className="mx-1">vs</span>
                                <span>Others: {area.avgReviewerRating.toFixed(1)}</span>
                              </div>
                              <span className="text-sm font-medium text-warning-700">Gap: +{area.gap.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-warning-700 mb-3">
                            You rated yourself higher in this area than your reviewers did. This may indicate a blind spot where your self-perception differs from how others see you.
                          </p>
                          <div className="text-sm text-warning-700">
                            <strong>Recommendation:</strong> Seek specific feedback on this area and be open to others' perspectives.
                          </div>
                          {/* Show competencies if available */}
                          {area.competencies && area.competencies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {area.competencies.map(comp => (
                                <span key={comp.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-700 border border-warning-200">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {comp.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        No significant blind spots identified
                      </div>
                    )}
                  </div>
                </div>

                {/* Strengths to Leverage */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-success-600" />
                    Strengths to Leverage
                  </h3>
                  <div className="space-y-4">
                    {overallStats.topStrengths.length > 0 ? (
                      overallStats.topStrengths.map((strength, index) => (
                        <div key={index} className="p-4 bg-success-50 border border-success-200 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-900">{strength.text}</h4>
                            <span className="text-sm font-medium text-success-700">{strength.avgReviewerRating.toFixed(1)}/7</span>
                          </div>
                          <p className="text-sm text-success-700 mb-3">
                            This is one of your highest-rated areas. Consider how you can leverage this strength to contribute more effectively to your team and organization.
                          </p>
                          <div className="text-sm text-success-700">
                            <strong>Recommendation:</strong> Look for opportunities to mentor others in this area or take on projects where this strength can create significant impact.
                          </div>
                          {/* Show competencies if available */}
                          {strength.competencies && strength.competencies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {strength.competencies.map(comp => (
                                <span key={comp.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700 border border-success-200">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {comp.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        No significant strengths identified
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Plan Template */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Action Plan</h3>
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-primary-50 px-4 py-3 border-b border-primary-200">
                      <h4 className="font-medium text-primary-800">Development Goals</h4>
                    </div>
                    <div className="p-4">
                      <div className="space-y-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">Goal 1: Improve {overallStats.developmentAreas[0]?.text || 'your lowest-rated area'}</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Specific Actions:</label>
                              <textarea 
                                className="w-full border border-gray-300 rounded-md p-2 text-sm" 
                                rows={3}
                                placeholder="List 2-3 specific actions you will take..."
                              ></textarea>
                            </div>
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Success Measures:</label>
                              <textarea 
                                className="w-full border border-gray-300 rounded-md p-2 text-sm" 
                                rows={3}
                                placeholder="How will you know you've improved?"
                              ></textarea>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Resources Needed:</label>
                              <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                placeholder="Training, mentoring, etc."
                              />
                            </div>
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Target Date:</label>
                              <input 
                                type="date" 
                                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <Button variant="outline" className="w-full">
                          + Add Another Goal
                        </Button>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <Button>
                          Save Development Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && !overallStats && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your assessment results...</p>
          </div>
        </div>
      )}
      
      {!isLoading && userResults.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart4 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Results Available Yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't completed any assessments yet, or your results are still being processed by reviewers.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
              <h4 className="font-medium text-gray-800 mb-2">What happens next?</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>1. Complete your assigned assessments</li>
                <li>2. Wait for reviewers to complete their evaluations</li>
                <li>3. Results will appear here automatically</li>
                <li>4. You'll receive an email notification when ready</li>
              </ul>
            </div>
            <Button
              variant="primary"
              className="mt-6"
              onClick={() => navigate('/my-assessments')}
            >
              Go to My Assessments
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserResults;