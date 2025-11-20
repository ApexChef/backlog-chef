/**
 * Step 3: Score Confidence
 *
 * Evaluates each PBI for quality and completeness:
 * - Overall confidence score
 * - Completeness assessment
 * - Clarity evaluation
 * - Actionability check
 * - Testability assessment
 * - Identifies missing elements and strengths
 */

import { BaseStep } from './base-step';
import { ModelRouter } from '../../ai/router';
import { PipelineContext, ScoreConfidenceResult, ConfidenceScore } from '../types/pipeline-types';

export class ScoreConfidenceStep extends BaseStep {
  readonly name = 'score_confidence';
  readonly description = 'Evaluate PBI quality and completeness';

  protected async executeStep(
    context: PipelineContext,
    router: ModelRouter
  ): Promise<PipelineContext> {
    if (!context.extractedCandidates) {
      throw new Error('No extracted candidates found');
    }

    const scoredPBIs: ScoreConfidenceResult['scored_pbis'] = [];

    // Score each PBI
    for (const pbi of context.extractedCandidates.candidates) {
      console.log(`[${this.name}] Scoring ${pbi.id}...`);

      const systemPrompt = `You are an expert Scrum coach evaluating Product Backlog Item (PBI) quality.

Your task is to assess a PBI across multiple dimensions and provide detailed scoring:

**Scoring Dimensions (0-100 scale):**
1. **Completeness** - Does it have all necessary information (title, description, acceptance criteria)?
2. **Clarity** - Is it clear and unambiguous? Can team understand what to build?
3. **Actionability** - Is it specific enough for team to start work immediately?
4. **Testability** - Can success be objectively measured/tested?

**Overall Score Calculation:**
- Average the 4 dimension scores
- Consider: Is this PBI ready for a sprint? What's missing?

Respond ONLY with valid JSON in this exact format:
{
  "overall_score": 85,
  "completeness": 90,
  "clarity": 85,
  "actionability": 80,
  "testability": 85,
  "missing_elements": ["Clear success metrics", "Performance requirements"],
  "strengths": ["Well-defined user story", "Clear acceptance criteria"],
  "concerns": ["Scope might be too large", "Unclear dependencies"]
}`;

      const userPrompt = `Evaluate this PBI:

**ID:** ${pbi.id}
**Title:** ${pbi.title}
**Description:** ${pbi.description}
**Acceptance Criteria:** ${pbi.acceptance_criteria?.join(', ') || 'None provided'}
**Notes:** ${pbi.notes?.join(', ') || 'None'}

Respond with JSON only.`;

      const responseContent = await this.makeAIRequest(
        router,
        this.name,
        systemPrompt,
        userPrompt,
        context
      );

      const scores = this.parseJSONResponse<ConfidenceScore>(
        responseContent,
        `Score Confidence for ${pbi.id}`
      );

      // Validate scores
      this.validateScores(scores);

      scoredPBIs.push({ pbi, scores });

      console.log(`[${this.name}]   Score: ${scores.overall_score}/100 (${this.getScoreLabel(scores.overall_score)})`);
    }

    // Update context
    context.scoredPBIs = { scored_pbis: scoredPBIs };

    // Summary
    const avgScore = scoredPBIs.reduce((sum, item) => sum + item.scores.overall_score, 0) / scoredPBIs.length;
    console.log(`[${this.name}] Average score: ${avgScore.toFixed(1)}/100`);

    return context;
  }

  private validateScores(scores: ConfidenceScore): void {
    const scoreFields = ['overall_score', 'completeness', 'clarity', 'actionability', 'testability'];

    for (const field of scoreFields) {
      const value = (scores as any)[field];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        throw new Error(`Invalid ${field}: must be number between 0-100, got ${value}`);
      }
    }

    if (!Array.isArray(scores.missing_elements)) {
      throw new Error('missing_elements must be an array');
    }

    if (!Array.isArray(scores.strengths)) {
      throw new Error('strengths must be an array');
    }

    if (!Array.isArray(scores.concerns)) {
      throw new Error('concerns must be an array');
    }
  }

  private getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  }

  canExecute(context: PipelineContext): boolean {
    return !!context.extractedCandidates && context.extractedCandidates.candidates.length > 0;
  }
}
