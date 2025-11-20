/**
 * PBI Output Writer
 *
 * Writes individual JSON files for each Product Backlog Item
 * after pipeline completion
 */

import fs from 'fs';
import path from 'path';
import { PipelineOutput } from '../types/pipeline-types';

export class PBIOutputWriter {
  private outputDir: string;
  private runId: string;
  private enabled: boolean;

  constructor(outputDir: string, runId: string, enabled: boolean = true) {
    this.outputDir = path.join(outputDir, 'pbis');
    this.runId = runId;
    this.enabled = enabled;

    if (this.enabled && !fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Write individual PBI files
   */
  writePBIs(output: PipelineOutput): void {
    if (!this.enabled || !output.pbis) return;

    console.log(`\n📝 Writing individual PBI files...`);

    for (let i = 0; i < output.pbis.length; i++) {
      const pbi = output.pbis[i];
      const fileName = `${pbi.pbi.id}-${this.sanitizeFileName(pbi.pbi.title)}-${this.runId}.json`;
      const filePath = path.join(this.outputDir, fileName);

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
      };

      fs.writeFileSync(filePath, JSON.stringify(pbiOutput, null, 2), 'utf-8');

      console.log(`  ✓ ${pbi.pbi.id}: ${fileName}`);
    }

    console.log(`\n✅ Wrote ${output.pbis.length} individual PBI files`);
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
    return this.outputDir;
  }
}
