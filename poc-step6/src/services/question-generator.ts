/**
 * Question Generation Service
 * Identifies unanswered questions from PBI analysis
 */

import {
  RiskAnalyzedPBI,
  Question,
  QuestionCategory,
  Priority,
  QuestionGenerationContext
} from '../types';
import { ClaudeAPIClient } from './claude-api-client';
import { PROMPTS, formatPBIContext } from '../config/prompts';
import { logger } from '../utils/logger';
import { Validators } from '../utils/validators';

interface RawQuestion {
  question: string;
  category: string;
  priority: Priority;
  rationale: string;
  impact_if_unanswered: string;
}

export class QuestionGenerator {
  private claudeClient: ClaudeAPIClient;
  private questionIdCounter: number = 1;

  constructor() {
    this.claudeClient = new ClaudeAPIClient();
  }

  /**
   * Generate questions for a PBI based on risks and analysis
   */
  async generateQuestions(context: QuestionGenerationContext): Promise<Question[]> {
    logger.info(`Generating questions for PBI: ${context.pbi.id}`);

    try {
      // Generate questions using Claude
      const rawQuestions = await this.identifyQuestions(context.pbi);

      // Enhance and validate questions
      const enhancedQuestions = await this.enhanceQuestions(rawQuestions, context.pbi);

      // Convert to full Question objects (without proposals yet)
      const questions = this.convertToQuestions(enhancedQuestions);

      logger.success(`Generated ${questions.length} questions for PBI ${context.pbi.id}`);
      return questions;
    } catch (error) {
      logger.error(`Failed to generate questions for PBI ${context.pbi.id}`, error);
      throw error;
    }
  }

  /**
   * Identify unanswered questions using Claude
   */
  private async identifyQuestions(pbi: RiskAnalyzedPBI): Promise<RawQuestion[]> {
    logger.debug('Identifying unanswered questions with Claude');

    const prompt = PROMPTS.QUESTION_IDENTIFICATION.replace(
      '{pbiContext}',
      formatPBIContext(pbi)
    );

    try {
      const response = await this.claudeClient.sendJSONRequest(prompt);

      if (!response.questions || !Array.isArray(response.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      return response.questions;
    } catch (error) {
      logger.error('Failed to identify questions', error);

      // Fallback: Generate questions based on risks
      return this.generateFallbackQuestions(pbi);
    }
  }

  /**
   * Enhance raw questions with additional context
   */
  private async enhanceQuestions(
    rawQuestions: RawQuestion[],
    pbi: RiskAnalyzedPBI
  ): Promise<RawQuestion[]> {
    const enhanced: RawQuestion[] = [];

    for (const question of rawQuestions) {
      // Validate category
      if (!Validators.isValidCategory(question.category)) {
        logger.warn(`Invalid category "${question.category}", defaulting to "Business"`);
        question.category = 'Business';
      }

      // Validate priority
      if (!Validators.isValidPriority(question.priority)) {
        logger.warn(`Invalid priority "${question.priority}", defaulting to "MEDIUM"`);
        question.priority = 'MEDIUM';
      }

      // Adjust priority based on PBI risks
      question.priority = this.adjustPriorityBasedOnRisks(question, pbi);

      enhanced.push(question);
    }

    return enhanced;
  }

  /**
   * Adjust question priority based on associated risks
   */
  private adjustPriorityBasedOnRisks(question: RawQuestion, pbi: RiskAnalyzedPBI): Priority {
    // If question relates to critical risks, elevate priority
    const criticalRiskKeywords = pbi.risks.CRITICAL.map(r =>
      r.description.toLowerCase() + ' ' + r.detail.toLowerCase()
    ).join(' ');

    const highRiskKeywords = pbi.risks.HIGH.map(r =>
      r.description.toLowerCase() + ' ' + r.detail.toLowerCase()
    ).join(' ');

    const questionLower = question.question.toLowerCase();

    // Check for critical risk alignment
    if (criticalRiskKeywords && this.hasOverlap(questionLower, criticalRiskKeywords)) {
      if (question.priority !== 'CRITICAL') {
        logger.debug(`Elevating question priority to CRITICAL due to risk alignment`);
        return 'CRITICAL';
      }
    }

    // Check for high risk alignment
    if (highRiskKeywords && this.hasOverlap(questionLower, highRiskKeywords)) {
      if (question.priority === 'MEDIUM' || question.priority === 'LOW') {
        logger.debug(`Elevating question priority to HIGH due to risk alignment`);
        return 'HIGH';
      }
    }

    return question.priority;
  }

  /**
   * Check if text contains overlapping keywords
   */
  private hasOverlap(text1: string, text2: string): boolean {
    const keywords1 = text1.split(/\s+/).filter(w => w.length > 4);
    const keywords2 = text2.split(/\s+/).filter(w => w.length > 4);

    const overlap = keywords1.some(keyword => keywords2.includes(keyword));
    return overlap;
  }

  /**
   * Convert raw questions to Question objects
   */
  private convertToQuestions(rawQuestions: RawQuestion[]): Question[] {
    return rawQuestions.map((raw, index) => ({
      id: this.generateQuestionId(),
      question: raw.question,
      category: raw.category as QuestionCategory,
      priority: raw.priority,
      stakeholders: [], // Will be filled by stakeholder router
      proposed_answer: {
        confidence: 'LOW',
        suggestion: '',
        rationale: ''
      }, // Will be filled by proposal generator
      documentation_search: {
        found: false
      } // Will be filled by doc search
    }));
  }

  /**
   * Generate a unique question ID
   */
  private generateQuestionId(): string {
    const id = `Q${String(this.questionIdCounter).padStart(3, '0')}`;
    this.questionIdCounter++;
    return id;
  }

  /**
   * Generate fallback questions based on risks
   */
  private generateFallbackQuestions(pbi: RiskAnalyzedPBI): RawQuestion[] {
    logger.warn('Using fallback question generation based on risks');
    const questions: RawQuestion[] = [];

    // Generate questions for critical risks
    pbi.risks.CRITICAL.forEach(risk => {
      questions.push({
        question: `How will we address the critical risk: ${risk.description}?`,
        category: 'Technical',
        priority: 'CRITICAL',
        rationale: `This is identified as a critical risk that could block implementation`,
        impact_if_unanswered: risk.detail
      });
    });

    // Generate questions for high risks
    pbi.risks.HIGH.forEach(risk => {
      questions.push({
        question: `What is the mitigation plan for: ${risk.description}?`,
        category: this.inferCategory(risk.type),
        priority: 'HIGH',
        rationale: `High-priority risk that needs resolution`,
        impact_if_unanswered: risk.detail
      });
    });

    // Add standard questions based on PBI complexity
    if (pbi.complexity_score > 7) {
      questions.push({
        question: 'Should this PBI be split into smaller stories?',
        category: 'Process',
        priority: 'HIGH',
        rationale: `Complexity score of ${pbi.complexity_score} indicates high complexity`,
        impact_if_unanswered: 'Risk of incomplete or delayed delivery'
      });
    }

    // Add questions for conflicts
    pbi.conflicts.forEach(conflict => {
      questions.push({
        question: `How do we resolve the conflict: ${conflict.description}?`,
        category: 'Process',
        priority: 'MEDIUM',
        rationale: 'Unresolved conflicts can cause delays and rework',
        impact_if_unanswered: conflict.detail
      });
    });

    return questions;
  }

  /**
   * Infer category from risk type
   */
  private inferCategory(riskType: string): string {
    const categoryMap: Record<string, string> = {
      'BLOCKING_DEPENDENCY': 'Technical',
      'TECHNICAL_COMPLEXITY': 'Technical',
      'UNRESOLVED_DECISION': 'Business',
      'ESTIMATION_UNCERTAINTY': 'Process',
      'MISSING_STAKEHOLDER': 'Process',
      'DATA_INCONSISTENCY': 'Data',
      'RESOURCE_CONFLICT': 'Process',
      'EXISTING_WORK': 'Technical'
    };

    return categoryMap[riskType] || 'Business';
  }
}