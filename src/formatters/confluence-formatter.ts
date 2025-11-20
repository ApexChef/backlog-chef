/**
 * Confluence Wiki Markup Formatter
 *
 * Outputs in Confluence storage format (wiki markup)
 */

import { Formatter, OutputFormat } from './types';
import { PipelineOutput } from '../pipeline/types/pipeline-types';

export class ConfluenceFormatter implements Formatter {
  formatPBI(pbi: PipelineOutput['pbis'][0], runId: string): string {
    const sections: string[] = [];

    // Page Title
    sections.push(`h1. ${pbi.pbi.id}: ${pbi.pbi.title}\n`);

    // Status Panel
    sections.push(this.createStatusPanel(pbi));
    sections.push('');

    // Description
    if (pbi.pbi.description) {
      sections.push(`h2. Description\n`);
      sections.push(pbi.pbi.description);
      sections.push('');
    }

    // Acceptance Criteria
    if (pbi.pbi.acceptance_criteria && pbi.pbi.acceptance_criteria.length > 0) {
      sections.push(`h2. Acceptance Criteria\n`);
      for (const criterion of pbi.pbi.acceptance_criteria) {
        sections.push(`* ${criterion}`);
      }
      sections.push('');
    }

    // Quality Scores Table
    sections.push(`h2. Quality Scores\n`);
    sections.push(`||Metric||Score||`);
    sections.push(`|Overall|${pbi.scores.overall_score}/100|`);
    sections.push(`|Completeness|${pbi.scores.completeness}/100|`);
    sections.push(`|Clarity|${pbi.scores.clarity}/100|`);
    sections.push(`|Actionability|${pbi.scores.actionability}/100|`);
    sections.push(`|Testability|${pbi.scores.testability}/100|`);
    sections.push('');

    // Blocking Issues
    if (pbi.readiness.blocking_issues && pbi.readiness.blocking_issues.length > 0) {
      sections.push(`{panel:title=🚨 BLOCKING ISSUES|borderStyle=solid|borderColor=#ff0000|titleBGColor=#ffcccc|bgColor=#fff5f5}`);
      for (const issue of pbi.readiness.blocking_issues) {
        sections.push(`* ${issue}`);
      }
      sections.push(`{panel}`);
      sections.push('');
    }

    // Warnings
    if (pbi.readiness.warnings && pbi.readiness.warnings.length > 0) {
      sections.push(`{panel:title=⚠️ WARNINGS|borderStyle=solid|borderColor=#ff9900|titleBGColor=#fff3cd|bgColor=#fffef5}`);
      for (const warning of pbi.readiness.warnings) {
        sections.push(`* ${warning}`);
      }
      sections.push(`{panel}`);
      sections.push('');
    }

    // Recommendations
    if (pbi.readiness.recommendations && pbi.readiness.recommendations.length > 0) {
      sections.push(`h2. Recommendations\n`);
      for (const rec of pbi.readiness.recommendations) {
        sections.push(`* ${rec}`);
      }
      sections.push('');
    }

    // Tasks
    if (pbi.tasks) {
      sections.push(`h2. Tasks (${pbi.tasks.summary.total_tasks} total)\n`);

      if (pbi.tasks.tasks.pre_work.length > 0) {
        sections.push(`h3. Pre-Work Tasks\n`);
        sections.push(`||Priority||Task||Effort||`);
        for (const task of pbi.tasks.tasks.pre_work) {
          const effort = task.estimated_effort || '-';
          sections.push(`|${task.priority}|${task.title}|${effort}|`);
        }
        sections.push('');
      }

      if (pbi.tasks.tasks.implementation.length > 0) {
        sections.push(`h3. Implementation Tasks\n`);
        sections.push(`||Task||Agent||Effort||`);
        for (const task of pbi.tasks.tasks.implementation) {
          const agent = task.agent_hint || '-';
          const effort = task.estimated_effort || '-';
          sections.push(`|${task.title}|${agent}|${effort}|`);
        }
        sections.push('');
      }

      if (pbi.tasks.tasks.verification.length > 0) {
        sections.push(`h3. Verification Tasks\n`);
        for (const task of pbi.tasks.tasks.verification) {
          sections.push(`* ${task.title}`);
        }
        sections.push('');
      }

      if (pbi.tasks.summary.estimated_total_effort) {
        sections.push(`{info:title=Total Estimated Effort}`);
        sections.push(pbi.tasks.summary.estimated_total_effort);
        sections.push(`{info}`);
        sections.push('');
      }
    }

    // Risks
    if (pbi.risks && pbi.risks.risks.length > 0) {
      sections.push(`h2. Risks (${pbi.risks.overall_risk_level.toUpperCase()})\n`);

      for (const risk of pbi.risks.risks) {
        const panelColor = this.getRiskColor(risk.severity);
        sections.push(`{panel:title=${risk.type} (${risk.severity})|borderColor=${panelColor}}`);
        sections.push(risk.description);
        if (risk.mitigation) {
          sections.push(`\n*Mitigation:* ${risk.mitigation}`);
        }
        sections.push(`{panel}`);
      }
      sections.push('');
    }

    // Key Questions
    const highPriorityQuestions = pbi.questions?.filter(
      q => q.priority === 'CRITICAL' || q.priority === 'HIGH'
    );
    if (highPriorityQuestions && highPriorityQuestions.length > 0) {
      sections.push(`h2. Key Questions\n`);
      sections.push(`||Priority||Question||Proposed Answer||`);

      for (const question of highPriorityQuestions) {
        const answer = question.proposed_answer?.suggestion || 'No proposal yet';
        sections.push(`|${question.priority}|${question.question}|${answer}|`);
      }
      sections.push('');
    }

    // Metadata
    sections.push(`h2. Metadata\n`);
    sections.push(`||Field||Value||`);
    sections.push(`|Run ID|${runId}|`);
    sections.push(`|Readiness Status|${pbi.readiness.readiness_status}|`);
    sections.push(`|Sprint Ready|${pbi.readiness.sprint_ready ? '(/) Yes' : '(x) No'}|`);
    sections.push(`|Readiness Score|${pbi.readiness.readiness_score}/100|`);

    if (pbi.pbi.mentioned_by && pbi.pbi.mentioned_by.length > 0) {
      sections.push(`|Mentioned By|${pbi.pbi.mentioned_by.join(', ')}|`);
    }

    sections.push('');

    // Footer
    sections.push(`----`);
    sections.push(`{note}Generated by Backlog Chef{note}`);

    return sections.join('\n');
  }

  formatSummary(output: PipelineOutput): string {
    const sections: string[] = [];

    sections.push(`h1. Backlog Summary\n`);

    // Summary Panel
    sections.push(`{panel:title=Summary Statistics|borderStyle=solid|borderColor=#0052cc|titleBGColor=#deebff|bgColor=#f4f5f7}`);
    sections.push(`* *Generated:* ${new Date(output.metadata.processed_at).toLocaleString()}`);
    sections.push(`* *Event Type:* ${output.event_type}`);
    sections.push(`* *Total PBIs:* ${output.metadata.total_pbis}`);
    sections.push(`* *Ready for Sprint:* ${output.metadata.ready_count}`);
    sections.push(`* *Needs Refinement:* ${output.metadata.needs_refinement_count}`);
    sections.push(`* *Not Ready:* ${output.metadata.not_ready_count}`);
    sections.push(`{panel}`);
    sections.push('');

    // PBI Table
    sections.push(`h2. PBI Breakdown\n`);
    sections.push(`||ID||Title||Status||Score||Sprint Ready||`);

    for (const pbi of output.pbis) {
      const statusIcon = this.getStatusIcon(pbi.readiness);
      const sprintReady = pbi.readiness.sprint_ready ? '(/) Yes' : '(x) No';
      sections.push(`|${pbi.pbi.id}|${pbi.pbi.title}|${statusIcon}|${pbi.readiness.readiness_score}/100|${sprintReady}|`);
    }

    sections.push('');

    // Processing Metadata
    sections.push(`h2. Processing Metadata\n`);
    sections.push(`* *Duration:* ${(output.metadata.total_duration_ms / 1000).toFixed(2)}s`);
    sections.push(`* *Cost:* $${output.metadata.total_cost_usd.toFixed(4)}`);
    sections.push(`* *Models:* ${output.metadata.models_used.join(', ')}`);

    return sections.join('\n');
  }

  getFileExtension(): string {
    return '.confluence.md';
  }

  getName(): string {
    return 'Confluence Wiki';
  }

  getFormatId(): OutputFormat {
    return 'confluence';
  }

  private createStatusPanel(pbi: PipelineOutput['pbis'][0]): string {
    let panelColor = '#ff0000'; // red for not ready
    let bgColor = '#fff5f5';

    if (pbi.readiness.sprint_ready) {
      panelColor = '#00aa00';
      bgColor = '#f0fff0';
    } else if (pbi.readiness.readiness_score >= 60) {
      panelColor = '#ff9900';
      bgColor = '#fffef5';
    }

    const lines: string[] = [];
    lines.push(`{panel:title=Status|borderStyle=solid|borderColor=${panelColor}|titleBGColor=${bgColor}|bgColor=${bgColor}}`);
    lines.push(`* *Status:* ${pbi.readiness.readiness_status}`);
    lines.push(`* *Readiness Score:* ${pbi.readiness.readiness_score}/100`);
    lines.push(`* *Sprint Ready:* ${pbi.readiness.sprint_ready ? '(/) Yes' : '(x) No'}`);
    if (pbi.readiness.estimated_refinement_time) {
      lines.push(`* *Estimated Refinement Time:* ${pbi.readiness.estimated_refinement_time}`);
    }
    lines.push(`{panel}`);

    return lines.join('\n');
  }

  private getStatusIcon(readiness: any): string {
    if (readiness.sprint_ready) {
      return '(/) READY';
    } else if (readiness.readiness_score >= 60) {
      return '(!) NEEDS REFINEMENT';
    } else {
      return '(x) NOT READY';
    }
  }

  private getRiskColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#ff0000';
      case 'high':
        return '#ff6600';
      case 'medium':
        return '#ff9900';
      case 'low':
        return '#00aa00';
      default:
        return '#666666';
    }
  }
}
