import { useProfileStore } from '../stores/profileStore';
import SecureLogger from '../lib/secureLogger';
import AccessControl from '../lib/accessControl';

/**
 * Behavior Tracking Service
 * Provides automated behavior tracking for various user actions
 */
export class BehaviorTrackingService {
  
  /**
   * Track assessment completion behavior
   */
  static async trackAssessmentCompletion(
    userId: string,
    assessmentId: string,
    completionData: {
      completionTime: number;
      totalQuestions: number;
      completedQuestions: number;
      averageRating?: number;
    },
    currentUserId?: string
  ): Promise<void> {
    try {
      const profileStore = useProfileStore.getState();
      
      await profileStore.trackBehavior(
        userId,
        'assessment_completion',
        {
          assessmentId,
          completionTime: completionData.completionTime,
          totalQuestions: completionData.totalQuestions,
          completedQuestions: completionData.completedQuestions,
          averageRating: completionData.averageRating,
          completionRate: (completionData.completedQuestions / completionData.totalQuestions) * 100
        },
        `Assessment: ${assessmentId}`,
        currentUserId
      );

      // Add automatic performance tag based on completion
      if (completionData.completedQuestions === completionData.totalQuestions) {
        await profileStore.addProfileTag(
          userId,
          'assessment_completer',
          'performance',
          {
            lastCompletion: new Date().toISOString(),
            completionCount: 1 // This would need to be incremented based on existing data
          },
          currentUserId
        );
      }

      SecureLogger.dev('Assessment completion tracked', 'behavior-tracking');
    } catch (error) {
      SecureLogger.error('Failed to track assessment completion', error);
    }
  }

  /**
   * Track skill demonstration behavior
   */
  static async trackSkillDemonstration(
    userId: string,
    skill: string,
    rating: number,
    feedback?: string,
    context?: string,
    recordedById?: string
  ): Promise<void> {
    try {
      const profileStore = useProfileStore.getState();
      
      await profileStore.trackBehavior(
        userId,
        'skill_demonstration',
        {
          skill,
          rating,
          feedback,
          demonstrationDate: new Date().toISOString()
        },
        context,
        recordedById
      );

      // Add or update skill tag
      await profileStore.addProfileTag(
        userId,
        skill,
        'skill',
        {
          currentRating: rating,
          lastDemonstration: new Date().toISOString(),
          feedback
        },
        recordedById
      );

      SecureLogger.dev('Skill demonstration tracked', 'behavior-tracking');
    } catch (error) {
      SecureLogger.error('Failed to track skill demonstration', error);
    }
  }

  /**
   * Track leadership behavior
   */
  static async trackLeadershipBehavior(
    userId: string,
    behaviorType: 'delegation' | 'decision_making' | 'team_building' | 'coaching' | 'conflict_resolution',
    effectivenessRating: number,
    context?: string,
    observerNotes?: string,
    recordedById?: string
  ): Promise<void> {
    try {
      const profileStore = useProfileStore.getState();
      
      await profileStore.trackBehavior(
        userId,
        'leadership_behavior',
        {
          behaviorType,
          effectivenessRating,
          observerNotes,
          observationDate: new Date().toISOString()
        },
        context,
        recordedById
      );

      // Update leadership profile tag
      await profileStore.addProfileTag(
        userId,
        'leadership_style',
        'behavior',
        {
          [behaviorType]: {
            rating: effectivenessRating,
            lastObserved: new Date().toISOString(),
            notes: observerNotes
          }
        },
        recordedById
      );

      SecureLogger.dev('Leadership behavior tracked', 'behavior-tracking');
    } catch (error) {
      SecureLogger.error('Failed to track leadership behavior', error);
    }
  }

  /**
   * Track collaboration behavior
   */
  static async trackCollaboration(
    userId: string,
    collaborationType: 'team_work' | 'cross_functional' | 'mentoring' | 'knowledge_sharing',
    participants: string[],
    effectivenessRating: number,
    outcomes?: string,
    context?: string,
    recordedById?: string
  ): Promise<void> {
    try {
      const profileStore = useProfileStore.getState();
      
      await profileStore.trackBehavior(
        userId,
        'collaboration',
        {
          collaborationType,
          participants,
          effectivenessRating,
          outcomes,
          collaborationDate: new Date().toISOString()
        },
        context,
        recordedById
      );

      // Update collaboration tag
      await profileStore.addProfileTag(
        userId,
        'collaboration_style',
        'behavior',
        {
          preferredType: collaborationType,
          averageRating: effectivenessRating, // This should be calculated from historical data
          lastCollaboration: new Date().toISOString()
        },
        recordedById
      );

      SecureLogger.dev('Collaboration tracked', 'behavior-tracking');
    } catch (error) {
      SecureLogger.error('Failed to track collaboration', error);
    }
  }

  /**
   * Track goal achievement
   */
  static async trackGoalAchievement(
    userId: string,
    goalId: string,
    goalType: string,
    achievementLevel: number, // 0-100 percentage
    targetDate: string,
    actualDate: string,
    context?: string,
    recordedById?: string
  ): Promise<void> {
    try {
      const profileStore = useProfileStore.getState();
      
      const targetTime = new Date(targetDate).getTime();
      const actualTime = new Date(actualDate).getTime();
      const timeDifference = actualTime - targetTime;
      const isOnTime = timeDifference <= 0;
      
      await profileStore.trackBehavior(
        userId,
        'goal_achievement',
        {
          goalId,
          goalType,
          achievementLevel,
          targetDate,
          actualDate,
          timeDifference,
          isOnTime,
          achievementDate: new Date().toISOString()
        },
        context,
        recordedById
      );

      // Update performance tag
      await profileStore.addProfileTag(
        userId,
        'goal_performer',
        'performance',
        {
          lastGoalAchievement: achievementLevel,
          onTimeDelivery: isOnTime,
          goalType,
          lastAchievementDate: new Date().toISOString()
        },
        recordedById
      );

      SecureLogger.dev('Goal achievement tracked', 'behavior-tracking');
    } catch (error) {
      SecureLogger.error('Failed to track goal achievement', error);
    }
  }

  /**
   * Generate behavior insights for a user
   */
  static async generateBehaviorInsights(userId: string, currentUserId?: string): Promise<{
    strengths: string[];
    developmentAreas: string[];
    trends: Record<string, unknown>;
    recommendations: string[];
  }> {
    try {
      // Validate access
      if (currentUserId && !AccessControl.validateUserAccess({ id: currentUserId } as any, userId, 'behaviorInsights', true)) {
        throw new Error('Access denied to behavior insights');
      }

      const profileStore = useProfileStore.getState();
      await profileStore.fetchUserBehaviors(userId, currentUserId);
      await profileStore.fetchProfileTags(userId, currentUserId);

      const { behaviors, profileTags } = profileStore;

      // Analyze behaviors and tags to generate insights
      const skillTags = profileTags.filter(tag => tag.tagCategory === 'skill');
      const behaviorTags = profileTags.filter(tag => tag.tagCategory === 'behavior');
      const performanceTags = profileTags.filter(tag => tag.tagCategory === 'performance');

      // Identify strengths (skills/behaviors with high ratings)
      const strengths = [
        ...skillTags
          .filter(tag => (tag.tagValue.currentRating as number) >= 4.0)
          .map(tag => tag.tagName),
        ...behaviorTags
          .filter(tag => (tag.tagValue.rating as number) >= 4.0)
          .map(tag => tag.tagName)
      ];

      // Identify development areas (skills/behaviors with lower ratings)
      const developmentAreas = [
        ...skillTags
          .filter(tag => (tag.tagValue.currentRating as number) < 3.5)
          .map(tag => tag.tagName),
        ...behaviorTags
          .filter(tag => (tag.tagValue.rating as number) < 3.5)
          .map(tag => tag.tagName)
      ];

      // Analyze trends from recent behaviors
      const recentBehaviors = behaviors.filter(
        behavior => new Date(behavior.recordedAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      );

      const trends = {
        assessmentCompletions: recentBehaviors.filter(b => b.behaviorType === 'assessment_completion').length,
        skillDemonstrations: recentBehaviors.filter(b => b.behaviorType === 'skill_demonstration').length,
        leadershipActivities: recentBehaviors.filter(b => b.behaviorType === 'leadership_behavior').length,
        collaborationInstances: recentBehaviors.filter(b => b.behaviorType === 'collaboration').length,
        goalAchievements: recentBehaviors.filter(b => b.behaviorType === 'goal_achievement').length
      };

      // Generate recommendations based on analysis
      const recommendations = [];
      
      if (developmentAreas.includes('communication')) {
        recommendations.push('Consider enrolling in a communication skills workshop');
      }
      
      if (trends.assessmentCompletions === 0) {
        recommendations.push('Complete pending assessments to get better insights');
      }
      
      if (trends.leadershipActivities < 2) {
        recommendations.push('Seek more leadership opportunities to develop management skills');
      }
      
      if (trends.collaborationInstances < 3) {
        recommendations.push('Participate in more cross-functional projects');
      }

      return {
        strengths,
        developmentAreas,
        trends,
        recommendations
      };

    } catch (error) {
      SecureLogger.error('Failed to generate behavior insights', error);
      return {
        strengths: [],
        developmentAreas: [],
        trends: {},
        recommendations: ['Unable to generate insights at this time']
      };
    }
  }

  /**
   * Validate organization access for behavior tracking
   */
  static validateAccess(currentUserId: string, targetUserId: string, organizationId: string): boolean {
    return AccessControl.validateOrganizationAccess(
      { id: currentUserId, organizationId } as any,
      organizationId,
      'behavior-tracking'
    );
  }
}

export default BehaviorTrackingService;