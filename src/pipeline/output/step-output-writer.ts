/**
 * Step Output Writer
 *
 * Writes intermediate JSON files after each pipeline step
 * to show the progressive transformation of data
 */

import fs from 'fs';
import path from 'path';
import { PipelineContext } from '../types/pipeline-types';

export class StepOutputWriter {
  private outputDir: string;
  private runId: string;
  private enabled: boolean;

  constructor(outputDir: string, enabled: boolean = true) {
    this.outputDir = path.join(outputDir, 'steps');
    this.runId = Date.now().toString();
    this.enabled = enabled;

    if (this.enabled && !fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Write step output to JSON file
   */
  writeStepOutput(stepName: string, context: PipelineContext): void {
    if (!this.enabled) return;

    const stepNumber = this.getStepNumber(stepName);
    const fileName = `${stepNumber}-${stepName}-${this.runId}.json`;
    const filePath = path.join(this.outputDir, fileName);

    const output = this.buildStepOutput(stepName, context);

    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`  📄 Step output saved: ${fileName}`);
  }

  /**
   * Build step-specific output structure
   */
  private buildStepOutput(stepName: string, context: PipelineContext): any {
    const baseOutput = {
      step: stepName,
      timestamp: new Date().toISOString(),
      runId: this.runId,
      cost: {
        step_cost_usd: this.getStepCost(stepName, context),
        total_cost_usd: context.totalCost,
      },
      timing: {
        step_duration_ms: context.stepTimings[stepName],
        total_duration_ms: Object.values(context.stepTimings).reduce((a, b) => a + b, 0),
      },
    };

    // Add step-specific data
    switch (stepName) {
      case 'detect_event_type':
        return {
          ...baseOutput,
          result: context.eventDetection,
        };

      case 'extract_candidates':
        return {
          ...baseOutput,
          result: {
            ...context.extractedCandidates,
            candidates: context.extractedCandidates?.candidates,
          },
        };

      case 'score_confidence':
        return {
          ...baseOutput,
          result: {
            total_pbis: context.scoredPBIs?.scored_pbis.length,
            average_score: this.calculateAverageScore(context),
            scored_pbis: context.scoredPBIs?.scored_pbis,
          },
        };

      case 'enrich_context':
        return {
          ...baseOutput,
          result: {
            total_pbis: context.enrichedPBIs?.enriched_pbis.length,
            enriched_pbis: context.enrichedPBIs?.enriched_pbis,
          },
        };

      case 'check_risks':
        return {
          ...baseOutput,
          result: {
            total_pbis: context.risksAssessed?.pbis_with_risks.length,
            risk_summary: this.getRiskSummary(context),
            pbis_with_risks: context.risksAssessed?.pbis_with_risks,
          },
        };

      case 'generate_proposals':
        return {
          ...baseOutput,
          result: {
            total_pbis: context.questionsGenerated?.pbis_with_questions.length,
            total_questions: context.questionsGenerated?.pbis_with_questions.reduce(
              (sum, pbi) => sum + pbi.total_questions,
              0
            ),
            question_summary: this.getQuestionSummary(context),
            pbis_with_questions: context.questionsGenerated?.pbis_with_questions,
          },
        };

      case 'readiness_checker':
        return {
          ...baseOutput,
          result: {
            total_pbis: context.readinessAssessed?.assessed_pbis.length,
            readiness_summary: this.getReadinessSummary(context),
            assessed_pbis: context.readinessAssessed?.assessed_pbis,
          },
        };

      default:
        return baseOutput;
    }
  }

  /**
   * Get step number from step name
   */
  private getStepNumber(stepName: string): string {
    const stepNumbers: Record<string, string> = {
      detect_event_type: '1',
      extract_candidates: '2',
      score_confidence: '3',
      enrich_context: '4',
      check_risks: '5',
      generate_proposals: '6',
      readiness_checker: '7',
    };

    return stepNumbers[stepName] || '0';
  }

  /**
   * Calculate step cost (placeholder - would need tracking in context)
   */
  private getStepCost(stepName: string, context: PipelineContext): number {
    // This is a simplified calculation
    // In reality, we'd need to track per-step costs in the context
    return 0; // TODO: Implement per-step cost tracking
  }

  /**
   * Calculate average confidence score
   */
  private calculateAverageScore(context: PipelineContext): number {
    if (!context.scoredPBIs?.scored_pbis.length) return 0;

    const sum = context.scoredPBIs.scored_pbis.reduce(
      (acc, pbi) => acc + pbi.scores.overall_score,
      0
    );

    return Math.round(sum / context.scoredPBIs.scored_pbis.length);
  }

  /**
   * Get risk summary statistics
   */
  private getRiskSummary(context: PipelineContext): any {
    if (!context.risksAssessed?.pbis_with_risks) return {};

    const risks = context.risksAssessed.pbis_with_risks;
    const riskLevels = risks.map((r) => r.risks.overall_risk_level);

    return {
      high: riskLevels.filter((r) => r === 'high').length,
      medium: riskLevels.filter((r) => r === 'medium').length,
      low: riskLevels.filter((r) => r === 'low').length,
    };
  }

  /**
   * Get question summary statistics
   */
  private getQuestionSummary(context: PipelineContext): any {
    if (!context.questionsGenerated?.pbis_with_questions) return {};

    const pbis = context.questionsGenerated.pbis_with_questions;
    let critical = 0,
      high = 0,
      medium = 0,
      low = 0;

    for (const pbi of pbis) {
      critical += pbi.unanswered_questions.critical.length;
      high += pbi.unanswered_questions.high.length;
      medium += pbi.unanswered_questions.medium.length;
      low += pbi.unanswered_questions.low.length;
    }

    return { critical, high, medium, low, total: critical + high + medium + low };
  }

  /**
   * Get readiness summary statistics
   */
  private getReadinessSummary(context: PipelineContext): any {
    if (!context.readinessAssessed?.assessed_pbis) return {};

    const pbis = context.readinessAssessed.assessed_pbis;

    return {
      ready: pbis.filter((p) => p.readiness.readiness_status === '🟢 READY').length,
      needs_refinement: pbis.filter((p) => p.readiness.readiness_status === '🟡 NEEDS REFINEMENT')
        .length,
      not_ready: pbis.filter((p) => p.readiness.readiness_status === '🔴 NOT READY').length,
      average_score:
        Math.round(
          pbis.reduce((sum, p) => sum + p.readiness.readiness_score, 0) / pbis.length
        ) || 0,
    };
  }

  /**
   * Get output directory for this run
   */
  getOutputDir(): string {
    return this.outputDir;
  }

  /**
   * Get run ID
   */
  getRunId(): string {
    return this.runId;
  }
}
