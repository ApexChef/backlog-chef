/**
 * Main orchestrator for the PBI scoring process
 */

import * as path from 'path';
import { FileService } from './services/fileService';
import { ClaudeAPIClient } from './services/claudeClient';
import { ScoringEngine } from './services/scoringEngine';
import { ScoredPBIsOutput } from './models/types';

export class ScoreOrchestrator {
  private fileService: FileService;
  private claudeClient: ClaudeAPIClient;
  private scoringEngine: ScoringEngine;

  constructor(apiKey: string, model?: string) {
    this.fileService = new FileService();
    this.claudeClient = new ClaudeAPIClient(apiKey, model);
    this.scoringEngine = new ScoringEngine(this.claudeClient);
  }

  /**
   * Execute the complete scoring workflow
   */
  async execute(inputPath?: string, outputPath?: string): Promise<void> {
    try {
      console.log('\n========================================');
      console.log('  PBI Confidence Scoring - Step 3 POC  ');
      console.log('========================================\n');

      // Define paths
      const defaultInputPath = path.join(
        __dirname,
        '..',
        '..',
        'poc',
        'output',
        'extracted-pbis.json'
      );
      const defaultOutputPath = path.join(__dirname, '..', 'output', 'scored-pbis.json');

      const actualInputPath = inputPath || defaultInputPath;
      const actualOutputPath = outputPath || defaultOutputPath;

      // Step 1: Read extracted PBIs
      console.log('Step 1: Reading extracted PBIs...');
      const extractedData = await this.fileService.readExtractedPBIs(actualInputPath);

      if (extractedData.candidates.length === 0) {
        console.log('No PBI candidates found to score.');
        return;
      }

      // Step 2: Score each PBI
      console.log(`\nStep 2: Scoring ${extractedData.candidates.length} PBI candidates...`);
      console.log(`Using model: ${this.claudeClient.getModel()}\n`);

      const scoredPBIs = await this.scoringEngine.scorePBIs(extractedData.candidates);

      // Step 3: Prepare output
      console.log('\nStep 3: Preparing output...');
      const output: ScoredPBIsOutput = {
        scored_candidates: scoredPBIs,
        metadata: {
          scored_at: new Date().toISOString(),
          total_scored: scoredPBIs.length,
          model_used: this.claudeClient.getModel(),
        },
      };

      // Step 4: Write results
      console.log('Step 4: Writing scored results...');
      await this.fileService.writeScoredPBIs(actualOutputPath, output);

      // Step 5: Summary
      this.printSummary(scoredPBIs);

      console.log('\n✅ Scoring complete!\n');
    } catch (error) {
      console.error('\n❌ Error during scoring process:');
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
      process.exit(1);
    }
  }

  /**
   * Print a summary of the scoring results
   */
  private printSummary(scoredPBIs: any[]): void {
    console.log('\n========================================');
    console.log('           SCORING SUMMARY              ');
    console.log('========================================\n');

    for (const pbi of scoredPBIs) {
      console.log(`📋 ${pbi.id}: ${pbi.title}`);
      console.log(`   Overall Readiness: ${this.getReadinessEmoji(pbi.overall_readiness)} ${
        pbi.overall_readiness
      }`);
      console.log(`   Blocking Issues: ${pbi.blocking_issues}`);
      console.log(`   Warning Issues: ${pbi.warning_issues}`);

      // Show individual scores
      console.log('   Scores:');
      const scores = pbi.confidenceScores;
      console.log(`     • Complete PBI:        ${this.formatScore(scores.isCompletePBI.score)}`);
      console.log(
        `     • All Requirements:    ${this.formatScore(scores.hasAllRequirements.score)}`
      );
      console.log(
        `     • Refinement Complete: ${this.formatScore(scores.isRefinementComplete.score)}`
      );
      console.log(
        `     • Acceptance Criteria: ${this.formatScore(scores.hasAcceptanceCriteria.score)}`
      );
      console.log(`     • Clear Scope:         ${this.formatScore(scores.hasClearScope.score)}`);
      console.log(`     • Estimable:           ${this.formatScore(scores.isEstimable.score)}`);
      console.log('');
    }

    // Overall statistics
    const readyCount = scoredPBIs.filter((p) => p.overall_readiness === 'READY').length;
    const mostlyReadyCount = scoredPBIs.filter(
      (p) => p.overall_readiness === 'MOSTLY_READY'
    ).length;
    const notReadyCount = scoredPBIs.filter((p) => p.overall_readiness === 'NOT_READY').length;

    console.log('Overall Statistics:');
    console.log(`  • Ready: ${readyCount}`);
    console.log(`  • Mostly Ready: ${mostlyReadyCount}`);
    console.log(`  • Not Ready: ${notReadyCount}`);
  }

  /**
   * Format a score with color indicator
   */
  private formatScore(score: number): string {
    const indicator = score >= 70 ? '🟢' : score >= 50 ? '🟡' : '🔴';
    return `${indicator} ${score.toString().padStart(3)}%`;
  }

  /**
   * Get emoji for readiness level
   */
  private getReadinessEmoji(readiness: string): string {
    switch (readiness) {
      case 'READY':
        return '✅';
      case 'MOSTLY_READY':
        return '🟡';
      case 'NOT_READY':
        return '❌';
      case 'DEFERRED':
        return '⏸️';
      case 'FUTURE_PHASE':
        return '📅';
      default:
        return '❓';
    }
  }
}