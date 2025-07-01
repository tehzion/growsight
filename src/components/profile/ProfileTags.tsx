import React from 'react';
import { Tag, Award, Target, Zap, TrendingUp, TrendingDown, Star, Lightbulb, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface ProfileTag {
  id: string;
  name: string;
  category: 'strength' | 'development' | 'competency' | 'achievement' | 'insight';
  color: string;
  icon: React.ReactNode;
  description: string;
  score?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface ProfileTagsProps {
  assessmentResults: any;
  className?: string;
}

const ProfileTags: React.FC<ProfileTagsProps> = ({ assessmentResults, className = '' }) => {
  // Generate tags based on assessment results
  const generateTags = (): ProfileTag[] => {
    const tags: ProfileTag[] = [];
    
    if (!assessmentResults || !assessmentResults.competencyResults) {
      return tags;
    }

    const { competencyResults, topStrengths, developmentAreas, blindSpots, hiddenStrengths } = assessmentResults;

    // Top competency tags
    if (competencyResults && competencyResults.length > 0) {
      const topCompetency = competencyResults[0];
      if (topCompetency.reviewerAverage >= 5.0) {
        tags.push({
          id: 'top-competency',
          name: `${topCompetency.competencyName} Expert`,
          category: 'competency',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Award className="h-4 w-4" />,
          description: `Highest rated competency with ${topCompetency.reviewerAverage.toFixed(1)}/7.0 average`,
          score: topCompetency.reviewerAverage
        });
      }
    }

    // Strength tags
    if (topStrengths && topStrengths.length > 0) {
      const avgStrengthRating = topStrengths.reduce((sum: number, q: any) => sum + q.avgReviewerRating, 0) / topStrengths.length;
      tags.push({
        id: 'strength-leader',
        name: 'Strength Leader',
        category: 'strength',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <Star className="h-4 w-4" />,
        description: `Consistently high performance with ${avgStrengthRating.toFixed(1)}/7.0 average`,
        score: avgStrengthRating,
        trend: 'up'
      });
    }

    // Development area tags
    if (developmentAreas && developmentAreas.length > 0) {
      const avgDevRating = developmentAreas.reduce((sum: number, q: any) => sum + q.avgReviewerRating, 0) / developmentAreas.length;
      tags.push({
        id: 'growth-focused',
        name: 'Growth Focused',
        category: 'development',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Target className="h-4 w-4" />,
        description: `Identified ${developmentAreas.length} areas for development`,
        score: avgDevRating,
        trend: 'up'
      });
    }

    // Blind spot tags
    if (blindSpots && blindSpots.length > 0) {
      tags.push({
        id: 'self-awareness',
        name: 'Self-Awareness Builder',
        category: 'insight',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <EyeOff className="h-4 w-4" />,
        description: `${blindSpots.length} blind spots identified for self-reflection`,
        score: blindSpots.length
      });
    }

    // Hidden strength tags
    if (hiddenStrengths && hiddenStrengths.length > 0) {
      tags.push({
        id: 'hidden-potential',
        name: 'Hidden Potential',
        category: 'strength',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Lightbulb className="h-4 w-4" />,
        description: `${hiddenStrengths.length} strengths underappreciated by self`,
        score: hiddenStrengths.length
      });
    }

    // Overall performance tags
    if (assessmentResults.avgReviewerRating) {
      const avgRating = assessmentResults.avgReviewerRating;
      if (avgRating >= 6.0) {
        tags.push({
          id: 'high-performer',
          name: 'High Performer',
          category: 'achievement',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <TrendingUp className="h-4 w-4" />,
          description: `Exceptional overall performance with ${avgRating.toFixed(1)}/7.0 average`,
          score: avgRating,
          trend: 'up'
        });
      } else if (avgRating >= 5.0) {
        tags.push({
          id: 'solid-performer',
          name: 'Solid Performer',
          category: 'achievement',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Target className="h-4 w-4" />,
          description: `Consistent performance with ${avgRating.toFixed(1)}/7.0 average`,
          score: avgRating,
          trend: 'stable'
        });
      }
    }

    // Alignment tags
    if (assessmentResults.alignedPercentage) {
      const alignedPct = assessmentResults.alignedPercentage;
      if (alignedPct >= 80) {
        tags.push({
          id: 'self-aware',
          name: 'Self-Aware',
          category: 'insight',
          color: 'bg-teal-100 text-teal-800 border-teal-200',
          icon: <Eye className="h-4 w-4" />,
          description: `${alignedPct.toFixed(0)}% alignment between self and reviewer ratings`,
          score: alignedPct,
          trend: 'up'
        });
      }
    }

    return tags;
  };

  const tags = generateTags();

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      case 'stable':
        return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
      default:
        return null;
    }
  };

  if (tags.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Profile Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Complete assessments to earn profile tags based on your performance.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          Profile Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${tag.color}`}
            >
              <div className="flex items-center space-x-2">
                {tag.icon}
                <div>
                  <h4 className="font-medium text-sm">{tag.name}</h4>
                  <p className="text-xs opacity-75">{tag.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {tag.score && (
                  <span className="text-xs font-medium">
                    {tag.score.toFixed(1)}
                  </span>
                )}
                {getTrendIcon(tag.trend)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Tags are automatically generated based on your assessment results and performance patterns.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileTags; 