/**
 * Task Generator
 *
 * Generates tasks from Definition of Ready and Definition of Done
 */

import {
  DoRConfig,
  DoDConfig,
  DoRAssessment,
  DoRGap,
  GeneratedTask,
  TasksByPhase,
  TaskGenerationResult,
  TaskGenerationSummary,
  TaskStatus,
  TaskType,
} from '../types/task-types';
import {
  CandidatePBI,
  ConfidenceScore,
  QuestionWithAnswer,
} from '../types/pipeline-types';

/**
 * Task Generator
 *
 * Generates tasks from DoR/DoD based on PBI state
 */
export class TaskGenerator {
  constructor(
    private dorConfig: DoRConfig,
    private dodConfig: DoDConfig
  ) {}

  /**
   * Generate all tasks for a PBI
   */
  generateTasks(
    pbi: CandidatePBI,
    scores: ConfidenceScore,
    questions?: QuestionWithAnswer[]
  ): TaskGenerationResult {
    // 1. Check Definition of Ready gaps
    const dorAssessment = this.assessDoR(pbi, scores, questions);

    // 2. Generate pre-work tasks from DoR gaps
    const preWorkTasks = this.generatePreWorkTasks(dorAssessment);

    // 3. Generate implementation tasks from DoD
    const implementationTasks = this.generateImplementationTasks(pbi);

    // 4. Generate verification tasks from DoD
    const verificationTasks = this.generateVerificationTasks(pbi);

    // 5. Build tasks by phase
    const tasks: TasksByPhase = {
      pre_work: preWorkTasks,
      implementation: implementationTasks,
      verification: verificationTasks,
    };

    // 6. Calculate summary
    const summary = this.calculateSummary(tasks);

    return {
      pbi_id: pbi.id,
      pbi_title: pbi.title,
      tasks,
      summary,
    };
  }

  /**
   * Assess PBI against Definition of Ready
   */
  private assessDoR(
    pbi: CandidatePBI,
    scores: ConfidenceScore,
    questions?: QuestionWithAnswer[]
  ): DoRAssessment {
    const gaps: DoRGap[] = [];

    for (const criterion of this.dorConfig.definition_of_ready) {
      const isMet = this.checkDoRCriterion(pbi, scores, questions, criterion);

      gaps.push({
        criterion,
        is_met: isMet,
        reason: isMet ? undefined : this.explainDoRGap(criterion, pbi, scores),
      });
    }

    const unmetGaps = gaps.filter(g => !g.is_met);
    const blockingGaps = unmetGaps.filter(
      g => g.criterion.priority === 'critical' || g.criterion.priority === 'high'
    );
    const warningGaps = unmetGaps.filter(
      g => g.criterion.priority === 'medium' || g.criterion.priority === 'low'
    );

    return {
      gaps,
      total_criteria: gaps.length,
      met_criteria: gaps.filter(g => g.is_met).length,
      unmet_criteria: unmetGaps.length,
      blocking_gaps: blockingGaps,
      warning_gaps: warningGaps,
    };
  }

  /**
   * Check if a DoR criterion is met
   */
  private checkDoRCriterion(
    pbi: CandidatePBI,
    scores: ConfidenceScore,
    questions: QuestionWithAnswer[] | undefined,
    criterion: any
  ): boolean {
    const id = criterion.id;

    // Simple heuristic checks based on criterion ID
    // In a real implementation, this would be more sophisticated

    // dor-001: Functional description (check if description exists and is substantial)
    if (id.includes('001') || criterion.requirement.toLowerCase().includes('description')) {
      return !!(pbi.description && pbi.description.length > 50);
    }

    // dor-002: Acceptance criteria
    if (id.includes('002') || criterion.requirement.toLowerCase().includes('acceptance')) {
      return (pbi.acceptance_criteria?.length || 0) >= 3;
    }

    // dor-003: Dependencies
    if (id.includes('003') || criterion.requirement.toLowerCase().includes('dependencies')) {
      // Check if we have notes about dependencies or if no missing elements mention dependencies
      return !scores.missing_elements.some(e =>
        e.toLowerCase().includes('dependency') || e.toLowerCase().includes('dependencies')
      );
    }

    // dor-004: Technical approach
    if (id.includes('004') || criterion.requirement.toLowerCase().includes('solution') ||
        criterion.requirement.toLowerCase().includes('technical approach')) {
      return (pbi.notes?.length || 0) > 0 || scores.actionability > 60;
    }

    // dor-005: Test script
    if (id.includes('005') || criterion.requirement.toLowerCase().includes('test')) {
      return scores.testability > 60;
    }

    // dor-006: Localization/translation
    if (id.includes('006') || criterion.requirement.toLowerCase().includes('translation')) {
      // For now, assume met unless explicitly mentioned as missing
      return !scores.missing_elements.some(e =>
        e.toLowerCase().includes('translation') || e.toLowerCase().includes('localization')
      );
    }

    // dor-007: Process
    if (id.includes('007') || criterion.requirement.toLowerCase().includes('process')) {
      return (pbi.notes?.length || 0) > 0;
    }

    // dor-008: Demo approach
    if (id.includes('008') || criterion.requirement.toLowerCase().includes('demo')) {
      return !scores.missing_elements.some(e => e.toLowerCase().includes('demo'));
    }

    // dor-009: Key-user approval
    if (id.includes('009') || criterion.requirement.toLowerCase().includes('key-user') ||
        criterion.requirement.toLowerCase().includes('approval')) {
      // Assume not met (requires explicit approval)
      return false;
    }

    // dor-010: Story points / estimation
    if (id.includes('010') || criterion.requirement.toLowerCase().includes('story points') ||
        criterion.requirement.toLowerCase().includes('estimated')) {
      // Check if scores indicate estimability
      return scores.overall_score > 60 && scores.completeness > 60;
    }

    // dor-011: Priority (MoSCoW)
    if (id.includes('011') || criterion.requirement.toLowerCase().includes('priority')) {
      // Assume not met (requires explicit priority setting)
      return false;
    }

    // Default: if completeness is high, assume met
    return scores.completeness > 70;
  }

  /**
   * Explain why a DoR criterion is not met
   */
  private explainDoRGap(criterion: any, pbi: CandidatePBI, scores: ConfidenceScore): string {
    const id = criterion.id;

    if (id.includes('001')) {
      return `Description is too brief (${pbi.description?.length || 0} chars)`;
    }
    if (id.includes('002')) {
      return `Only ${pbi.acceptance_criteria?.length || 0} acceptance criteria (need 3+)`;
    }
    if (id.includes('003')) {
      return 'Dependencies not identified or documented';
    }
    if (id.includes('004')) {
      return 'Technical approach not documented';
    }
    if (id.includes('005')) {
      return `Low testability score (${scores.testability}/100)`;
    }
    if (id.includes('009')) {
      return 'Key-user approval not obtained';
    }
    if (id.includes('010')) {
      return 'Not yet estimated by team';
    }
    if (id.includes('011')) {
      return 'MoSCoW priority not set';
    }

    return 'Criterion not met';
  }

  /**
   * Generate pre-work tasks from DoR gaps
   */
  private generatePreWorkTasks(dorAssessment: DoRAssessment): GeneratedTask[] {
    const tasks: GeneratedTask[] = [];
    let taskCounter = 1;

    for (const gap of dorAssessment.gaps) {
      if (gap.is_met) continue; // Skip met criteria

      const criterion = gap.criterion;

      tasks.push({
        id: `TASK-PRE-${taskCounter.toString().padStart(3, '0')}`,
        type: 'refinement',
        title: criterion.refinement_task,
        description: `${criterion.requirement}\n\nReason: ${gap.reason}`,
        category: criterion.category as any,
        dor_reference: criterion.id,
        automated: false,
        requires_human: true,
        priority: criterion.priority,
        status: 'todo',
        verification: criterion.verification,
      });

      taskCounter++;
    }

    return tasks;
  }

  /**
   * Generate implementation tasks from DoD
   */
  private generateImplementationTasks(pbi: CandidatePBI): GeneratedTask[] {
    const tasks: GeneratedTask[] = [];
    let taskCounter = 1;

    // Get implementation-related DoD items (not approval/verification)
    const implementationCategories = [
      'code_quality',
      'development',
      'testing',
      'documentation',
      'localization',
      'deployment',
    ];

    for (const dodItem of this.dodConfig.definition_of_done) {
      // Skip approval/demo tasks (those go to verification)
      if (dodItem.category === 'approval' || dodItem.category === 'demo') {
        continue;
      }

      // Skip if not an implementation category
      if (!implementationCategories.includes(dodItem.category)) {
        continue;
      }

      const taskType = this.mapDoDCategoryToTaskType(dodItem.category);

      tasks.push({
        id: `TASK-IMP-${taskCounter.toString().padStart(3, '0')}`,
        type: taskType,
        title: this.interpolateTaskTemplate(dodItem.task_template, pbi),
        description: dodItem.requirement,
        category: dodItem.category as any,
        dod_references: [dodItem.id],
        automated: dodItem.automated,
        requires_human: !dodItem.automated,
        agent_hint: dodItem.agent_hint,
        estimated_effort: dodItem.estimated_effort,
        status: 'todo',
        responsibility: dodItem.responsibility,
        verification: dodItem.verification,
      });

      taskCounter++;
    }

    return tasks;
  }

  /**
   * Generate verification tasks from DoD
   */
  private generateVerificationTasks(pbi: CandidatePBI): GeneratedTask[] {
    const tasks: GeneratedTask[] = [];
    let taskCounter = 1;

    // Get approval/verification DoD items
    const verificationCategories = ['approval', 'demo'];

    for (const dodItem of this.dodConfig.definition_of_done) {
      if (!verificationCategories.includes(dodItem.category)) {
        // Also include review tasks
        if (dodItem.requirement.toLowerCase().includes('review') ||
            dodItem.requirement.toLowerCase().includes('approval')) {
          // Include it
        } else {
          continue;
        }
      }

      const taskType: TaskType = dodItem.category === 'approval' ? 'acceptance' : 'review';

      tasks.push({
        id: `TASK-VER-${taskCounter.toString().padStart(3, '0')}`,
        type: taskType,
        title: this.interpolateTaskTemplate(dodItem.task_template, pbi),
        description: dodItem.requirement,
        category: dodItem.category as any,
        dod_references: [dodItem.id],
        automated: false,
        requires_human: true,
        agent_hint: dodItem.agent_hint,
        estimated_effort: dodItem.estimated_effort,
        status: 'todo',
        responsibility: dodItem.responsibility,
        verification: dodItem.verification,
      });

      taskCounter++;
    }

    return tasks;
  }

  /**
   * Map DoD category to task type
   */
  private mapDoDCategoryToTaskType(category: string): TaskType {
    switch (category) {
      case 'code_quality':
      case 'development':
      case 'deployment':
        return 'code';
      case 'testing':
        return 'test';
      case 'documentation':
        return 'documentation';
      case 'approval':
        return 'acceptance';
      default:
        return 'code';
    }
  }

  /**
   * Interpolate task template with PBI data
   * Replace {component}, {feature}, etc. with actual values
   */
  private interpolateTaskTemplate(template: string, pbi: CandidatePBI): string {
    let result = template;

    // Extract component/feature name from PBI title
    const title = pbi.title;

    // Replace common placeholders
    result = result.replace(/{component}/g, title);
    result = result.replace(/{feature}/g, title);
    result = result.replace(/{reviewer}/g, 'team member');

    return result;
  }

  /**
   * Calculate task generation summary
   */
  private calculateSummary(tasks: TasksByPhase): TaskGenerationSummary {
    const allTasks = [
      ...tasks.pre_work,
      ...tasks.implementation,
      ...tasks.verification,
    ];

    const automatedTasks = allTasks.filter(t => t.automated).length;
    const manualTasks = allTasks.filter(t => !t.automated).length;
    const blockingTasks = tasks.pre_work.filter(
      t => t.priority === 'critical' || t.priority === 'high'
    ).length;

    // Calculate total effort (if estimates present)
    const totalMinutes = this.sumEffortEstimates(allTasks);
    const estimatedTotalEffort = totalMinutes > 0
      ? this.formatEffortEstimate(totalMinutes)
      : undefined;

    return {
      total_tasks: allTasks.length,
      pre_work_tasks: tasks.pre_work.length,
      implementation_tasks: tasks.implementation.length,
      verification_tasks: tasks.verification.length,
      automated_tasks: automatedTasks,
      manual_tasks: manualTasks,
      estimated_total_effort: estimatedTotalEffort,
      blocking_tasks: blockingTasks,
    };
  }

  /**
   * Sum effort estimates from tasks (convert to minutes)
   */
  private sumEffortEstimates(tasks: GeneratedTask[]): number {
    let totalMinutes = 0;

    for (const task of tasks) {
      if (!task.estimated_effort) continue;

      const minutes = this.parseEffortToMinutes(task.estimated_effort);
      totalMinutes += minutes;
    }

    return totalMinutes;
  }

  /**
   * Parse effort string to minutes
   */
  private parseEffortToMinutes(effort: string): number {
    const lower = effort.toLowerCase();

    // Hours
    const hoursMatch = lower.match(/(\d+(?:\.\d+)?)\s*h(?:our|r)?s?/);
    if (hoursMatch) {
      return parseFloat(hoursMatch[1]) * 60;
    }

    // Minutes
    const minutesMatch = lower.match(/(\d+)\s*m(?:in|inute)?s?/);
    if (minutesMatch) {
      return parseInt(minutesMatch[1], 10);
    }

    // Days
    const daysMatch = lower.match(/(\d+(?:\.\d+)?)\s*d(?:ay)?s?/);
    if (daysMatch) {
      return parseFloat(daysMatch[1]) * 8 * 60; // 8 hours per day
    }

    return 0;
  }

  /**
   * Format minutes to human-readable effort
   */
  private formatEffortEstimate(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }

    const hours = minutes / 60;

    if (hours < 8) {
      return `${hours.toFixed(1)} hours`;
    }

    const days = hours / 8;
    return `${days.toFixed(1)} days`;
  }
}
