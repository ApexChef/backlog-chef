/**
 * Step 5: Check Risks & Conflicts
 *
 * Analyzes enriched PBIs for risks, conflicts, and complexity
 */

import { BaseStep } from './base-step';
import { ModelRouter } from '../../ai/router';
import { PipelineContext, CheckRisksResult, RiskAssessment } from '../types/pipeline-types';

interface RawRisk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

interface RawRiskAnalysis {
  risks: RawRisk[];
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
  complexity_score?: number;
  recommended_split?: boolean;
  split_suggestion?: string;
}

/**
 * Step 5: Check Risks & Conflicts
 *
 * Purpose: Identify risks, conflicts, and complexity in enriched PBIs
 * Input: Enriched PBIs from Step 4
 * Output: PBIs with comprehensive risk assessment and mitigation strategies
 */
export class CheckRisksStep extends BaseStep {
  readonly name = 'check_risks';
  readonly description = 'Analyze risks, conflicts, and complexity';

  canExecute(context: PipelineContext): boolean {
    return !!context.enrichedPBIs && context.enrichedPBIs.enriched_pbis.length > 0;
  }

  protected async executeStep(
    context: PipelineContext,
    router: ModelRouter
  ): Promise<PipelineContext> {
    const pbisWithRisks: CheckRisksResult['pbis_with_risks'] = [];

    for (const enrichedPBI of context.enrichedPBIs!.enriched_pbis) {
      console.log(`  Analyzing risks for: ${enrichedPBI.pbi.id} - ${enrichedPBI.pbi.title}`);

      const riskAnalysis = await this.analyzeRisks(enrichedPBI, context, router);

      const riskAssessment: RiskAssessment = {
        risks: riskAnalysis.risks.map(r => ({
          type: this.normalizeRiskType(r.type),
          severity: r.severity,
          description: r.description,
          mitigation: r.mitigation,
        })),
        overall_risk_level: riskAnalysis.overall_risk_level,
      };

      pbisWithRisks.push({
        pbi: enrichedPBI.pbi,
        scores: enrichedPBI.scores,
        context: enrichedPBI.context,
        risks: riskAssessment,
      });

      console.log(
        `    Risk Level: ${riskAssessment.overall_risk_level.toUpperCase()} ` +
        `(${riskAssessment.risks.length} risks identified)`
      );
    }

    context.risksAssessed = { pbis_with_risks: pbisWithRisks };
    console.log(`  Total: ${pbisWithRisks.length} PBIs analyzed for risks`);

    return context;
  }

  /**
   * Analyze risks using AI
   */
  private async analyzeRisks(
    enrichedPBI: any,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<RawRiskAnalysis> {
    const systemPrompt = `You are an expert risk analyst evaluating Product Backlog Items for potential risks and conflicts.

Analyze the PBI and its context to identify risks in these categories:
1. Blocking Dependencies - External dependencies that could block progress
2. Technical Complexity - Complexity that could delay or derail implementation
3. Scope Creep - Unclear boundaries that could lead to scope expansion
4. Resource Conflicts - Competing priorities or resource constraints
5. Data/Integration Risks - Data quality, integration challenges

For each risk, provide:
- type: Category from above
- severity: low, medium, high, or critical
- description: Clear description of the risk
- mitigation: Suggested mitigation strategy

Also assess:
- overall_risk_level: low, medium, high, or critical
- complexity_score (optional): 0-10 if complexity is notable
- recommended_split (optional): true if PBI should be split

Respond ONLY with valid JSON in this exact format:
{
  "risks": [
    {
      "type": "dependency" | "scope_creep" | "blocker" | "technical_debt" | "resource",
      "severity": "low" | "medium" | "high" | "critical",
      "description": "Clear risk description",
      "mitigation": "Suggested mitigation"
    }
  ],
  "overall_risk_level": "low" | "medium" | "high" | "critical",
  "complexity_score": 0-10,
  "recommended_split": false,
  "split_suggestion": "How to split if recommended"
}

Limit to 3-5 most significant risks. Return empty risks array if no significant risks identified.`;

    const userPrompt = `Analyze risks for this enriched PBI:

Title: ${enrichedPBI.pbi.title}
Description: ${enrichedPBI.pbi.description}

Quality Scores:
- Overall: ${enrichedPBI.scores.overall_score}/100
- Completeness: ${enrichedPBI.scores.completeness}/100
- Clarity: ${enrichedPBI.scores.clarity}/100
- Actionability: ${enrichedPBI.scores.actionability}/100

Missing Elements: ${enrichedPBI.scores.missing_elements.join(', ')}
Concerns: ${enrichedPBI.scores.concerns.join(', ')}

Context Enrichment:
- Similar Work: ${enrichedPBI.context.similar_work.length} items found
${enrichedPBI.context.similar_work.slice(0, 2).map((w: any) => `  • ${w.title}: ${w.learnings.join(', ')}`).join('\n')}

- Past Decisions: ${enrichedPBI.context.past_decisions.length} decisions
${enrichedPBI.context.past_decisions.map((d: any) => `  • ${d.title}: ${d.decision}`).join('\n')}

- Risk Flags from Context:
${enrichedPBI.context.risk_flags.map((r: any) => `  • [${r.severity}] ${r.type}: ${r.message}`).join('\n')}

- Suggestions:
${enrichedPBI.context.suggestions.map((s: string) => `  • ${s}`).join('\n')}`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<RawRiskAnalysis>(
      responseContent,
      'Risk Analysis'
    );

    return {
      risks: response.risks || [],
      overall_risk_level: response.overall_risk_level || 'low',
      complexity_score: response.complexity_score,
      recommended_split: response.recommended_split,
      split_suggestion: response.split_suggestion,
    };
  }

  /**
   * Normalize risk type to standard types
   */
  private normalizeRiskType(
    type: string
  ): 'dependency' | 'scope_creep' | 'blocker' | 'technical_debt' | 'resource' {
    const lowerType = type.toLowerCase();

    if (lowerType.includes('depend')) return 'dependency';
    if (lowerType.includes('scope') || lowerType.includes('creep')) return 'scope_creep';
    if (lowerType.includes('block')) return 'blocker';
    if (lowerType.includes('technical') || lowerType.includes('debt') || lowerType.includes('complex'))
      return 'technical_debt';
    if (lowerType.includes('resource')) return 'resource';

    // Default to technical_debt for unknown types
    return 'technical_debt';
  }
}
