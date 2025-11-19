/**
 * Pipeline Orchestrator
 *
 * Coordinates execution of all pipeline steps with the AI router
 */

import { ModelRouter } from '../../ai/router';
import {
  PipelineInput,
  PipelineOptions,
  PipelineContext,
  PipelineOutput,
} from '../types/pipeline-types';
import { PipelineStep } from '../steps/base-step';
import { EventDetectionStep } from '../steps/step1-event-detection';
import { ExtractCandidatesStep } from '../steps/step2-extract-candidates';
import { ScoreConfidenceStep } from '../steps/step3-score-confidence';

/**
 * Main pipeline orchestrator
 */
export class PipelineOrchestrator {
  private router: ModelRouter;
  private steps: PipelineStep[];

  constructor(router: ModelRouter) {
    this.router = router;
    this.steps = this.initializeSteps();
  }

  /**
   * Initialize all pipeline steps
   */
  private initializeSteps(): PipelineStep[] {
    return [
      new EventDetectionStep(),
      new ExtractCandidatesStep(),
      new ScoreConfidenceStep(),
      // TODO: Add remaining steps (4-7) as they're implemented
    ];
  }

  /**
   * Execute the full pipeline
   * @param input Meeting transcript and metadata
   * @param options Pipeline execution options
   * @returns Processed PBI data
   */
  async execute(input: PipelineInput, options: PipelineOptions = {}): Promise<PipelineOutput> {
    console.log('\n' + '='.repeat(80));
    console.log('BACKLOG CHEF PIPELINE');
    console.log('='.repeat(80));
    console.log(`Transcript length: ${input.transcript.length} characters`);
    console.log('='.repeat(80) + '\n');

    // Initialize context
    const context: PipelineContext = {
      input,
      options,
      startTime: Date.now(),
      stepTimings: {},
      totalCost: 0,
      modelsUsed: new Set(),
    };

    try {
      // Execute each step in sequence
      let currentContext = context;

      for (const step of this.steps) {
        // Check if step should be skipped
        if (this.shouldSkipStep(step.name, options)) {
          console.log(`[${step.name}] Skipped (per configuration)`);
          continue;
        }

        // Execute step
        currentContext = await step.execute(currentContext, this.router);
      }

      // Generate final output
      const output = this.generateOutput(currentContext);

      // Print summary
      this.printSummary(output);

      return output;
    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error('PIPELINE FAILED');
      console.error('='.repeat(80));
      console.error('Error:', (error as Error).message);
      console.error('='.repeat(80) + '\n');

      throw error;
    }
  }

  /**
   * Check if a step should be skipped
   */
  private shouldSkipStep(stepName: string, options: PipelineOptions): boolean {
    // If 'only' is specified, skip steps not in the list
    if (options.steps?.only && !options.steps.only.includes(stepName)) {
      return true;
    }

    // If 'skip' is specified, skip steps in the list
    if (options.steps?.skip && options.steps.skip.includes(stepName)) {
      return true;
    }

    return false;
  }

  /**
   * Generate final pipeline output
   */
  private generateOutput(context: PipelineContext): PipelineOutput {
    // Count readiness statuses
    // TODO: Update when readiness checker is implemented
    const readyCount = 0;
    const needsRefinementCount = 0;
    const notReadyCount = 0;

    // Get total duration
    const totalDuration = Date.now() - context.startTime;

    // Get cost statistics
    const costStats = this.router.getCostStatistics();

    return {
      event_type: context.eventDetection?.event_type || 'unknown',
      pbis: context.scoredPBIs?.scored_pbis.map((item) => ({
        pbi: item.pbi,
        scores: item.scores,
        context: {}, // TODO: Add when context enrichment is implemented
        risks: { risks: [], overall_risk_level: 'low' }, // TODO: Add when risk checking is implemented
        questions: [], // TODO: Add when question generation is implemented
        readiness: {
          // TODO: Add when readiness checker is implemented
          readiness_status: '🟡 NEEDS REFINEMENT',
          readiness_score: item.scores.overall_score,
          blocking_issues: [],
          warnings: [],
          recommendations: [],
          sprint_ready: false,
        },
      })) || [],
      metadata: {
        processed_at: new Date().toISOString(),
        total_pbis: context.extractedCandidates?.total_found || 0,
        ready_count: readyCount,
        needs_refinement_count: needsRefinementCount,
        not_ready_count: notReadyCount,
        total_cost_usd: costStats.total_cost_usd,
        total_duration_ms: totalDuration,
        models_used: Array.from(context.modelsUsed),
      },
    };
  }

  /**
   * Print execution summary
   */
  private printSummary(output: PipelineOutput): void {
    console.log('\n' + '='.repeat(80));
    console.log('PIPELINE EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Event Type:          ${output.event_type}`);
    console.log(`Total PBIs:          ${output.metadata.total_pbis}`);
    console.log(`Ready for Sprint:    ${output.metadata.ready_count}`);
    console.log(`Needs Refinement:    ${output.metadata.needs_refinement_count}`);
    console.log(`Not Ready:           ${output.metadata.not_ready_count}`);
    console.log(`Total Cost:          $${output.metadata.total_cost_usd.toFixed(6)}`);
    console.log(`Total Duration:      ${(output.metadata.total_duration_ms / 1000).toFixed(2)}s`);
    console.log(`Models Used:         ${output.metadata.models_used.join(', ')}`);
    console.log('='.repeat(80));

    // Print cost breakdown
    const costStats = this.router.getCostStatistics();
    if (Object.keys(costStats.cost_by_provider).length > 0) {
      console.log('\nCost by Provider:');
      for (const [provider, cost] of Object.entries(costStats.cost_by_provider)) {
        const requests = costStats.requests_by_provider[provider] || 0;
        console.log(`  ${provider.padEnd(15)} $${cost.toFixed(6)} (${requests} requests)`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Get the AI router instance
   * Useful for accessing cost statistics
   */
  getRouter(): ModelRouter {
    return this.router;
  }
}
