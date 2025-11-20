import { ClaudeAPIClient } from './claude-api-client';
import { logDebug, logInfo } from '../utils/logger';
import {
  PBIWithQuestions,
  DefinitionOfReadyConfig,
  ReadinessCriterion,
  CriterionEvaluationResult,
  PBIReadinessAssessment,
  ChecklistResult,
  CriterionEvaluation,
  RecommendedActions,
  EstimationGuidance
} from '../types';

export class ReadinessChecker {
  private apiClient: ClaudeAPIClient;
  private config: DefinitionOfReadyConfig;

  constructor(apiClient: ClaudeAPIClient, config: DefinitionOfReadyConfig) {
    this.apiClient = apiClient;
    this.config = config;
  }

  async evaluatePBI(pbi: PBIWithQuestions): Promise<PBIReadinessAssessment> {
    logInfo(`\n${'='.repeat(80)}`);
    logInfo(`Evaluating readiness for ${pbi.pbi_id}: ${pbi.title}`);
    logInfo('='.repeat(80));

    const startTime = Date.now();

    // Evaluate all criteria
    const blockingResults = await this.evaluateCriteria(pbi, this.config.criteria.blocking, 'blocking');
    const warningResults = await this.evaluateCriteria(pbi, this.config.criteria.warning, 'warning');
    const suggestionResults = await this.evaluateCriteria(pbi, this.config.criteria.suggestion, 'suggestion');

    // Calculate score
    const readinessScore = this.calculateReadinessScore(blockingResults, warningResults, suggestionResults);

    // Determine status
    const readinessStatus = this.determineReadinessStatus(readinessScore);

    // Build checklist
    const checklist = this.buildChecklist(blockingResults, warningResults, suggestionResults);

    // Generate recommended actions
    const recommendedActions = await this.generateRecommendedActions(pbi, checklist, readinessScore);

    // Generate estimation guidance if ready or nearly ready
    let estimationGuidance: EstimationGuidance | undefined;
    if (readinessScore >= 60) {
      estimationGuidance = await this.generateEstimationGuidance(pbi);
    }

    // Calculate ETA
    const eta = this.calculateReadinessETA(readinessScore, checklist);

    const duration = Date.now() - startTime;
    logInfo(`✓ Readiness evaluation completed in ${duration}ms`);
    logInfo(`  Status: ${readinessStatus} | Score: ${readinessScore}/100`);

    return {
      pbi_id: pbi.pbi_id,
      title: pbi.title,
      readiness_status: this.formatStatus(readinessStatus),
      readiness_score: `${readinessScore}/100`,
      definition_of_ready_checklist: checklist,
      recommended_next_actions: recommendedActions,
      sprint_readiness_eta: eta.eta,
      confidence_in_eta: eta.confidence,
      estimation_guidance: estimationGuidance
    };
  }

  private async evaluateCriteria(
    pbi: PBIWithQuestions,
    criteria: ReadinessCriterion[],
    severity: 'blocking' | 'warning' | 'suggestion'
  ): Promise<CriterionEvaluationResult[]> {
    const results: CriterionEvaluationResult[] = [];

    for (const criterion of criteria) {
      logDebug(`Evaluating criterion: ${criterion.name} (${severity})`);
      const result = await this.evaluateSingleCriterion(pbi, criterion, severity);
      results.push(result);
    }

    return results;
  }

  private async evaluateSingleCriterion(
    pbi: PBIWithQuestions,
    criterion: ReadinessCriterion,
    severity: 'blocking' | 'warning' | 'suggestion'
  ): Promise<CriterionEvaluationResult> {
    const systemPrompt = this.buildEvaluationSystemPrompt(criterion, severity);
    const userPrompt = this.buildEvaluationUserPrompt(pbi, criterion);

    const response = await this.apiClient.sendMessage(
      systemPrompt,
      userPrompt,
      `evaluate_${criterion.id}`
    );

    const evaluation = this.apiClient.parseJSONResponse<any>(response.content, criterion.id);

    return {
      criterion_id: criterion.id,
      status: evaluation.status,
      score: evaluation.score || 0,
      evidence: evaluation.evidence,
      issues: evaluation.issues,
      issue: evaluation.issue,
      note: evaluation.note,
      action_required: evaluation.action_required,
      recommendation: evaluation.recommendation,
      suggestion: evaluation.suggestion
    };
  }

  private buildEvaluationSystemPrompt(criterion: ReadinessCriterion, severity: string): string {
    return `You are an expert Scrum coach evaluating whether a Product Backlog Item (PBI) meets the Definition of Ready criteria.

Your task is to evaluate the "${criterion.name}" criterion.

Description: ${criterion.description}

Evaluation Guide:
${criterion.evaluation_prompt}

Severity Level: ${severity.toUpperCase()}

Respond with a JSON object in this format:
{
  "status": "PASS" | "FAIL" | "WARNING" | "SUGGESTION" | "MOSTLY",
  "score": <0-${criterion.weight}>,
  "evidence": "<brief explanation of why it passed/failed>",
  "issues": ["<specific issue 1>", "<issue 2>"],  // if FAIL
  "issue": "<main issue>",  // if WARNING
  "note": "<observation>",  // if SUGGESTION
  "action_required": "<what needs to be done>",  // if FAIL
  "recommendation": "<suggested improvement>",  // if WARNING
  "suggestion": "<optional improvement>"  // if SUGGESTION
}

Be objective and evidence-based. Reference specific details from the PBI.`;
  }

  private buildEvaluationUserPrompt(pbi: PBIWithQuestions, criterion: ReadinessCriterion): string {
    const criticalQuestions = pbi.unanswered_questions.critical.length;
    const highQuestions = pbi.unanswered_questions.high.length;
    const mediumQuestions = pbi.unanswered_questions.medium.length;

    return `Evaluate this PBI against the "${criterion.name}" criterion:

PBI ID: ${pbi.pbi_id}
Title: ${pbi.title}

Unanswered Questions:
- Critical: ${criticalQuestions} questions
- High Priority: ${highQuestions} questions
- Medium Priority: ${mediumQuestions} questions

${criticalQuestions > 0 ? `\nCritical Questions:\n${pbi.unanswered_questions.critical.map(q => `- ${q.question}`).join('\n')}` : ''}

${highQuestions > 0 ? `\nHigh Priority Questions:\n${pbi.unanswered_questions.high.map(q => `- ${q.question}`).join('\n')}` : ''}

Complexity Score: ${pbi.complexity_score || 'Not assessed'}
Recommended Split: ${pbi.recommended_split ? 'Yes' : 'No'}
${pbi.split_suggestion ? `Split Suggestion: ${pbi.split_suggestion}` : ''}

Evaluate and provide your assessment in JSON format.`;
  }

  private calculateReadinessScore(
    blocking: CriterionEvaluationResult[],
    warnings: CriterionEvaluationResult[],
    suggestions: CriterionEvaluationResult[]
  ): number {
    const blockingScore = blocking.reduce((sum, r) => sum + r.score, 0);
    const warningScore = warnings.reduce((sum, r) => sum + r.score, 0);
    const suggestionScore = suggestions.reduce((sum, r) => sum + r.score, 0);

    const totalScore = blockingScore + warningScore + suggestionScore;
    return Math.round(totalScore);
  }

  private determineReadinessStatus(score: number): 'READY' | 'NEEDS_REFINEMENT' | 'NOT_READY' {
    if (score >= this.config.thresholds.ready) {
      return 'READY';
    } else if (score >= this.config.thresholds.needs_refinement) {
      return 'NEEDS_REFINEMENT';
    } else {
      return 'NOT_READY';
    }
  }

  private formatStatus(status: string): string {
    const icons = this.config.status_icons;
    switch (status) {
      case 'READY':
        return icons.ready;
      case 'NEEDS_REFINEMENT':
        return icons.needs_refinement;
      case 'NOT_READY':
        return icons.not_ready;
      default:
        return status;
    }
  }

  private buildChecklist(
    blocking: CriterionEvaluationResult[],
    warnings: CriterionEvaluationResult[],
    suggestions: CriterionEvaluationResult[]
  ): ChecklistResult {
    const result: ChecklistResult = {
      passed: {},
      blocking_failures: {},
      warnings: {},
      suggestions: {}
    };

    // Process blocking criteria
    for (const item of blocking) {
      const evaluation: CriterionEvaluation = {
        status: item.status,
        evidence: item.evidence,
        severity: 'BLOCKING',
        issues: item.issues,
        action_required: item.action_required
      };

      if (item.status === 'PASS') {
        result.passed[item.criterion_id] = evaluation;
      } else {
        result.blocking_failures![item.criterion_id] = evaluation;
      }
    }

    // Process warnings
    for (const item of warnings) {
      const evaluation: CriterionEvaluation = {
        status: item.status,
        evidence: item.evidence,
        severity: 'WARNING',
        issue: item.issue,
        recommendation: item.recommendation
      };

      if (item.status === 'PASS') {
        result.passed[item.criterion_id] = evaluation;
      } else {
        result.warnings![item.criterion_id] = evaluation;
      }
    }

    // Process suggestions
    for (const item of suggestions) {
      const evaluation: CriterionEvaluation = {
        status: item.status,
        note: item.note,
        suggestion: item.suggestion
      };

      result.suggestions![item.criterion_id] = evaluation;
    }

    return result;
  }

  private async generateRecommendedActions(
    pbi: PBIWithQuestions,
    checklist: ChecklistResult,
    score: number
  ): Promise<RecommendedActions> {
    // For now, use a simple rule-based approach
    // In a production system, this could also use Claude AI

    const actions: RecommendedActions = {
      immediate: [],
      before_sprint: []
    };

    // Add actions based on blocking failures
    if (checklist.blocking_failures && Object.keys(checklist.blocking_failures).length > 0) {
      for (const [, evaluation] of Object.entries(checklist.blocking_failures)) {
        if (evaluation.action_required) {
          actions.immediate!.push({
            action: evaluation.action_required,
            priority: 'CRITICAL'
          });
        }
      }
    }

    // Add actions for critical questions
    if (pbi.unanswered_questions.critical.length > 0) {
      actions.immediate!.push({
        action: `Answer ${pbi.unanswered_questions.critical.length} critical questions`,
        priority: 'CRITICAL',
        estimated_time: `${pbi.unanswered_questions.critical.length * 30} minutes`
      });
    }

    // Add actions for warnings
    if (checklist.warnings && Object.keys(checklist.warnings).length > 0) {
      for (const [, evaluation] of Object.entries(checklist.warnings)) {
        if (evaluation.recommendation) {
          actions.before_sprint!.push({
            action: evaluation.recommendation,
            priority: 'MEDIUM'
          });
        }
      }
    }

    // Determine if sprint ready
    actions.sprint_ready = score >= this.config.thresholds.ready;

    return actions;
  }

  private async generateEstimationGuidance(pbi: PBIWithQuestions): Promise<EstimationGuidance> {
    // Simple estimation guidance based on complexity
    const complexity = pbi.complexity_score || 5;

    return {
      complexity_factors: [
        complexity > 7 ? 'High complexity' : 'Moderate complexity',
        pbi.recommended_split ? 'Recommended to split' : 'Appropriate size'
      ],
      recommended_estimate: complexity > 7 ? '5-8 story points' : '2-5 story points',
      confidence: complexity > 7 ? 'MEDIUM' : 'HIGH'
    };
  }

  private calculateReadinessETA(
    score: number,
    checklist: ChecklistResult
  ): { eta: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
    if (score >= this.config.thresholds.ready) {
      return { eta: 'Ready now', confidence: 'HIGH' };
    }

    const blockingCount = Object.keys(checklist.blocking_failures || {}).length;

    if (blockingCount > 3) {
      return { eta: '2-3 weeks', confidence: 'MEDIUM' };
    } else if (blockingCount > 0) {
      return { eta: '3-5 days', confidence: 'MEDIUM' };
    } else {
      return { eta: '1-2 days', confidence: 'HIGH' };
    }
  }
}
