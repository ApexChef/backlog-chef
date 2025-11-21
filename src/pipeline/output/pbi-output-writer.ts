/**
 * PBI Output Writer
 *
 * Writes individual JSON files for each Product Backlog Item
 * and generates multi-format outputs
 */

import fs from 'fs';
import path from 'path';
import { PipelineOutput } from '../types/pipeline-types';
import { FormatService, OutputFormat } from '../../formatters';

export class PBIOutputWriter {
  private runDir: string;
  private runId: string;
  private enabled: boolean;
  private formatService: FormatService;
  private outputFormats: OutputFormat[];

  constructor(
    runDir: string,
    runId: string,
    enabled: boolean = true,
    outputFormats: OutputFormat[] = []
  ) {
    this.runDir = runDir;
    this.runId = runId;
    this.enabled = enabled;
    this.formatService = new FormatService();
    this.outputFormats = outputFormats;

    // runDir is already created by StepOutputWriter, no need to create again
  }

  /**
   * Write individual PBI files (JSON + multi-format)
   */
  async writePBIs(output: PipelineOutput): Promise<void> {
    if (!this.enabled || !output.pbis) return;

    console.log(`\n📝 Writing individual PBI files...`);

    // Write JSON files (existing behavior)
    for (let i = 0; i < output.pbis.length; i++) {
      const pbi = output.pbis[i];
      const fileName = `pbi-${pbi.pbi.id}-${this.sanitizeFileName(pbi.pbi.title)}.json`;
      const filePath = path.join(this.runDir, fileName);

      const pbiOutput = {
        metadata: {
          generated_at: new Date().toISOString(),
          runId: this.runId,
          event_type: output.event_type,
          pbi_index: i + 1,
          total_pbis: output.pbis.length,
        },
        pbi: pbi.pbi,
        quality: {
          scores: pbi.scores,
          overall_assessment: this.getQualityAssessment(pbi.scores.overall_score),
        },
        context: pbi.context,
        risks: {
          ...pbi.risks,
          risk_count: pbi.risks.risks.length,
          risk_assessment: this.getRiskAssessment(pbi.risks.overall_risk_level),
        },
        questions: pbi.questions,
        readiness: {
          ...pbi.readiness,
          readiness_level: this.getReadinessLevel(pbi.readiness.readiness_status),
          can_start_sprint: pbi.readiness.sprint_ready,
        },
        tasks: pbi.tasks,  // Include tasks if generated
      };

      fs.writeFileSync(filePath, JSON.stringify(pbiOutput, null, 2), 'utf-8');

      console.log(`  ✓ ${pbi.pbi.id}: ${fileName}`);
    }

    console.log(`\n✅ Wrote ${output.pbis.length} individual PBI JSON files`);

    // Generate multi-format outputs if requested
    if (this.outputFormats.length > 0) {
      await this.writeFormattedOutputs(output);
    }
  }

  /**
   * Write formatted outputs (DevOps, Obsidian, Confluence)
   */
  private async writeFormattedOutputs(output: PipelineOutput): Promise<void> {
    console.log(`\n📄 Generating formatted outputs...`);

    try {
      const results = await this.formatService.generateFormats(
        output,
        this.outputFormats,
        {
          outputDir: this.runDir,
          force: false,  // Don't overwrite existing files
        }
      );

      // Group results by format
      const byFormat = new Map<OutputFormat, typeof results>();
      for (const result of results) {
        if (!byFormat.has(result.format)) {
          byFormat.set(result.format, []);
        }
        byFormat.get(result.format)!.push(result);
      }

      // Display results
      for (const [format, formatResults] of byFormat) {
        const successful = formatResults.filter(r => r.success);
        const failed = formatResults.filter(r => !r.success);

        if (successful.length > 0) {
          console.log(`  ✓ ${format}: ${successful.length} files generated`);
        }

        if (failed.length > 0) {
          console.log(`  ⚠️  ${format}: ${failed.length} files skipped/failed`);
          for (const failure of failed) {
            console.log(`     ${failure.filename}: ${failure.error}`);
          }
        }
      }

      console.log(`\n✅ Multi-format generation complete`);
    } catch (error) {
      console.error(`\n❌ Multi-format generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sanitize file name (remove special characters)
   */
  private sanitizeFileName(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Get quality assessment text
   */
  private getQualityAssessment(score: number): string {
    if (score >= 90) return 'Excellent - Ready for sprint';
    if (score >= 80) return 'Good - Minor improvements needed';
    if (score >= 70) return 'Fair - Requires refinement';
    if (score >= 60) return 'Poor - Significant gaps';
    return 'Very Poor - Not ready for development';
  }

  /**
   * Get risk assessment text
   */
  private getRiskAssessment(level: string): string {
    switch (level.toLowerCase()) {
      case 'high':
        return 'High risk - Requires mitigation plan';
      case 'medium':
        return 'Medium risk - Monitor and address';
      case 'low':
        return 'Low risk - Acceptable for sprint';
      default:
        return 'Unknown risk level';
    }
  }

  /**
   * Get readiness level
   */
  private getReadinessLevel(status: string): string {
    if (status.includes('READY')) return 'ready';
    if (status.includes('NEEDS REFINEMENT')) return 'needs_refinement';
    if (status.includes('NOT READY')) return 'not_ready';
    return 'unknown';
  }

  /**
   * Get output directory
   */
  getOutputDir(): string {
    return this.runDir;
  }
}
