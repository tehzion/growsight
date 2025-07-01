import { useProfileStore } from '../stores/profileStore';
import { useResultStore } from '../stores/resultStore';
import SecureLogger from '../lib/secureLogger';

interface AssessmentInsight {
  competency: string;
  averageRating: number;
  selfRating: number;
  reviewerRating: number;
  alignment: 'aligned' | 'blind_spot' | 'hidden_strength' | 'gap';
  strength: 'low' | 'moderate' | 'high' | 'exceptional';
}

interface OrganizationStyle {
  leadership: string;
  communication: string;
  collaboration: string;
  innovation: string;
  performance: string;
}

export class AssessmentTaggingService {
  private static instance: AssessmentTaggingService | null = null;
  
  static getInstance(): AssessmentTaggingService {
    if (!this.instance) {
      this.instance = new AssessmentTaggingService();
    }
    return this.instance;
  }

  /**
   * Generate profile tags based on assessment results
   */
  async generateProfileTagsFromAssessment(userId: string, assessmentId: string, currentUserId?: string): Promise<void> {
    try {
      const { results } = useResultStore.getState();
      const { addProfileTag } = useProfileStore.getState();
      
      const userResults = results[userId] || [];
      const assessmentResult = userResults.find(r => r.assessmentId === assessmentId);
      
      if (!assessmentResult) {
        SecureLogger.warn('No assessment results found for tagging', { userId, assessmentId });
        return;
      }

      // Extract insights from assessment results
      const insights = this.extractAssessmentInsights(assessmentResult);
      
      // Generate competency-based tags
      for (const insight of insights) {
        await this.createCompetencyTag(userId, insight, currentUserId);
      }

      // Generate behavioral style tags
      await this.createBehavioralStyleTags(userId, insights, currentUserId);
      
      // Generate development area tags
      await this.createDevelopmentAreaTags(userId, insights, currentUserId);

      SecureLogger.info('Profile tags generated from assessment', { 
        userId, 
        assessmentId, 
        tagsGenerated: insights.length * 3 
      });

    } catch (error) {
      SecureLogger.error('Failed to generate profile tags from assessment', error);
      throw error;
    }
  }

  /**
   * Generate organization-wide style profile based on assessment data
   */
  async generateOrganizationStyleProfile(organizationId: string, currentUserId?: string): Promise<OrganizationStyle> {
    try {
      const { results } = useResultStore.getState();
      const { addProfileTag } = useProfileStore.getState();
      
      // Aggregate all user results for the organization
      const organizationResults = Object.values(results).flat()
        .filter(result => result.organizationId === organizationId);

      if (organizationResults.length === 0) {
        throw new Error('No assessment results found for organization');
      }

      // Calculate organization-wide competency averages
      const competencyAverages = this.calculateOrganizationCompetencyAverages(organizationResults);
      
      // Determine organization style characteristics
      const orgStyle: OrganizationStyle = {
        leadership: this.determineLeadershipStyle(competencyAverages),
        communication: this.determineCommunicationStyle(competencyAverages),
        collaboration: this.determineCollaborationStyle(competencyAverages),
        innovation: this.determineInnovationStyle(competencyAverages),
        performance: this.determinePerformanceStyle(competencyAverages)
      };

      // Create organization-level tags for each user
      const userIds = [...new Set(organizationResults.map(r => r.userId))];
      for (const userId of userIds) {
        await this.createOrganizationStyleTags(userId, orgStyle, currentUserId);
      }

      SecureLogger.info('Organization style profile generated', { 
        organizationId, 
        style: orgStyle,
        usersTagged: userIds.length 
      });

      return orgStyle;

    } catch (error) {
      SecureLogger.error('Failed to generate organization style profile', error);
      throw error;
    }
  }

  /**
   * Extract insights from assessment results
   */
  private extractAssessmentInsights(assessmentResult: any): AssessmentInsight[] {
    const insights: AssessmentInsight[] = [];

    assessmentResult.questions.forEach((question: any) => {
      const insight: AssessmentInsight = {
        competency: question.competency || 'General',
        averageRating: (question.selfRating + question.avgReviewerRating) / 2,
        selfRating: question.selfRating,
        reviewerRating: question.avgReviewerRating,
        alignment: question.alignment || 'aligned',
        strength: this.categorizeStrength(question.avgReviewerRating)
      };

      insights.push(insight);
    });

    return insights;
  }

  /**
   * Create competency-based profile tags
   */
  private async createCompetencyTag(userId: string, insight: AssessmentInsight, currentUserId?: string): Promise<void> {
    const { addProfileTag } = useProfileStore.getState();
    
    const tagValue = {
      averageRating: insight.averageRating,
      selfRating: insight.selfRating,
      reviewerRating: insight.reviewerRating,
      alignment: insight.alignment,
      strength: insight.strength,
      lastAssessed: new Date().toISOString()
    };

    await addProfileTag(
      userId,
      insight.competency.toLowerCase().replace(/\s+/g, '_'),
      'competency',
      tagValue,
      currentUserId
    );
  }

  /**
   * Create behavioral style tags based on assessment patterns
   */
  private async createBehavioralStyleTags(userId: string, insights: AssessmentInsight[], currentUserId?: string): Promise<void> {
    const { addProfileTag } = useProfileStore.getState();
    
    // Analyze patterns in insights
    const leadershipInsights = insights.filter(i => 
      i.competency.toLowerCase().includes('leadership') || 
      i.competency.toLowerCase().includes('influence')
    );
    
    const communicationInsights = insights.filter(i => 
      i.competency.toLowerCase().includes('communication') || 
      i.competency.toLowerCase().includes('collaboration')
    );

    // Leadership style
    if (leadershipInsights.length > 0) {
      const avgLeadershipRating = leadershipInsights.reduce((sum, i) => sum + i.averageRating, 0) / leadershipInsights.length;
      const leadershipStyle = this.determineIndividualLeadershipStyle(leadershipInsights);
      
      await addProfileTag(
        userId,
        'leadership_style',
        'behavior',
        {
          style: leadershipStyle,
          averageRating: avgLeadershipRating,
          assessmentBased: true
        },
        currentUserId
      );
    }

    // Communication style
    if (communicationInsights.length > 0) {
      const avgCommunicationRating = communicationInsights.reduce((sum, i) => sum + i.averageRating, 0) / communicationInsights.length;
      const communicationStyle = this.determineIndividualCommunicationStyle(communicationInsights);
      
      await addProfileTag(
        userId,
        'communication_style',
        'behavior',
        {
          style: communicationStyle,
          averageRating: avgCommunicationRating,
          assessmentBased: true
        },
        currentUserId
      );
    }
  }

  /**
   * Create development area tags
   */
  private async createDevelopmentAreaTags(userId: string, insights: AssessmentInsight[], currentUserId?: string): Promise<void> {
    const { addProfileTag } = useProfileStore.getState();
    
    // Find areas with lowest ratings (development opportunities)
    const developmentAreas = insights
      .filter(i => i.averageRating < 3.5)
      .sort((a, b) => a.averageRating - b.averageRating)
      .slice(0, 3); // Top 3 development areas

    for (const area of developmentAreas) {
      await addProfileTag(
        userId,
        `development_${area.competency.toLowerCase().replace(/\s+/g, '_')}`,
        'development',
        {
          competency: area.competency,
          currentRating: area.averageRating,
          priority: area.averageRating < 2.5 ? 'high' : 'medium',
          recommendedActions: this.getRecommendedActions(area.competency, area.averageRating)
        },
        currentUserId
      );
    }

    // Find strengths (high-performing areas)
    const strengths = insights
      .filter(i => i.averageRating >= 4.0)
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 3); // Top 3 strengths

    for (const strength of strengths) {
      await addProfileTag(
        userId,
        `strength_${strength.competency.toLowerCase().replace(/\s+/g, '_')}`,
        'strength',
        {
          competency: strength.competency,
          rating: strength.averageRating,
          level: strength.strength,
          mentorshipPotential: strength.averageRating >= 4.5
        },
        currentUserId
      );
    }
  }

  /**
   * Create organization style tags for individual users
   */
  private async createOrganizationStyleTags(userId: string, orgStyle: OrganizationStyle, currentUserId?: string): Promise<void> {
    const { addProfileTag } = useProfileStore.getState();
    
    await addProfileTag(
      userId,
      'organization_culture_fit',
      'organizational',
      {
        leadershipAlignment: orgStyle.leadership,
        communicationAlignment: orgStyle.communication,
        collaborationAlignment: orgStyle.collaboration,
        innovationAlignment: orgStyle.innovation,
        performanceAlignment: orgStyle.performance,
        generatedAt: new Date().toISOString()
      },
      currentUserId
    );
  }

  /**
   * Helper methods for style determination
   */
  private categorizeStrength(rating: number): 'low' | 'moderate' | 'high' | 'exceptional' {
    if (rating >= 4.5) return 'exceptional';
    if (rating >= 3.5) return 'high';
    if (rating >= 2.5) return 'moderate';
    return 'low';
  }

  private determineIndividualLeadershipStyle(insights: AssessmentInsight[]): string {
    const avgRating = insights.reduce((sum, i) => sum + i.averageRating, 0) / insights.length;
    const hasBlindSpots = insights.some(i => i.alignment === 'blind_spot');
    
    if (avgRating >= 4.0 && !hasBlindSpots) return 'transformational';
    if (avgRating >= 3.5) return 'collaborative';
    if (avgRating >= 2.5) return 'developing';
    return 'emerging';
  }

  private determineIndividualCommunicationStyle(insights: AssessmentInsight[]): string {
    const avgRating = insights.reduce((sum, i) => sum + i.averageRating, 0) / insights.length;
    
    if (avgRating >= 4.0) return 'influential';
    if (avgRating >= 3.5) return 'effective';
    if (avgRating >= 2.5) return 'developing';
    return 'building';
  }

  private calculateOrganizationCompetencyAverages(results: any[]): Record<string, number> {
    const competencyData: Record<string, { total: number; count: number }> = {};
    
    results.forEach(result => {
      result.questions.forEach((question: any) => {
        const competency = question.competency || 'General';
        if (!competencyData[competency]) {
          competencyData[competency] = { total: 0, count: 0 };
        }
        competencyData[competency].total += question.avgReviewerRating;
        competencyData[competency].count += 1;
      });
    });

    const averages: Record<string, number> = {};
    Object.entries(competencyData).forEach(([competency, data]) => {
      averages[competency] = data.total / data.count;
    });

    return averages;
  }

  private determineLeadershipStyle(competencyAverages: Record<string, number>): string {
    const leadershipRating = competencyAverages['Leadership'] || 3.0;
    if (leadershipRating >= 4.0) return 'high_performance';
    if (leadershipRating >= 3.5) return 'collaborative';
    return 'developing';
  }

  private determineCommunicationStyle(competencyAverages: Record<string, number>): string {
    const commRating = competencyAverages['Communication'] || 3.0;
    if (commRating >= 4.0) return 'open_transparent';
    if (commRating >= 3.5) return 'structured';
    return 'improving';
  }

  private determineCollaborationStyle(competencyAverages: Record<string, number>): string {
    const collabRating = competencyAverages['Collaboration'] || 3.0;
    if (collabRating >= 4.0) return 'highly_collaborative';
    if (collabRating >= 3.5) return 'team_oriented';
    return 'individual_focused';
  }

  private determineInnovationStyle(competencyAverages: Record<string, number>): string {
    const innovationRating = competencyAverages['Innovation'] || 3.0;
    if (innovationRating >= 4.0) return 'innovation_driven';
    if (innovationRating >= 3.5) return 'adaptive';
    return 'traditional';
  }

  private determinePerformanceStyle(competencyAverages: Record<string, number>): string {
    const avgRating = Object.values(competencyAverages).reduce((sum, rating) => sum + rating, 0) / Object.values(competencyAverages).length;
    if (avgRating >= 4.0) return 'excellence_focused';
    if (avgRating >= 3.5) return 'results_oriented';
    return 'growth_focused';
  }

  private getRecommendedActions(competency: string, rating: number): string[] {
    const actions: Record<string, string[]> = {
      'Leadership': [
        'Attend leadership development workshops',
        'Seek mentoring from senior leaders',
        'Practice delegation skills',
        'Join leadership training programs'
      ],
      'Communication': [
        'Enroll in communication skills training',
        'Practice active listening techniques',
        'Join public speaking groups',
        'Seek feedback on communication style'
      ],
      'Collaboration': [
        'Participate in cross-functional projects',
        'Develop conflict resolution skills',
        'Practice team facilitation',
        'Build relationship management skills'
      ]
    };

    return actions[competency] || [
      'Seek targeted skill development',
      'Find learning opportunities',
      'Request feedback from peers',
      'Set specific improvement goals'
    ];
  }
}

export const assessmentTaggingService = AssessmentTaggingService.getInstance();