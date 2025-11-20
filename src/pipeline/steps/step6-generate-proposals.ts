/**
 * Step 6: Generate Questions & Proposals
 *
 * Identifies unanswered questions in PBIs and generates AI-powered proposals
 */

import { BaseStep } from './base-step';
import { ModelRouter } from '../../ai/router';
import {
  PipelineContext,
  GenerateProposalsResult,
  QuestionWithAnswer,
  QuestionsByPriority,
  QuestionPriority,
  QuestionCategory,
  ProposalConfidence,
  ProposedAnswer,
  DocumentationSearch,
  Stakeholder,
} from '../types/pipeline-types';

interface RawQuestion {
  question: string;
  category: string;
  priority: QuestionPriority;
  rationale: string;
  impact_if_unanswered: string;
}

interface RawProposal {
  confidence: ProposalConfidence;
  suggestion: string;
  rationale: string;
  alternatives?: string[];
  legal_considerations?: string[];
  performance_recommendations?: string[];
  technical_implementation?: string[];
  risk?: string;
}

interface RawDocSearch {
  found: boolean;
  sources?: Array<{
    title: string;
    excerpt: string;
    link: string;
    relevance?: number;
    note?: string;
  }>;
  note?: string;
}

/**
 * Step 6: Generate Questions & Proposals
 *
 * Purpose: Identify unanswered questions and generate intelligent proposals
 * Input: Scored PBIs from Step 3
 * Output: Questions grouped by priority with AI-generated proposed answers
 */
export class GenerateProposalsStep extends BaseStep {
  readonly name = 'generate_proposals';
  readonly description = 'Generate questions and AI-powered proposals';

  private questionIdCounter = 1;
  private stakeholderRegistry: Map<string, Stakeholder[]> = new Map();

  constructor() {
    super();
    this.initializeStakeholderRegistry();
  }

  /**
   * Initialize simple stakeholder registry
   * In a real implementation, this would load from config/stakeholders.yaml
   */
  private initializeStakeholderRegistry(): void {
    // Map question categories to stakeholders
    this.stakeholderRegistry.set('Business', [
      { role: 'Product Owner', name: 'Product Owner', email: 'po@example.com' },
    ]);
    this.stakeholderRegistry.set('Technical', [
      { role: 'Technical Lead', name: 'Tech Lead', email: 'tech@example.com' },
    ]);
    this.stakeholderRegistry.set('Security', [
      { role: 'Security Architect', name: 'Security', email: 'security@example.com' },
    ]);
    this.stakeholderRegistry.set('UX', [
      { role: 'UX Designer', name: 'UX Designer', email: 'ux@example.com' },
    ]);
    this.stakeholderRegistry.set('Data', [
      { role: 'Data Architect', name: 'Data Architect', email: 'data@example.com' },
    ]);
    this.stakeholderRegistry.set('Performance', [
      { role: 'Technical Lead', name: 'Tech Lead', email: 'tech@example.com' },
    ]);

    // Default fallback
    this.stakeholderRegistry.set('default', [
      { role: 'Team', name: 'Development Team', email: 'team@example.com' },
    ]);
  }

  canExecute(context: PipelineContext): boolean {
    return !!context.scoredPBIs && context.scoredPBIs.scored_pbis.length > 0;
  }

  protected async executeStep(
    context: PipelineContext,
    router: ModelRouter
  ): Promise<PipelineContext> {
    const pbisWithQuestions: GenerateProposalsResult['pbis_with_questions'] = [];
    let totalQuestions = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    const stakeholdersSet = new Set<string>();

    // Process each PBI
    for (const scoredPBI of context.scoredPBIs!.scored_pbis) {
      console.log(`  Processing PBI: ${scoredPBI.pbi.id} - ${scoredPBI.pbi.title}`);

      // Step 1: Identify questions
      const rawQuestions = await this.identifyQuestions(
        scoredPBI,
        context,
        router
      );

      // Step 2: Generate questions with proposals
      const questions: QuestionWithAnswer[] = [];
      for (const rawQuestion of rawQuestions) {
        const question = await this.generateQuestionWithProposal(
          rawQuestion,
          scoredPBI,
          context,
          router
        );
        questions.push(question);

        // Track stakeholders
        question.stakeholders.forEach(s => stakeholdersSet.add(s.role));
      }

      // Group questions by priority
      const unanswered_questions: QuestionsByPriority = {
        critical: questions.filter(q => q.priority === 'CRITICAL'),
        high: questions.filter(q => q.priority === 'HIGH'),
        medium: questions.filter(q => q.priority === 'MEDIUM'),
        low: questions.filter(q => q.priority === 'LOW'),
      };

      // Count questions
      criticalCount += unanswered_questions.critical.length;
      highCount += unanswered_questions.high.length;
      mediumCount += unanswered_questions.medium.length;
      lowCount += unanswered_questions.low.length;
      totalQuestions += questions.length;

      pbisWithQuestions.push({
        pbi_id: scoredPBI.pbi.id,
        title: scoredPBI.pbi.title,
        unanswered_questions,
        total_questions: questions.length,
      });

      console.log(
        `    Generated ${questions.length} questions ` +
        `(${unanswered_questions.critical.length} critical, ` +
        `${unanswered_questions.high.length} high, ` +
        `${unanswered_questions.medium.length} medium, ` +
        `${unanswered_questions.low.length} low)`
      );
    }

    context.questionsGenerated = {
      pbis_with_questions: pbisWithQuestions,
      metadata: {
        total_questions: totalQuestions,
        critical_questions: criticalCount,
        high_questions: highCount,
        medium_questions: mediumCount,
        low_questions: lowCount,
        stakeholders_identified: Array.from(stakeholdersSet),
      },
    };

    console.log(`  Total: ${totalQuestions} questions across ${pbisWithQuestions.length} PBIs`);

    return context;
  }

  /**
   * Identify unanswered questions using AI
   */
  private async identifyQuestions(
    scoredPBI: any,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<RawQuestion[]> {
    const systemPrompt = `You are an expert Scrum Product Owner and Business Analyst analyzing a Product Backlog Item (PBI) for unanswered questions and missing information.

Given the PBI information below, identify ALL unanswered questions that need to be addressed before or during implementation.

Focus on identifying questions in these areas:
1. Missing business requirements or unclear acceptance criteria
2. Technical implementation details not specified
3. Security, compliance, or GDPR considerations
4. User experience and interface specifications
5. Data requirements and performance constraints
6. Integration points and dependencies
7. Testing requirements and edge cases
8. Budget, licensing, or resource constraints

For each question you identify:
- Write a clear, specific question
- Assign a category (Business, Technical, Security, UX, Data, Performance, Testing, Legal, Budget, Integration, etc.)
- Determine priority (CRITICAL: blocks start, HIGH: needed for sprint, MEDIUM: affects quality, LOW: nice to have)
- Explain why this question matters

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "question": "The specific question that needs answering",
      "category": "Primary category",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "rationale": "Why this question is important",
      "impact_if_unanswered": "What happens if we don't get an answer"
    }
  ]
}

Be thorough but practical. Focus on questions that genuinely impact implementation or quality.`;

    const userPrompt = `Analyze this PBI and identify unanswered questions:

PBI ID: ${scoredPBI.pbi.id}
Title: ${scoredPBI.pbi.title}
Description: ${scoredPBI.pbi.description}

Quality Scores:
- Overall Score: ${scoredPBI.scores.overall_score}/100
- Completeness: ${scoredPBI.scores.completeness}/100
- Clarity: ${scoredPBI.scores.clarity}/100
- Actionability: ${scoredPBI.scores.actionability}/100
- Testability: ${scoredPBI.scores.testability}/100

Missing Elements: ${scoredPBI.scores.missing_elements.join(', ')}
Concerns: ${scoredPBI.scores.concerns.join(', ')}

${scoredPBI.pbi.acceptance_criteria ? `Acceptance Criteria:\n${scoredPBI.pbi.acceptance_criteria.map((ac: string) => `- ${ac}`).join('\n')}` : ''}
${scoredPBI.pbi.notes ? `Notes:\n${scoredPBI.pbi.notes.map((n: string) => `- ${n}`).join('\n')}` : ''}`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<{ questions: RawQuestion[] }>(
      responseContent,
      'Question Identification'
    );

    return response.questions || [];
  }

  /**
   * Generate a complete question with proposal and documentation search
   */
  private async generateQuestionWithProposal(
    rawQuestion: RawQuestion,
    scoredPBI: any,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<QuestionWithAnswer> {
    // Generate proposal
    const proposal = await this.generateProposal(
      rawQuestion,
      scoredPBI,
      context,
      router
    );

    // Simulate documentation search
    const docSearch = await this.searchDocumentation(
      rawQuestion,
      context,
      router
    );

    // Route to stakeholders
    const stakeholders = this.routeToStakeholders(rawQuestion.category);

    return {
      id: this.generateQuestionId(),
      question: rawQuestion.question,
      category: this.validateCategory(rawQuestion.category),
      priority: rawQuestion.priority,
      stakeholders,
      proposed_answer: proposal,
      documentation_search: docSearch,
    };
  }

  /**
   * Generate AI-powered proposal for a question
   */
  private async generateProposal(
    rawQuestion: RawQuestion,
    scoredPBI: any,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<ProposedAnswer> {
    const systemPrompt = `You are an expert solution architect and consultant providing proposed answers to questions about a Product Backlog Item.

Generate a comprehensive proposed answer for this question including:
1. A suggested solution or answer with specific recommendations
2. Your confidence level (LOW: speculative, MEDIUM: based on patterns/experience, HIGH: based on clear evidence)
3. Clear rationale for your suggestion
4. Alternative approaches (if applicable)
5. Any legal or compliance considerations (if relevant)
6. Performance recommendations (if relevant)
7. Technical implementation notes (if relevant)
8. Potential risks of this approach

Respond ONLY with valid JSON in this exact format:
{
  "confidence": "LOW|MEDIUM|HIGH",
  "suggestion": "Your detailed proposed answer or solution",
  "rationale": "Why this is the recommended approach",
  "alternatives": ["Alternative approach 1", "Alternative approach 2"],
  "legal_considerations": ["Any legal or compliance notes"],
  "performance_recommendations": ["Performance considerations"],
  "technical_implementation": ["Technical notes or code patterns"],
  "risk": "Main risk or caveat of this approach"
}

Be specific and actionable in your suggestions. Reference industry best practices and common patterns where applicable.`;

    const userPrompt = `Generate a proposal for this question:

Question: ${rawQuestion.question}
Category: ${rawQuestion.category}
Priority: ${rawQuestion.priority}
Rationale: ${rawQuestion.rationale}
Impact if Unanswered: ${rawQuestion.impact_if_unanswered}

PBI Context:
ID: ${scoredPBI.pbi.id}
Title: ${scoredPBI.pbi.title}
Description: ${scoredPBI.pbi.description}`;

    // Override maxTokens for proposal generation (needs more tokens for comprehensive proposals)
    const originalMaxTokens = context.options.ai?.maxTokens;
    if (context.options.ai) {
      context.options.ai.maxTokens = 8192; // Increased from default 4096
    }

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    // Restore original maxTokens
    if (context.options.ai && originalMaxTokens !== undefined) {
      context.options.ai.maxTokens = originalMaxTokens;
    }

    const response = this.parseJSONResponse<RawProposal>(
      responseContent,
      'Proposal Generation'
    );

    return {
      confidence: response.confidence,
      suggestion: response.suggestion,
      rationale: response.rationale,
      alternatives: response.alternatives,
      legal_considerations: response.legal_considerations,
      performance_recommendations: response.performance_recommendations,
      risk: response.risk,
      technical_implementation: response.technical_implementation,
    };
  }

  /**
   * Search documentation for relevant information
   * (Simulated search - in production would query real docs)
   */
  private async searchDocumentation(
    rawQuestion: RawQuestion,
    context: PipelineContext,
    router: ModelRouter
  ): Promise<DocumentationSearch> {
    const systemPrompt = `You are simulating a documentation search system for a software development organization.

Simulate finding relevant documentation that might help answer this question. Consider:
- Technical documentation (Confluence, SharePoint)
- API documentation
- Architecture decision records
- Policy documents
- Style guides
- Previous project learnings
- Meeting notes

Generate 0-3 relevant documentation sources that would realistically exist in an enterprise environment.

Respond ONLY with valid JSON in this exact format:
{
  "found": true/false,
  "sources": [
    {
      "title": "Document title",
      "excerpt": "Relevant excerpt from the document",
      "link": "https://example.com/path/to/doc",
      "relevance": 85,
      "note": "Any additional context"
    }
  ],
  "note": "Explanation if no docs found or search limitations"
}

Make the documentation sources realistic and relevant to the specific question. Use plausible enterprise URLs (Confluence, SharePoint, internal wikis).`;

    const userPrompt = `Search for documentation related to this question:

Question: ${rawQuestion.question}
Category: ${rawQuestion.category}
Priority: ${rawQuestion.priority}`;

    const responseContent = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    const response = this.parseJSONResponse<RawDocSearch>(
      responseContent,
      'Documentation Search'
    );

    return {
      found: response.found,
      sources: response.sources,
      note: response.note,
    };
  }

  /**
   * Route question to appropriate stakeholders based on category
   */
  private routeToStakeholders(category: string): Stakeholder[] {
    // Try exact match
    let stakeholders = this.stakeholderRegistry.get(category);

    // Try first part of slash-separated category (e.g., "Business/Security" -> "Business")
    if (!stakeholders && category.includes('/')) {
      const primaryCategory = category.split('/')[0];
      stakeholders = this.stakeholderRegistry.get(primaryCategory);
    }

    // Use default if no match
    if (!stakeholders) {
      stakeholders = this.stakeholderRegistry.get('default');
    }

    return stakeholders || [];
  }

  /**
   * Validate and normalize question category
   */
  private validateCategory(category: string): QuestionCategory {
    const validCategories: QuestionCategory[] = [
      'Business',
      'Technical',
      'Security',
      'UX',
      'UI',
      'Data',
      'Performance',
      'Testing',
      'Legal',
      'GDPR',
      'Compliance',
      'Budget',
      'Salesforce',
      'Integration',
      'Logistics',
      'Process',
      'Architecture',
      'Business/Security',
      'Technical/Budget',
      'Data/Performance',
      'Business/Technical',
      'Business Logic',
      'UX/Content',
    ];

    if (validCategories.includes(category as QuestionCategory)) {
      return category as QuestionCategory;
    }

    // Default to Business if invalid
    console.warn(`Invalid category "${category}", defaulting to "Business"`);
    return 'Business';
  }

  /**
   * Generate unique question ID
   */
  private generateQuestionId(): string {
    const id = `Q${String(this.questionIdCounter).padStart(3, '0')}`;
    this.questionIdCounter++;
    return id;
  }
}
