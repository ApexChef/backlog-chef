/**
 * Documentation Search Simulator
 * Simulates searching internal documentation for relevant information
 */

import {
  Question,
  DocumentationSearch,
  DocumentationSource
} from '../types';
import { ClaudeAPIClient } from './claude-api-client';
import { PROMPTS, formatQuestionContext } from '../config/prompts';
import { logger } from '../utils/logger';

export class DocumentationSearchService {
  private claudeClient: ClaudeAPIClient;
  private searchCache: Map<string, DocumentationSearch> = new Map();

  constructor() {
    this.claudeClient = new ClaudeAPIClient();
  }

  /**
   * Search documentation for all questions
   */
  async searchForQuestions(questions: Question[]): Promise<Question[]> {
    logger.info(`Searching documentation for ${questions.length} questions`);

    const questionsWithDocs: Question[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      logger.progress(i + 1, questions.length, `Searching docs for ${question.id}`);

      try {
        const searchResult = await this.searchDocumentation(question);
        questionsWithDocs.push({
          ...question,
          documentation_search: searchResult
        });
      } catch (error) {
        logger.warn(`Failed to search documentation for question ${question.id}`, error);

        // Use empty result as fallback
        questionsWithDocs.push({
          ...question,
          documentation_search: {
            found: false,
            note: 'Documentation search failed'
          }
        });
      }

      // Small delay to avoid overloading
      if (i < questions.length - 1) {
        await this.sleep(300);
      }
    }

    logger.success(`Completed documentation search for all questions`);
    return questionsWithDocs;
  }

  /**
   * Search documentation for a single question
   */
  private async searchDocumentation(question: Question): Promise<DocumentationSearch> {
    // Check cache first
    const cacheKey = this.getCacheKey(question);
    if (this.searchCache.has(cacheKey)) {
      logger.debug(`Using cached documentation search for ${question.id}`);
      return this.searchCache.get(cacheKey)!;
    }

    logger.debug(`Searching documentation for: ${question.question}`);

    // For high-priority questions, always try to find documentation
    if (question.priority === 'CRITICAL' || question.priority === 'HIGH') {
      const result = await this.simulateSearch(question);
      this.searchCache.set(cacheKey, result);
      return result;
    }

    // For lower priority, use simpler simulation
    const result = this.generateSimpleSearchResult(question);
    this.searchCache.set(cacheKey, result);
    return result;
  }

  /**
   * Simulate documentation search using Claude
   */
  private async simulateSearch(question: Question): Promise<DocumentationSearch> {
    const prompt = PROMPTS.DOCUMENTATION_SEARCH
      .replace('{searchQuery}', question.question)
      .replace('{questionContext}', formatQuestionContext(question));

    try {
      const response = await this.claudeClient.sendJSONRequest(prompt, undefined, 0.8);

      // Validate response
      if (!response || typeof response.found !== 'boolean') {
        throw new Error('Invalid documentation search response');
      }

      return {
        found: response.found,
        sources: response.sources || [],
        note: response.note
      };
    } catch (error) {
      logger.error('Failed to simulate documentation search', error);
      return this.generateSimpleSearchResult(question);
    }
  }

  /**
   * Generate a simple search result based on question category
   */
  private generateSimpleSearchResult(question: Question): DocumentationSearch {
    const categoryDocs: Record<string, DocumentationSource[]> = {
      Business: [
        {
          title: 'Business Requirements Template',
          excerpt: 'All business requirements must include acceptance criteria, success metrics, and stakeholder sign-off...',
          link: 'https://confluence.company.com/business-requirements',
          relevance: 75
        }
      ],
      Technical: [
        {
          title: 'Technical Architecture Guidelines',
          excerpt: 'Follow these patterns for system design: microservices for scalability, event-driven for real-time...',
          link: 'https://confluence.company.com/tech-architecture',
          relevance: 80
        },
        {
          title: 'API Design Standards',
          excerpt: 'RESTful APIs should follow: versioning in URL, pagination for lists, standard error codes...',
          link: 'https://confluence.company.com/api-standards',
          relevance: 70
        }
      ],
      Security: [
        {
          title: 'Security Compliance Checklist',
          excerpt: 'All applications must implement: OAuth 2.0 authentication, encrypted data at rest, audit logging...',
          link: 'https://sharepoint.company.com/security-checklist',
          relevance: 90
        },
        {
          title: 'GDPR Implementation Guide',
          excerpt: 'Personal data handling requires: explicit consent, right to deletion, data portability...',
          link: 'https://confluence.company.com/gdpr-guide',
          relevance: 85
        }
      ],
      UX: [
        {
          title: 'UX Design System',
          excerpt: 'Component library includes: responsive grid, color palette, typography scale, accessibility standards...',
          link: 'https://design.company.com/system',
          relevance: 80
        }
      ],
      Performance: [
        {
          title: 'Performance Best Practices',
          excerpt: 'Target metrics: <2s page load, <100ms API response, 99.9% uptime. Use caching, CDN, lazy loading...',
          link: 'https://confluence.company.com/performance',
          relevance: 75
        }
      ],
      Salesforce: [
        {
          title: 'Salesforce Development Standards',
          excerpt: 'Follow limits: 100 SOQL queries, 50,000 records retrieved, 150 DML statements per transaction...',
          link: 'https://confluence.company.com/salesforce-standards',
          relevance: 85
        },
        {
          title: 'Experience Cloud Setup Guide',
          excerpt: 'Portal configuration requires: community setup, user profiles, sharing rules, page layouts...',
          link: 'https://sharepoint.company.com/experience-cloud',
          relevance: 80
        }
      ]
    };

    // Get base category
    const baseCategory = question.category.split('/')[0];
    const sources = categoryDocs[baseCategory];

    if (sources && sources.length > 0) {
      // Randomly decide if documentation is "found" (70% chance)
      const found = Math.random() > 0.3;

      if (found) {
        // Return 1-2 sources
        const numSources = Math.random() > 0.5 ? 2 : 1;
        return {
          found: true,
          sources: sources.slice(0, numSources)
        };
      }
    }

    // No documentation found
    return {
      found: false,
      note: `No specific documentation found for this ${question.category.toLowerCase()} question. Consider creating documentation after resolution.`
    };
  }

  /**
   * Generate cache key for a question
   */
  private getCacheKey(question: Question): string {
    return `${question.category}_${question.priority}_${question.question.substring(0, 50)}`;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate documentation summary
   */
  static generateDocumentationSummary(questions: Question[]): {
    totalSearches: number;
    documentsFound: number;
    coverageRate: number;
    topSources: string[];
  } {
    let documentsFound = 0;
    const sourceLinks = new Map<string, number>();

    questions.forEach(question => {
      if (question.documentation_search.found) {
        documentsFound++;

        question.documentation_search.sources?.forEach(source => {
          const count = sourceLinks.get(source.link) || 0;
          sourceLinks.set(source.link, count + 1);
        });
      }
    });

    // Get top 5 most referenced sources
    const topSources = Array.from(sourceLinks.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([link]) => link);

    return {
      totalSearches: questions.length,
      documentsFound,
      coverageRate: Math.round((documentsFound / questions.length) * 100),
      topSources
    };
  }
}