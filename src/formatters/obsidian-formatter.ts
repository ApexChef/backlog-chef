/**
 * Obsidian Markdown Formatter
 *
 * Generates rich markdown suitable for Obsidian with backlinks, tags, and quality scores
 */

import { Formatter, OutputFormat } from './types';
import { PipelineOutput } from '../pipeline/types/pipeline-types';

export class ObsidianFormatter implements Formatter {
  formatPBI(pbi: PipelineOutput['pbis'][0], runId: string): string {
    const sections: string[] = [];

    // Header with title
    sections.push(`# ${pbi.pbi.id}: ${pbi.pbi.title}\n`);

    // Metadata section with tags
    sections.push(`---`);
    sections.push(`tags: [pbi, backlog-chef, ${this.getReadinessTag(pbi.readiness)}]`);
    sections.push(`run-id: ${runId}`);
    sections.push(`created: ${new Date().toISOString()}`);
    sections.push(`---\n`);

    // Status and Readiness
    sections.push(`## 📊 Status & Readiness\n`);
    sections.push(`**Readiness**: ${pbi.readiness.readiness_status}`);
    sections.push(`**Ready for Sprint**: ${pbi.readiness.sprint_ready ? '✅ Yes' : '❌ No'}`);
    sections.push(`**Readiness Score**: ${pbi.readiness.readiness_score}/100\n`);

    // Description
    if (pbi.pbi.description) {
      sections.push(`## 📝 Description\n`);
      sections.push(pbi.pbi.description);
      sections.push('');
    }

    // Acceptance Criteria
    if (pbi.pbi.acceptance_criteria && pbi.pbi.acceptance_criteria.length > 0) {
      sections.push(`## ✅ Acceptance Criteria\n`);
      for (const criterion of pbi.pbi.acceptance_criteria) {
        sections.push(`- [ ] ${criterion}`);
      }
      sections.push('');
    }

    // Quality Scores
    sections.push(`## 📈 Quality Scores\n`);
    sections.push(`| Metric | Score |`);
    sections.push(`|--------|-------|`);
    sections.push(`| Overall | ${pbi.scores.overall_score}/100 |`);
    sections.push(`| Completeness | ${pbi.scores.completeness}/100 |`);
    sections.push(`| Clarity | ${pbi.scores.clarity}/100 |`);
    sections.push(`| Actionability | ${pbi.scores.actionability}/100 |`);
    sections.push(`| Testability | ${pbi.scores.testability}/100 |`);
    sections.push('');

    // Blocking Issues
    if (pbi.readiness.blocking_issues && pbi.readiness.blocking_issues.length > 0) {
      sections.push(`## 🚨 Blocking Issues\n`);
      for (const issue of pbi.readiness.blocking_issues) {
        sections.push(`- ❌ ${issue}`);
      }
      sections.push('');
    }

    // Warnings
    if (pbi.readiness.warnings && pbi.readiness.warnings.length > 0) {
      sections.push(`## ⚠️ Warnings\n`);
      for (const warning of pbi.readiness.warnings) {
        sections.push(`- ${warning}`);
      }
      sections.push('');
    }

    // Recommendations
    if (pbi.readiness.recommendations && pbi.readiness.recommendations.length > 0) {
      sections.push(`## 💡 Recommendations\n`);
      for (const rec of pbi.readiness.recommendations) {
        sections.push(`- ${rec}`);
      }
      sections.push('');
    }

    // Questions (High Priority)
    const highPriorityQuestions = pbi.questions?.filter(
      q => q.priority === 'CRITICAL' || q.priority === 'HIGH'
    );
    if (highPriorityQuestions && highPriorityQuestions.length > 0) {
      sections.push(`## ❓ Key Questions\n`);
      for (const question of highPriorityQuestions) {
        sections.push(`### ${question.priority}: ${question.question}\n`);
        sections.push(`**Category**: ${question.category}`);

        if (question.stakeholders && question.stakeholders.length > 0) {
          const stakeholderNames = question.stakeholders.map(s => s.name || s.role).join(', ');
          sections.push(`**Stakeholders**: ${stakeholderNames}`);
        }

        if (question.proposed_answer) {
          sections.push(`\n**Proposed Answer** (Confidence: ${question.proposed_answer.confidence}):`);
          sections.push(question.proposed_answer.suggestion);
          sections.push('');
        }
      }
    }

    // Risks
    if (pbi.risks && pbi.risks.risks.length > 0) {
      sections.push(`## ⚡ Risks (${pbi.risks.overall_risk_level})\n`);
      for (const risk of pbi.risks.risks) {
        const icon = this.getRiskIcon(risk.severity);
        sections.push(`### ${icon} ${risk.type} (${risk.severity})\n`);
        sections.push(risk.description);
        if (risk.mitigation) {
          sections.push(`\n**Mitigation**: ${risk.mitigation}`);
        }
        sections.push('');
      }
    }

    // Tasks (if generated)
    if (pbi.tasks) {
      sections.push(`## 📋 Tasks (${pbi.tasks.summary.total_tasks} total)\n`);

      // Pre-work tasks
      if (pbi.tasks.tasks.pre_work.length > 0) {
        sections.push(`### Pre-Work (${pbi.tasks.tasks.pre_work.length})\n`);
        for (const task of pbi.tasks.tasks.pre_work) {
          sections.push(`- [ ] **[${task.priority}]** ${task.title}`);
          if (task.estimated_effort) {
            sections.push(`  - Effort: ${task.estimated_effort}`);
          }
        }
        sections.push('');
      }

      // Implementation tasks
      if (pbi.tasks.tasks.implementation.length > 0) {
        sections.push(`### Implementation (${pbi.tasks.tasks.implementation.length})\n`);
        for (const task of pbi.tasks.tasks.implementation) {
          sections.push(`- [ ] ${task.title}`);
          if (task.agent_hint) {
            sections.push(`  - Agent: \`${task.agent_hint}\``);
          }
          if (task.estimated_effort) {
            sections.push(`  - Effort: ${task.estimated_effort}`);
          }
        }
        sections.push('');
      }

      // Verification tasks
      if (pbi.tasks.tasks.verification.length > 0) {
        sections.push(`### Verification (${pbi.tasks.tasks.verification.length})\n`);
        for (const task of pbi.tasks.tasks.verification) {
          sections.push(`- [ ] ${task.title}`);
        }
        sections.push('');
      }

      // Effort summary
      if (pbi.tasks.summary.estimated_total_effort) {
        sections.push(`**Total Estimated Effort**: ${pbi.tasks.summary.estimated_total_effort}`);
        sections.push('');
      }
    }

    // Notes
    if (pbi.pbi.notes && pbi.pbi.notes.length > 0) {
      sections.push(`## 📝 Notes\n`);
      for (const note of pbi.pbi.notes) {
        sections.push(`- ${note}`);
      }
      sections.push('');
    }

    // Mentioned By
    if (pbi.pbi.mentioned_by && pbi.pbi.mentioned_by.length > 0) {
      sections.push(`## 👥 Mentioned By\n`);
      sections.push(pbi.pbi.mentioned_by.join(', '));
      sections.push('');
    }

    // Footer
    sections.push(`---`);
    sections.push(`*Generated by Backlog Chef* 🤖`);

    return sections.join('\n');
  }

  formatSummary(output: PipelineOutput): string {
    const sections: string[] = [];

    sections.push(`# 📊 Backlog Summary\n`);
    sections.push(`**Generated**: ${new Date(output.metadata.processed_at).toLocaleString()}`);
    sections.push(`**Event Type**: ${output.event_type}`);
    sections.push(`**Total PBIs**: ${output.metadata.total_pbis}\n`);

    // Readiness breakdown
    sections.push(`## Readiness Status\n`);
    sections.push(`- 🟢 **Ready for Sprint**: ${output.metadata.ready_count}`);
    sections.push(`- 🟡 **Needs Refinement**: ${output.metadata.needs_refinement_count}`);
    sections.push(`- 🔴 **Not Ready**: ${output.metadata.not_ready_count}\n`);

    // PBI List
    sections.push(`## PBI List\n`);

    // Group by readiness
    const ready = output.pbis.filter(p => p.readiness.sprint_ready);
    const needsRefinement = output.pbis.filter(p =>
      !p.readiness.sprint_ready && p.readiness.readiness_score >= 60
    );
    const notReady = output.pbis.filter(p => p.readiness.readiness_score < 60);

    if (ready.length > 0) {
      sections.push(`### 🟢 Ready for Sprint (${ready.length})\n`);
      for (const pbi of ready) {
        sections.push(`- [[${pbi.pbi.id}]] ${pbi.pbi.title}`);
        sections.push(`  - Score: ${pbi.readiness.readiness_score}/100`);
      }
      sections.push('');
    }

    if (needsRefinement.length > 0) {
      sections.push(`### 🟡 Needs Refinement (${needsRefinement.length})\n`);
      for (const pbi of needsRefinement) {
        sections.push(`- [[${pbi.pbi.id}]] ${pbi.pbi.title}`);
        sections.push(`  - Score: ${pbi.readiness.readiness_score}/100`);
        if (pbi.readiness.blocking_issues && pbi.readiness.blocking_issues.length > 0) {
          sections.push(`  - Blockers: ${pbi.readiness.blocking_issues.length}`);
        }
      }
      sections.push('');
    }

    if (notReady.length > 0) {
      sections.push(`### 🔴 Not Ready (${notReady.length})\n`);
      for (const pbi of notReady) {
        sections.push(`- [[${pbi.pbi.id}]] ${pbi.pbi.title}`);
        sections.push(`  - Score: ${pbi.readiness.readiness_score}/100`);
        if (pbi.readiness.blocking_issues && pbi.readiness.blocking_issues.length > 0) {
          sections.push(`  - Blockers: ${pbi.readiness.blocking_issues.length}`);
        }
      }
      sections.push('');
    }

    // Processing metadata
    sections.push(`## Processing Metadata\n`);
    sections.push(`- **Duration**: ${(output.metadata.total_duration_ms / 1000).toFixed(2)}s`);
    sections.push(`- **Cost**: $${output.metadata.total_cost_usd.toFixed(4)}`);
    sections.push(`- **Models Used**: ${output.metadata.models_used.join(', ')}`);

    return sections.join('\n');
  }

  getFileExtension(): string {
    return '.md';
  }

  getName(): string {
    return 'Obsidian Markdown';
  }

  getFormatId(): OutputFormat {
    return 'obsidian';
  }

  private getReadinessTag(readiness: any): string {
    if (readiness.sprint_ready) {
      return 'ready';
    } else if (readiness.readiness_score >= 60) {
      return 'needs-refinement';
    } else {
      return 'not-ready';
    }
  }

  private getRiskIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }
}
