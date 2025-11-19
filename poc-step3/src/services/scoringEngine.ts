/**
 * Scoring engine for evaluating PBI quality
 */

import {
  ExtractedPBI,
  ScoredPBI,
  PBIConfidenceScores,
  ReadinessLevel,
  ClaudeAnalysis,
} from '../models/types';
import { ClaudeAPIClient } from './claudeClient';
import { buildScoringPrompt } from '../prompts/scoringPrompt';

export class ScoringEngine {
  constructor(private claudeClient: ClaudeAPIClient) {}

  /**
   * Score a single PBI
   */
  async scorePBI(pbi: ExtractedPBI): Promise<ScoredPBI> {
    try {
      console.log(`Scoring PBI: ${pbi.id} - ${pbi.title}`);

      // Build the prompt
      const prompt = buildScoringPrompt(pbi);

      // Get analysis from Claude
      const analysis = await this.claudeClient.analyzeWithPrompt(prompt);

      // Convert to confidence scores format
      const confidenceScores = this.convertToConfidenceScores(analysis);

      // Calculate overall readiness
      const overall_readiness = this.calculateReadiness(confidenceScores, pbi);

      // Count issues
      const { blocking, warnings } = this.countIssues(confidenceScores);

      return {
        id: pbi.id,
        title: pbi.title,
        confidenceScores,
        overall_readiness,
        blocking_issues: blocking,
        warning_issues: warnings,
      };
    } catch (error) {
      console.error(`Error scoring PBI ${pbi.id}:`, error);
      // Return a default low-confidence score if analysis fails
      return this.createFailedScore(pbi, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Score multiple PBIs
   */
  async scorePBIs(pbis: ExtractedPBI[]): Promise<ScoredPBI[]> {
    const scoredPBIs: ScoredPBI[] = [];

    // Process PBIs sequentially to avoid rate limits
    // In production, could implement batching with rate limiting
    for (const pbi of pbis) {
      try {
        const scored = await this.scorePBI(pbi);
        scoredPBIs.push(scored);

        // Small delay between API calls to avoid rate limits
        if (pbis.indexOf(pbi) < pbis.length - 1) {
          await this.delay(1000); // 1 second delay
        }
      } catch (error) {
        console.error(`Failed to score PBI ${pbi.id}:`, error);
        scoredPBIs.push(
          this.createFailedScore(pbi, error instanceof Error ? error.message : 'Unknown error')
        );
      }
    }

    return scoredPBIs;
  }

  /**
   * Convert Claude analysis to confidence scores format
   */
  private convertToConfidenceScores(analysis: ClaudeAnalysis): PBIConfidenceScores {
    return {
      isCompletePBI: analysis.scores.isCompletePBI,
      hasAllRequirements: analysis.scores.hasAllRequirements,
      isRefinementComplete: analysis.scores.isRefinementComplete,
      hasAcceptanceCriteria: analysis.scores.hasAcceptanceCriteria,
      hasClearScope: analysis.scores.hasClearScope,
      isEstimable: analysis.scores.isEstimable,
    };
  }

  /**
   * Calculate overall readiness based on scores
   */
  private calculateReadiness(
    scores: PBIConfidenceScores,
    pbi: ExtractedPBI
  ): ReadinessLevel {
    // Check if explicitly deferred or future phase
    if (pbi.phase === 'phase_2' || pbi.phase === 'future') {
      return 'FUTURE_PHASE';
    }

    // Calculate average score and check thresholds
    const allScores = [
      scores.isCompletePBI.score,
      scores.hasAllRequirements.score,
      scores.isRefinementComplete.score,
      scores.hasAcceptanceCriteria.score,
      scores.hasClearScope.score,
      scores.isEstimable.score,
    ];

    const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    const minScore = Math.min(...allScores);
    const scoresBelow50 = allScores.filter((s) => s < 50).length;

    // Decision logic
    if (minScore >= 70 && avgScore >= 75) {
      return 'READY';
    } else if (minScore >= 60 && avgScore >= 65 && scoresBelow50 === 0) {
      return 'MOSTLY_READY';
    } else if (scoresBelow50 >= 3) {
      return 'NOT_READY';
    } else if (avgScore < 50) {
      return 'DEFERRED';
    } else {
      return 'NOT_READY';
    }
  }

  /**
   * Count blocking and warning issues based on scores
   */
  private countIssues(scores: PBIConfidenceScores): { blocking: number; warnings: number } {
    let blocking = 0;
    let warnings = 0;

    const dimensions = [
      scores.isCompletePBI,
      scores.hasAllRequirements,
      scores.isRefinementComplete,
      scores.hasAcceptanceCriteria,
      scores.hasClearScope,
      scores.isEstimable,
    ];

    for (const dimension of dimensions) {
      if (dimension.score < 40) {
        blocking++;
      } else if (dimension.score < 60) {
        warnings++;
      }
    }

    return { blocking, warnings };
  }

  /**
   * Create a failed score for error cases
   */
  private createFailedScore(pbi: ExtractedPBI, errorMessage: string): ScoredPBI {
    const defaultScore = {
      score: 0,
      reasoning: `Analysis failed: ${errorMessage}`,
      evidence: ['Unable to analyze PBI due to error'],
    };

    return {
      id: pbi.id,
      title: pbi.title,
      confidenceScores: {
        isCompletePBI: defaultScore,
        hasAllRequirements: defaultScore,
        isRefinementComplete: defaultScore,
        hasAcceptanceCriteria: defaultScore,
        hasClearScope: defaultScore,
        isEstimable: defaultScore,
      },
      overall_readiness: 'NOT_READY',
      blocking_issues: 6,
      warning_issues: 0,
    };
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}