/**
 * Pipeline Orchestrator
 *
 * Coordinates execution of all pipeline steps with the AI router
 */

import fs from 'fs';
import path from 'path';
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
import { EnrichContextStep } from '../steps/step4-enrich-context';
import { CheckRisksStep } from '../steps/step5-check-risks';
import { GenerateProposalsStep } from '../steps/step6-generate-proposals';
import { ReadinessCheckerStep } from '../steps/step7-readiness-checker';
import { FormatOutputStep } from '../steps/step8-format-output';
import { StepOutputWriter, PBIOutputWriter, HTMLFormatter } from '../output';
import { detectOutputPath, generateRunDirectory } from '../utils/output-path-detector';

/**
 * Main pipeline orchestrator
 */
export class PipelineOrchestrator {
  private router: ModelRouter;
  private steps: PipelineStep[];
  private stepWriter?: StepOutputWriter;
  private pbiWriter?: PBIOutputWriter;
  private htmlFormatter?: HTMLFormatter;

  constructor(router: ModelRouter, options?: { inputPath?: string; outputDir?: string; writeStepOutputs?: boolean }) {
    this.router = router;
    this.steps = this.initializeSteps();

    // Initialize output writers if enabled
    if (options?.writeStepOutputs !== false) {
      // Detect smart output path if inputPath is provided
      let outputDir = options?.outputDir || process.env.OUTPUT_DIR || 'output';
      let useRunSubdir = true; // Whether to create run-{timestamp} subdirectory

      if (options?.inputPath) {
        const pathConfig = detectOutputPath(options.inputPath, outputDir);

        if (pathConfig.isProjectPBI) {
          // For project PBIs, use the detected path directly (already includes item name)
          outputDir = pathConfig.outputDir;
          useRunSubdir = false; // Don't create run-{timestamp} for project PBIs
          console.log(`📂 Project PBI detected - output: ${outputDir}`);
        } else {
          // For regular inputs, use default output with timestamp
          outputDir = outputDir;
          useRunSubdir = true;
        }
      }

      // Create step writer with optional run subdirectory
      this.stepWriter = new StepOutputWriter(outputDir, true, useRunSubdir);
      const runId = this.stepWriter.getRunId();
      const runDir = this.stepWriter.getRunDir();
      this.pbiWriter = new PBIOutputWriter(runDir, runId, true);
      this.htmlFormatter = new HTMLFormatter(runDir, runId);
    }
  }

  /**
   * Initialize all pipeline steps
   */
  private initializeSteps(): PipelineStep[] {
    return [
      new EventDetectionStep(),
      new ExtractCandidatesStep(),
      new ScoreConfidenceStep(),
      new EnrichContextStep(),
      new CheckRisksStep(),
      new GenerateProposalsStep(),
      new ReadinessCheckerStep(),
      new FormatOutputStep(),
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

        // Write step output
        if (this.stepWriter) {
          this.stepWriter.writeStepOutput(step.name, currentContext);
        }
      }

      // Generate final output
      const output = this.generateOutput(currentContext);

      // Write individual PBI files
      if (this.pbiWriter) {
        this.pbiWriter.writePBIs(output);
      }

      // Write final summary JSON
      if (this.stepWriter) {
        const summaryPath = path.join(this.stepWriter.getRunDir(), 'summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(output, null, 2), 'utf-8');
        console.log(`\n📊 Summary: ${summaryPath}`);
      }

      // Generate HTML preview
      if (this.htmlFormatter) {
        const htmlPath = this.htmlFormatter.generate(output);
        console.log(`🌐 HTML Preview: ${htmlPath}`);
        console.log(`   Open in browser: file://${htmlPath}\n`);
      }

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
    // Use readiness assessment if available, otherwise use scored PBIs
    const pbis = context.readinessAssessed
      ? context.readinessAssessed.assessed_pbis
      : context.scoredPBIs?.scored_pbis.map((item) => ({
          pbi: item.pbi,
          scores: item.scores,
          context: {
            similar_work: [],
            past_decisions: [],
            technical_docs: [],
            risk_flags: [],
            suggestions: [],
          },
          risks: { risks: [], overall_risk_level: 'low' as const },
          questions: [],
          readiness: {
            readiness_status: '🟡 NEEDS REFINEMENT' as const,
            readiness_score: item.scores.overall_score,
            blocking_issues: [],
            warnings: [],
            recommendations: [],
            sprint_ready: false,
          },
        })) || [];

    // Count readiness statuses
    const readyCount = pbis.filter((p) => p.readiness.readiness_status === '🟢 READY').length;
    const needsRefinementCount = pbis.filter((p) => p.readiness.readiness_status === '🟡 NEEDS REFINEMENT').length;
    const notReadyCount = pbis.filter((p) => p.readiness.readiness_status === '🔴 NOT READY').length;

    // Get total duration
    const totalDuration = Date.now() - context.startTime;

    // Get cost statistics
    const costStats = this.router.getCostStatistics();

    return {
      event_type: context.eventDetection?.event_type || 'unknown',
      pbis,
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
