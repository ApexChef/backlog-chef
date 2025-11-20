/**
 * Step 7: Readiness Checker
 *
 * Evaluates PBIs against Definition of Ready criteria
 */

import { BaseStep } from './base-step';
import { ModelRouter } from '../../ai/router';
import { PipelineContext, ReadinessCheckerResult, ReadinessAssessment } from '../types/pipeline-types';

interface RawReadinessCheck {
  readiness_status: '🟢 READY' | '🟡 NEEDS REFINEMENT' | '🔴 NOT READY';
  readiness_score: number;
  blocking_issues: string[];
  warnings: string[];
  recommendations: string[];
  sprint_ready: boolean;
  estimated_refinement_time?: string;
}

/**
 * Step 7: Readiness Checker
 *
 * Purpose: Evaluate PBIs against Definition of Ready criteria
 * Input: Risk-assessed PBIs with questions from previous steps
 * Output: Readiness status with actionable recommendations
 */
export class ReadinessCheckerStep extends BaseStep {
  readonly name = 'readiness_checker';
  readonly description = 'Evaluate against Definition of Ready';

  canExecute(context: PipelineContext): boolean {
    return !!context.risksAssessed && context.risksAssessed.pbis_with_risks.length > 0;
  }

  protected async executeStep(
    context: PipelineContext,
    router: ModelRouter
  ): Promise<PipelineContext> {
    const assessedPBIs: ReadinessCheckerResult['assessed_pbis'] = [];

    for (const riskPBI of context.risksAssessed!.pbis_with_risks) {
      console.log(`  Checking readiness for: ${riskPBI.pbi.id} - ${riskPBI.pbi.title}`);

      // Get questions for this PBI from Step 6
      const pbiQuestions = context.questionsGenerated?.pbis_with_questions.find(
        q => q.pbi_id === riskPBI.pbi.id
      );

      const readiness = await this.checkReadiness(riskPBI, pbiQuestions, context, router);

      assessedPBIs.push({
        pbi: riskPBI.pbi,
        scores: riskPBI.scores,
        context: riskPBI.context,
        risks: riskPBI.risks,
        questions: [], // We'll populate from Step 6 if needed
        readiness,
      });

      console.log(`    Status: ${readiness.readiness_status} (Score: ${readiness.readiness_score}/100)`);
    }

    context.readinessAssessed = { assessed_pbis: assessedPBIs };
    console.log(`  Total: ${assessedPBIs.length} PBIs assessed for readiness`);

    return context;
  }

  /**
   * Check readiness against Definition of Ready
   */
  private async checkReadiness(
    riskPBI: any,
    pbiQuestions: any,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<ReadinessAssessment> {
    const systemPrompt = `You are an expert Scrum Master evaluating Product Backlog Items against the Definition of Ready.

Evaluate the PBI against these criteria:

BLOCKING CRITERIA (Must Pass):
1. Has Clear Business Value - Articulates who, what, why
2. Has Acceptance Criteria - Testable, specific criteria defined
3. Scope is Defined - In/out of scope explicitly stated
4. Has Technical Approach - Solution direction agreed upon
5. Dependencies Resolved - All blocking dependencies handled
6. Key Questions Answered - Critical questions resolved
7. Estimable by Team - Sufficient information to estimate

WARNING CRITERIA (Should Pass):
8. Small Enough for Sprint - Fits within sprint capacity
9. Design Approved - UX/UI designs reviewed (if applicable)
10. Performance Requirements - Performance baseline defined (if applicable)

Provide:
- readiness_status: "🟢 READY" (all blocking pass), "🟡 NEEDS REFINEMENT" (some blocking fail), or "🔴 NOT READY" (many blocking fail)
- readiness_score: 0-100 (weighted score)
- blocking_issues: List of failing blocking criteria
- warnings: List of failing warning criteria
- recommendations: Specific actions to improve readiness
- sprint_ready: true/false
- estimated_refinement_time: Estimate (e.g., "2-4 hours", "1 day") if not ready

Respond ONLY with valid JSON in this exact format:
{
  "readiness_status": "🟢 READY" | "🟡 NEEDS REFINEMENT" | "🔴 NOT READY",
  "readiness_score": 85,
  "blocking_issues": ["Issue 1", "Issue 2"],
  "warnings": ["Warning 1"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "sprint_ready": true,
  "estimated_refinement_time": "2-4 hours"
}`;

    const userPrompt = `Evaluate this PBI for sprint readiness:

Title: ${riskPBI.pbi.title}
Description: ${riskPBI.pbi.description}

Acceptance Criteria: ${riskPBI.pbi.acceptance_criteria?.length || 0} defined
${riskPBI.pbi.acceptance_criteria?.map((ac: string) => `- ${ac}`).join('\n') || 'None defined'}

Quality Scores:
- Overall: ${riskPBI.scores.overall_score}/100
- Completeness: ${riskPBI.scores.completeness}/100
- Clarity: ${riskPBI.scores.clarity}/100
- Actionability: ${riskPBI.scores.actionability}/100
- Testability: ${riskPBI.scores.testability}/100

Missing Elements: ${riskPBI.scores.missing_elements.join(', ')}
Concerns: ${riskPBI.scores.concerns.join(', ')}

Risk Assessment:
- Overall Risk Level: ${riskPBI.risks.overall_risk_level.toUpperCase()}
- Identified Risks: ${riskPBI.risks.risks.length}

${pbiQuestions ? `Unanswered Questions:
- Critical: ${pbiQuestions.unanswered_questions.critical.length}
- High: ${pbiQuestions.unanswered_questions.high.length}
- Medium: ${pbiQuestions.unanswered_questions.medium.length}
- Low: ${pbiQuestions.unanswered_questions.low.length}` : 'No questions data available'}

Context:
- Similar Work: ${riskPBI.context.similar_work.length} items
- Past Decisions: ${riskPBI.context.past_decisions.length} decisions
- Suggestions: ${riskPBI.context.suggestions.length} suggestions`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<RawReadinessCheck>(
      responseContent,
      'Readiness Check'
    );

    return {
      readiness_status: response.readiness_status,
      readiness_score: response.readiness_score,
      blocking_issues: response.blocking_issues || [],
      warnings: response.warnings || [],
      recommendations: response.recommendations || [],
      sprint_ready: response.sprint_ready,
      estimated_refinement_time: response.estimated_refinement_time,
    };
  }
}
