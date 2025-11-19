/**
 * Proposal Generator Service
 * Generates AI-powered proposed answers for questions
 */

import {
  Question,
  ProposedAnswer,
  RiskAnalyzedPBI,
  Confidence
} from '../types';
import { ClaudeAPIClient } from './claude-api-client';
import { PROMPTS, formatPBIContext, formatQuestionContext } from '../config/prompts';
import { logger } from '../utils/logger';

interface RawProposal {
  confidence: Confidence;
  suggestion: string;
  rationale: string;
  alternatives?: string[];
  legal_considerations?: string[];
  performance_recommendations?: string[];
  technical_implementation?: string[];
  risk?: string;
}

export class ProposalGenerator {
  private claudeClient: ClaudeAPIClient;

  constructor() {
    this.claudeClient = new ClaudeAPIClient();
  }

  /**
   * Generate proposals for all questions
   */
  async generateProposals(
    questions: Question[],
    pbi: RiskAnalyzedPBI
  ): Promise<Question[]> {
    logger.info(`Generating proposals for ${questions.length} questions`);

    const questionsWithProposals: Question[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      logger.progress(i + 1, questions.length, `Generating proposal for ${question.id}`);

      try {
        const proposal = await this.generateProposal(question, pbi);
        questionsWithProposals.push({
          ...question,
          proposed_answer: proposal
        });
      } catch (error) {
        logger.warn(`Failed to generate proposal for question ${question.id}`, error);

        // Use fallback proposal
        questionsWithProposals.push({
          ...question,
          proposed_answer: this.generateFallbackProposal(question)
        });
      }

      // Add small delay to avoid rate limiting
      if (i < questions.length - 1) {
        await this.sleep(500);
      }
    }

    logger.success(`Generated proposals for all ${questions.length} questions`);
    return questionsWithProposals;
  }

  /**
   * Generate a proposal for a single question
   */
  private async generateProposal(
    question: Question,
    pbi: RiskAnalyzedPBI
  ): Promise<ProposedAnswer> {
    logger.debug(`Generating proposal for question: ${question.question}`);

    const prompt = PROMPTS.PROPOSAL_GENERATION
      .replace('{questionContext}', formatQuestionContext(question))
      .replace('{pbiContext}', formatPBIContext(pbi));

    try {
      const rawProposal = await this.claudeClient.sendJSONRequest(prompt);

      // Validate and enhance the proposal
      const proposal = this.validateAndEnhanceProposal(rawProposal, question);

      return proposal;
    } catch (error) {
      logger.error(`Failed to generate proposal via Claude`, error);
      throw error;
    }
  }

  /**
   * Validate and enhance a raw proposal
   */
  private validateAndEnhanceProposal(
    raw: RawProposal,
    question: Question
  ): ProposedAnswer {
    // Ensure all required fields exist
    const proposal: ProposedAnswer = {
      confidence: raw.confidence || 'LOW',
      suggestion: raw.suggestion || 'Unable to generate suggestion',
      rationale: raw.rationale || 'Based on standard practices',
      alternatives: raw.alternatives || [],
      legal_considerations: raw.legal_considerations || [],
      performance_recommendations: raw.performance_recommendations || [],
      technical_implementation: raw.technical_implementation || [],
      risk: raw.risk
    };

    // Validate confidence level
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(proposal.confidence)) {
      logger.warn(`Invalid confidence level: ${proposal.confidence}, defaulting to LOW`);
      proposal.confidence = 'LOW';
    }

    // Add context-specific enhancements based on category
    if (question.category === 'Security' || question.category === 'GDPR') {
      if (proposal.legal_considerations?.length === 0) {
        proposal.legal_considerations = [
          'Ensure compliance with applicable data protection regulations',
          'Consider privacy by design principles'
        ];
      }
    }

    if (question.category === 'Performance') {
      if (proposal.performance_recommendations?.length === 0) {
        proposal.performance_recommendations = [
          'Conduct performance testing under expected load',
          'Monitor system metrics during implementation'
        ];
      }
    }

    return proposal;
  }

  /**
   * Generate a fallback proposal when Claude fails
   */
  private generateFallbackProposal(question: Question): ProposedAnswer {
    logger.debug('Using fallback proposal generation');

    const categoryProposals: Record<string, ProposedAnswer> = {
      Business: {
        confidence: 'LOW',
        suggestion: 'Schedule a requirements workshop with the Product Owner and key stakeholders to clarify this business requirement.',
        rationale: 'Direct stakeholder input is needed for business decisions',
        alternatives: [
          'Review similar past implementations for patterns',
          'Conduct user research to inform the decision'
        ]
      },
      Technical: {
        confidence: 'LOW',
        suggestion: 'Conduct a technical spike to evaluate implementation options and determine the best approach.',
        rationale: 'Technical investigation needed to make an informed decision',
        alternatives: [
          'Consult with the architecture team',
          'Review platform documentation and best practices'
        ],
        technical_implementation: [
          'Create proof of concept to validate approach',
          'Document findings and recommendations'
        ]
      },
      Security: {
        confidence: 'LOW',
        suggestion: 'Consult with the Security team to ensure compliance with security policies and best practices.',
        rationale: 'Security requirements must be validated by experts',
        legal_considerations: [
          'Ensure GDPR compliance if handling personal data',
          'Follow principle of least privilege'
        ],
        risk: 'Proceeding without security review could introduce vulnerabilities'
      },
      UX: {
        confidence: 'LOW',
        suggestion: 'Work with UX designer to create mockups and conduct user testing to validate the approach.',
        rationale: 'User experience decisions should be validated with actual users',
        alternatives: [
          'Review existing design patterns in the system',
          'Conduct A/B testing if feasible'
        ]
      },
      Data: {
        confidence: 'LOW',
        suggestion: 'Analyze current data structures and volumes to determine optimal approach.',
        rationale: 'Data-driven decisions require analysis of actual data patterns',
        performance_recommendations: [
          'Consider data volume growth projections',
          'Implement appropriate indexing strategies'
        ]
      }
    };

    // Get base proposal for category
    const baseCategory = question.category.split('/')[0];
    const baseProposal = categoryProposals[baseCategory] || {
      confidence: 'LOW',
      suggestion: 'Further investigation required to answer this question definitively.',
      rationale: 'Insufficient information available for automated proposal',
      alternatives: [
        'Schedule meeting with relevant stakeholders',
        'Review project documentation and past decisions'
      ]
    };

    // Add priority-specific notes
    if (question.priority === 'CRITICAL') {
      baseProposal.risk = 'This is a critical question that must be resolved before development begins';
    }

    return baseProposal;
  }

  /**
   * Sleep helper for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}