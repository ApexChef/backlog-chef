/**
 * Azure DevOps Work Item Formatter
 *
 * Outputs in format suitable for Azure DevOps Product Backlog Items
 */

import { Formatter, OutputFormat } from './types';
import { PipelineOutput } from '../pipeline/types/pipeline-types';

export class DevOpsFormatter implements Formatter {
  formatPBI(pbi: PipelineOutput['pbis'][0], runId: string): string {
    const sections: string[] = [];

    // Work Item Header
    sections.push(`WORK ITEM: ${pbi.pbi.id}`);
    sections.push(`TITLE: ${pbi.pbi.title}`);
    sections.push(`TYPE: Product Backlog Item`);
    sections.push(`STATE: ${this.mapReadinessToState(pbi.readiness)}`);
    sections.push(`PRIORITY: ${this.calculatePriority(pbi)}`);
    sections.push('');

    // Description
    sections.push(`========== DESCRIPTION ==========`);
    if (pbi.pbi.description) {
      sections.push(pbi.pbi.description);
    } else {
      sections.push('No description provided');
    }
    sections.push('');

    // Acceptance Criteria
    sections.push(`========== ACCEPTANCE CRITERIA ==========`);
    if (pbi.pbi.acceptance_criteria && pbi.pbi.acceptance_criteria.length > 0) {
      for (let i = 0; i < pbi.pbi.acceptance_criteria.length; i++) {
        sections.push(`${i + 1}. ${pbi.pbi.acceptance_criteria[i]}`);
      }
    } else {
      sections.push('No acceptance criteria defined');
    }
    sections.push('');

    // Quality Scores
    sections.push(`========== QUALITY SCORES ==========`);
    sections.push(`Overall: ${pbi.scores.overall_score}/100`);
    sections.push(`Completeness: ${pbi.scores.completeness}/100`);
    sections.push(`Clarity: ${pbi.scores.clarity}/100`);
    sections.push(`Actionability: ${pbi.scores.actionability}/100`);
    sections.push(`Testability: ${pbi.scores.testability}/100`);
    sections.push('');

    // Readiness Status
    sections.push(`========== READINESS STATUS ==========`);
    sections.push(`Status: ${pbi.readiness.readiness_status}`);
    sections.push(`Score: ${pbi.readiness.readiness_score}/100`);
    sections.push(`Sprint Ready: ${pbi.readiness.sprint_ready ? 'YES' : 'NO'}`);
    if (pbi.readiness.estimated_refinement_time) {
      sections.push(`Estimated Refinement Time: ${pbi.readiness.estimated_refinement_time}`);
    }
    sections.push('');

    // Blocking Issues
    if (pbi.readiness.blocking_issues && pbi.readiness.blocking_issues.length > 0) {
      sections.push(`========== BLOCKING ISSUES ==========`);
      for (const issue of pbi.readiness.blocking_issues) {
        sections.push(`[BLOCKER] ${issue}`);
      }
      sections.push('');
    }

    // Tasks
    if (pbi.tasks) {
      sections.push(`========== TASKS (${pbi.tasks.summary.total_tasks} total) ==========`);

      if (pbi.tasks.tasks.pre_work.length > 0) {
        sections.push(`\n--- PRE-WORK TASKS (${pbi.tasks.tasks.pre_work.length}) ---`);
        for (const task of pbi.tasks.tasks.pre_work) {
          sections.push(`[ ] [${task.priority}] ${task.title}`);
          if (task.estimated_effort) {
            sections.push(`    Effort: ${task.estimated_effort}`);
          }
        }
      }

      if (pbi.tasks.tasks.implementation.length > 0) {
        sections.push(`\n--- IMPLEMENTATION TASKS (${pbi.tasks.tasks.implementation.length}) ---`);
        for (const task of pbi.tasks.tasks.implementation) {
          sections.push(`[ ] ${task.title}`);
          if (task.estimated_effort) {
            sections.push(`    Effort: ${task.estimated_effort}`);
          }
        }
      }

      if (pbi.tasks.tasks.verification.length > 0) {
        sections.push(`\n--- VERIFICATION TASKS (${pbi.tasks.tasks.verification.length}) ---`);
        for (const task of pbi.tasks.tasks.verification) {
          sections.push(`[ ] ${task.title}`);
        }
      }

      if (pbi.tasks.summary.estimated_total_effort) {
        sections.push(`\nTotal Estimated Effort: ${pbi.tasks.summary.estimated_total_effort}`);
      }
      sections.push('');
    }

    // Risks
    if (pbi.risks && pbi.risks.risks.length > 0) {
      sections.push(`========== RISKS (${pbi.risks.overall_risk_level.toUpperCase()}) ==========`);
      for (const risk of pbi.risks.risks) {
        sections.push(`[${risk.severity.toUpperCase()}] ${risk.type}: ${risk.description}`);
        if (risk.mitigation) {
          sections.push(`  Mitigation: ${risk.mitigation}`);
        }
      }
      sections.push('');
    }

    // Tags
    const tags = this.generateTags(pbi);
    if (tags.length > 0) {
      sections.push(`========== TAGS ==========`);
      sections.push(tags.join('; '));
      sections.push('');
    }

    // Metadata
    sections.push(`========== METADATA ==========`);
    sections.push(`Run ID: ${runId}`);
    sections.push(`Generated: ${new Date().toISOString()}`);
    sections.push(`Event Type: ${pbi.pbi.mentioned_by?.join(', ') || 'Unknown'}`);

    return sections.join('\n');
  }

  formatSummary(output: PipelineOutput): string {
    const sections: string[] = [];

    sections.push(`AZURE DEVOPS - BACKLOG SUMMARY`);
    sections.push(`=`.repeat(70));
    sections.push('');
    sections.push(`Generated: ${new Date(output.metadata.processed_at).toLocaleString()}`);
    sections.push(`Event Type: ${output.event_type}`);
    sections.push(`Total PBIs: ${output.metadata.total_pbis}`);
    sections.push('');

    sections.push(`READINESS BREAKDOWN:`);
    sections.push(`  Ready for Sprint: ${output.metadata.ready_count}`);
    sections.push(`  Needs Refinement: ${output.metadata.needs_refinement_count}`);
    sections.push(`  Not Ready: ${output.metadata.not_ready_count}`);
    sections.push('');

    sections.push(`PBI LIST:`);
    sections.push('');

    for (const pbi of output.pbis) {
      const state = this.mapReadinessToState(pbi.readiness);
      const priority = this.calculatePriority(pbi);
      sections.push(`${pbi.pbi.id} | ${state} | P${priority} | Score: ${pbi.readiness.readiness_score}/100 | ${pbi.pbi.title}`);
    }

    sections.push('');
    sections.push(`=`.repeat(70));
    sections.push(`Duration: ${(output.metadata.total_duration_ms / 1000).toFixed(2)}s`);
    sections.push(`Cost: $${output.metadata.total_cost_usd.toFixed(4)}`);
    sections.push(`Models: ${output.metadata.models_used.join(', ')}`);

    return sections.join('\n');
  }

  getFileExtension(): string {
    return '.devops.json';
  }

  getName(): string {
    return 'Azure DevOps';
  }

  getFormatId(): OutputFormat {
    return 'devops';
  }

  private mapReadinessToState(readiness: any): string {
    if (readiness.sprint_ready) {
      return 'Committed';
    } else if (readiness.readiness_score >= 60) {
      return 'Approved';
    } else {
      return 'New';
    }
  }

  private calculatePriority(pbi: PipelineOutput['pbis'][0]): number {
    const score = pbi.readiness.readiness_score;

    if (score >= 85) {
      return 1; // High priority - ready to go
    } else if (score >= 60) {
      return 2; // Medium priority - needs refinement
    } else {
      return 3; // Low priority - not ready
    }
  }

  private generateTags(pbi: PipelineOutput['pbis'][0]): string[] {
    const tags: string[] = [];

    // Readiness tag
    if (pbi.readiness.sprint_ready) {
      tags.push('ready-for-sprint');
    } else if (pbi.readiness.readiness_score >= 60) {
      tags.push('needs-refinement');
    } else {
      tags.push('not-ready');
    }

    // Blocker tag
    if (pbi.readiness.blocking_issues && pbi.readiness.blocking_issues.length > 0) {
      tags.push('has-blockers');
    }

    // Risk level tag
    if (pbi.risks) {
      tags.push(`risk-${pbi.risks.overall_risk_level}`);
    }

    return tags;
  }
}
