/**
 * Step 4: Enrich with Context
 *
 * Enriches PBIs with relevant historical context, similar work, and past decisions
 */

import { BaseStep } from './base-step';
import { ModelRouter } from '../../ai/router';
import {
  PipelineContext,
  EnrichContextResult,
  ContextEnrichment,
  SimilarWork,
  PastDecision,
  TechnicalDoc,
  RiskFlag,
} from '../types/pipeline-types';

interface SearchQuery {
  keywords: string[];
  concepts: string[];
  technologies: string[];
}

interface RawSimilarWork {
  ref: string;
  title: string;
  similarity: number;
  learnings: string[];
  link: string;
}

interface RawPastDecision {
  ref: string;
  title: string;
  decision: string;
  rationale: string;
  constraints?: string;
  assigned_architect?: string;
  date?: string;
}

interface RawTechnicalDoc {
  ref: string;
  title: string;
  relevant_sections?: string[];
  content?: string;
  note?: string;
  link: string;
}

interface RawRiskFlag {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

interface RawContextSearch {
  similar_work: RawSimilarWork[];
  past_decisions: RawPastDecision[];
  technical_docs: RawTechnicalDoc[];
}

/**
 * Step 4: Enrich with Context
 *
 * Purpose: Add historical context, similar work, and past decisions to PBIs
 * Input: Scored PBIs from Step 3
 * Output: PBIs enriched with searchable context and AI-generated insights
 */
export class EnrichContextStep extends BaseStep {
  readonly name = 'enrich_context';
  readonly description = 'Add historical context and similar work references';

  canExecute(context: PipelineContext): boolean {
    return !!context.scoredPBIs && context.scoredPBIs.scored_pbis.length > 0;
  }

  protected async executeStep(
    context: PipelineContext,
    router: ModelRouter
  ): Promise<PipelineContext> {
    const enrichedPBIs: EnrichContextResult['enriched_pbis'] = [];

    for (const scoredPBI of context.scoredPBIs!.scored_pbis) {
      console.log(`  Enriching PBI: ${scoredPBI.pbi.id} - ${scoredPBI.pbi.title}`);

      // Step 1: Generate search queries
      const searchQuery = await this.generateSearchQueries(
        scoredPBI,
        context,
        router
      );

      // Step 2: Search for context (simulated with AI)
      const searchResults = await this.searchForContext(
        scoredPBI,
        searchQuery,
        context,
        router
      );

      // Step 3: Analyze risks based on context
      const riskFlags = await this.analyzeRisks(
        scoredPBI,
        searchResults.similar_work,
        context,
        router
      );

      // Step 4: Generate suggestions
      const suggestions = await this.generateSuggestions(
        scoredPBI,
        searchResults,
        context,
        router
      );

      // Compile enrichment
      const contextEnrichment: ContextEnrichment = {
        similar_work: searchResults.similar_work,
        past_decisions: searchResults.past_decisions,
        technical_docs: searchResults.technical_docs,
        risk_flags: riskFlags,
        suggestions: suggestions,
      };

      enrichedPBIs.push({
        pbi: scoredPBI.pbi,
        scores: scoredPBI.scores,
        context: contextEnrichment,
      });

      console.log(
        `    Found: ${contextEnrichment.similar_work.length} similar work, ` +
        `${contextEnrichment.past_decisions.length} decisions, ` +
        `${contextEnrichment.technical_docs.length} docs, ` +
        `${contextEnrichment.risk_flags.length} risk flags`
      );
    }

    context.enrichedPBIs = { enriched_pbis: enrichedPBIs };
    console.log(`  Total: ${enrichedPBIs.length} PBIs enriched`);

    return context;
  }

  /**
   * Generate search queries using AI
   */
  private async generateSearchQueries(
    scoredPBI: any,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<SearchQuery> {
    const systemPrompt = `You are an expert at extracting search queries from Product Backlog Items.

Given a PBI, extract:
1. Keywords - Important terms that would appear in related work (5-10 keywords)
2. Concepts - High-level concepts and domains (3-5 concepts)
3. Technologies - Specific technologies, platforms, or tools mentioned (2-5 technologies)

Respond ONLY with valid JSON in this exact format:
{
  "keywords": ["keyword1", "keyword2", ...],
  "concepts": ["concept1", "concept2", ...],
  "technologies": ["tech1", "tech2", ...]
}`;

    const userPrompt = `Extract search queries from this PBI:

Title: ${scoredPBI.pbi.title}
Description: ${scoredPBI.pbi.description}

${scoredPBI.pbi.acceptance_criteria ? `Acceptance Criteria:\n${scoredPBI.pbi.acceptance_criteria.map((ac: string) => `- ${ac}`).join('\n')}` : ''}`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<SearchQuery>(
      responseContent,
      'Search Query Generation'
    );

    return {
      keywords: response.keywords || [],
      concepts: response.concepts || [],
      technologies: response.technologies || [],
    };
  }

  /**
   * Search for context using AI
   * (In production, this would query real systems like Azure DevOps, Confluence, etc.)
   */
  private async searchForContext(
    scoredPBI: any,
    searchQuery: SearchQuery,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<RawContextSearch> {
    const systemPrompt = `You are simulating a search system that finds relevant historical context for Product Backlog Items.

Based on the PBI and search queries, generate realistic examples of:
1. Similar Work - Past PBIs that addressed similar problems (2-4 items)
2. Past Decisions - Architectural or business decisions relevant to this work (1-3 items)
3. Technical Documentation - Relevant technical specs or guidelines (1-3 items)

Make the references realistic with plausible IDs, dates, and links to enterprise systems (Azure DevOps, Confluence, SharePoint).

Respond ONLY with valid JSON in this exact format:
{
  "similar_work": [
    {
      "ref": "PBI-2023-156",
      "title": "Title of past work",
      "similarity": 85,
      "learnings": ["Learning 1", "Learning 2"],
      "link": "https://dev.azure.com/company/project/_workitems/edit/156"
    }
  ],
  "past_decisions": [
    {
      "ref": "ADR-2024-03",
      "title": "Architecture Decision Title",
      "decision": "What was decided",
      "rationale": "Why it was decided",
      "constraints": "Any constraints",
      "assigned_architect": "Architect Name",
      "date": "2024-03-15"
    }
  ],
  "technical_docs": [
    {
      "ref": "CONF-2024-89",
      "title": "Technical Document Title",
      "relevant_sections": ["Section 1", "Section 2"],
      "content": "Brief excerpt of relevant content",
      "note": "Why this document is relevant",
      "link": "https://confluence.company.com/display/TECH/Doc89"
    }
  ]
}`;

    const userPrompt = `Find context for this PBI:

Title: ${scoredPBI.pbi.title}
Description: ${scoredPBI.pbi.description}

Search Queries:
Keywords: ${searchQuery.keywords.join(', ')}
Concepts: ${searchQuery.concepts.join(', ')}
Technologies: ${searchQuery.technologies.join(', ')}

Quality Score: ${scoredPBI.scores.overall_score}/100`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<RawContextSearch>(
      responseContent,
      'Context Search'
    );

    return {
      similar_work: response.similar_work || [],
      past_decisions: response.past_decisions || [],
      technical_docs: response.technical_docs || [],
    };
  }

  /**
   * Analyze risks based on historical context
   */
  private async analyzeRisks(
    scoredPBI: any,
    similarWork: RawSimilarWork[],
    context: PipelineContext,
    router: ModelRouter
  ): Promise<RiskFlag[]> {
    const systemPrompt = `You are an expert at identifying risks based on historical context.

Given a PBI and similar past work, identify potential risks by analyzing:
1. Learnings from similar past work
2. Common pitfalls in this domain
3. Known constraints or limitations

Each risk should have:
- type: Brief category (e.g., "License Constraint", "Technical Complexity")
- severity: HIGH, MEDIUM, or LOW
- message: Specific risk description

Respond ONLY with valid JSON in this exact format:
{
  "risk_flags": [
    {
      "type": "License Constraint",
      "severity": "HIGH",
      "message": "Past work shows license pool was bottleneck"
    }
  ]
}

Limit to 3-5 most important risks. Return empty array if no significant risks identified.`;

    const userPrompt = `Analyze risks for this PBI:

Title: ${scoredPBI.pbi.title}
Description: ${scoredPBI.pbi.description}

Similar Past Work:
${similarWork.map(w => `- ${w.title} (${w.similarity}% similar)\n  Learnings: ${w.learnings.join(', ')}`).join('\n')}

Missing Elements: ${scoredPBI.scores.missing_elements.join(', ')}
Concerns: ${scoredPBI.scores.concerns.join(', ')}`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<{ risk_flags: RawRiskFlag[] }>(
      responseContent,
      'Risk Analysis'
    );

    return response.risk_flags || [];
  }

  /**
   * Generate suggestions based on context
   */
  private async generateSuggestions(
    scoredPBI: any,
    searchResults: RawContextSearch,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<string[]> {
    const systemPrompt = `You are an expert consultant providing actionable suggestions for Product Backlog Items.

Based on the PBI and its historical context, provide 3-5 specific, actionable suggestions that would:
1. Improve the PBI's clarity or completeness
2. Leverage learnings from similar work
3. Address gaps identified in quality scoring
4. Follow relevant technical guidelines
5. Mitigate known risks

Each suggestion should be a single, clear sentence focused on action.

Respond ONLY with valid JSON in this exact format:
{
  "suggestions": [
    "Clear, specific suggestion 1",
    "Clear, specific suggestion 2"
  ]
}`;

    const userPrompt = `Generate suggestions for this PBI:

Title: ${scoredPBI.pbi.title}
Description: ${scoredPBI.pbi.description}

Quality Scores:
- Overall: ${scoredPBI.scores.overall_score}/100
- Completeness: ${scoredPBI.scores.completeness}/100
- Clarity: ${scoredPBI.scores.clarity}/100

Missing Elements: ${scoredPBI.scores.missing_elements.join(', ')}

Similar Work Found: ${searchResults.similar_work.length} items
Past Decisions: ${searchResults.past_decisions.length} items
Technical Docs: ${searchResults.technical_docs.length} items

Key Learnings from Similar Work:
${searchResults.similar_work.flatMap(w => w.learnings).slice(0, 5).map(l => `- ${l}`).join('\n')}`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<{ suggestions: string[] }>(
      responseContent,
      'Suggestion Generation'
    );

    return response.suggestions || [];
  }
}
