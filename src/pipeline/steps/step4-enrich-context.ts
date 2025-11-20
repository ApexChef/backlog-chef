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
   * Search for context using real project documentation
   * Reads TABLE-OF-CONTENTS.md and searches relevant docs based on keywords
   */
  private async searchForContext(
    scoredPBI: any,
    searchQuery: SearchQuery,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<RawContextSearch> {
    // Step 1: Read TABLE-OF-CONTENTS.md
    const fs = await import('fs');
    const path = await import('path');

    const tocPath = path.join(__dirname, '../../../docs/TABLE-OF-CONTENTS.md');
    let tocContent = '';

    try {
      tocContent = fs.readFileSync(tocPath, 'utf-8');
    } catch (error) {
      console.warn(`  [Warning] Could not read TABLE-OF-CONTENTS.md: ${error}`);
      // Fall back to empty search if TOC doesn't exist
      return {
        similar_work: [],
        past_decisions: [],
        technical_docs: [],
      };
    }

    // Step 2: Use AI to identify relevant documents from TOC
    const relevantDocs = await this.identifyRelevantDocs(
      scoredPBI,
      searchQuery,
      tocContent,
      context,
      router
    );

    // Step 3: Read the actual documentation files
    const docContents = await this.readDocumentationFiles(relevantDocs);

    // Step 4: Use AI to extract context from real documentation
    const extractedContext = await this.extractContextFromDocs(
      scoredPBI,
      searchQuery,
      docContents,
      context,
      router
    );

    return extractedContext;
  }

  /**
   * Use AI to identify which docs from TOC are most relevant
   */
  private async identifyRelevantDocs(
    scoredPBI: any,
    searchQuery: SearchQuery,
    tocContent: string,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<string[]> {
    const systemPrompt = `You are analyzing a documentation Table of Contents to find relevant documents for a Product Backlog Item.

Given the PBI and its search queries (keywords, concepts, technologies), identify the 3-5 MOST RELEVANT documentation files from the Table of Contents.

Focus on documents that would contain:
1. Similar past work or features
2. Architectural decisions relevant to this PBI
3. Technical implementation guidelines
4. Constraints or patterns that apply

Respond ONLY with valid JSON in this exact format:
{
  "relevant_docs": [
    "docs/path/to/doc1.md",
    "docs/path/to/doc2.md"
  ]
}

Return only the file paths from the TOC, not invented paths.`;

    const userPrompt = `Find relevant documentation for this PBI:

Title: ${scoredPBI.pbi.title}
Description: ${scoredPBI.pbi.description}

Search Keywords: ${searchQuery.keywords.join(', ')}
Concepts: ${searchQuery.concepts.join(', ')}
Technologies: ${searchQuery.technologies.join(', ')}

TABLE OF CONTENTS:
${tocContent}

Select the 3-5 most relevant documents from the TOC above.`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<{ relevant_docs: string[] }>(
      responseContent,
      'Relevant Docs Identification'
    );

    return response.relevant_docs || [];
  }

  /**
   * Read actual documentation files from disk
   */
  private async readDocumentationFiles(
    docPaths: string[]
  ): Promise<Array<{ path: string; content: string }>> {
    const fs = await import('fs');
    const path = await import('path');
    const results: Array<{ path: string; content: string }> = [];

    for (const docPath of docPaths) {
      try {
        const fullPath = path.join(__dirname, '../../../', docPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        results.push({ path: docPath, content });
      } catch (error) {
        console.warn(`  [Warning] Could not read ${docPath}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Extract structured context from actual documentation using AI
   */
  private async extractContextFromDocs(
    scoredPBI: any,
    searchQuery: SearchQuery,
    docContents: Array<{ path: string; content: string }>,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<RawContextSearch> {
    if (docContents.length === 0) {
      return {
        similar_work: [],
        past_decisions: [],
        technical_docs: [],
      };
    }

    const systemPrompt = `You are extracting relevant context from real project documentation to enrich a Product Backlog Item.

Analyze the provided documentation and extract:
1. Similar Work - Past features or implementations that relate to this PBI (if found in docs)
2. Past Decisions - Architectural decisions or patterns documented that apply (if found)
3. Technical Documentation - Relevant technical guidelines or specifications (if found)

For each item, provide:
- ref: Document reference (use the doc filename)
- title: Brief descriptive title
- Specific details from the ACTUAL documentation content (not invented)
- link: Use the doc path as the link

If certain categories have no relevant information in the docs, return empty arrays for those categories.

Respond ONLY with valid JSON in this exact format:
{
  "similar_work": [
    {
      "ref": "filename.md",
      "title": "Brief title from doc",
      "similarity": 75,
      "learnings": ["Actual learning from doc"],
      "link": "docs/path/to/doc.md"
    }
  ],
  "past_decisions": [
    {
      "ref": "filename.md",
      "title": "Decision title from doc",
      "decision": "What was decided (from doc)",
      "rationale": "Why (from doc)",
      "constraints": "Constraints mentioned",
      "date": "Date if mentioned"
    }
  ],
  "technical_docs": [
    {
      "ref": "filename.md",
      "title": "Doc title",
      "relevant_sections": ["Section names from doc"],
      "content": "Brief excerpt from actual doc",
      "note": "Why this doc is relevant",
      "link": "docs/path/to/doc.md"
    }
  ]
}`;

    const docsText = docContents
      .map(
        (doc) =>
          `=== ${doc.path} ===\n${doc.content.substring(0, 3000)}...\n`
      )
      .join('\n\n');

    const userPrompt = `Extract relevant context for this PBI from the actual project documentation:

PBI Title: ${scoredPBI.pbi.title}
PBI Description: ${scoredPBI.pbi.description}

Search Keywords: ${searchQuery.keywords.join(', ')}

DOCUMENTATION CONTENT:
${docsText}

Extract ONLY information that actually exists in the documentation above. Do not invent references.`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<RawContextSearch>(
      responseContent,
      'Context Extraction from Real Docs'
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
