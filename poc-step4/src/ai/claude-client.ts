import Anthropic from '@anthropic-ai/sdk';
import { Config, SearchQuery, ScoredPBI } from '../types';

export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(config: Config) {
    this.client = new Anthropic({
      apiKey: config.claudeApiKey
    });
    this.model = config.claudeModel;
  }

  async generateSearchQueries(pbi: ScoredPBI): Promise<SearchQuery> {
    const prompt = `Given this PBI, extract key search terms to find related context:

PBI Title: ${pbi.title}
Readiness: ${pbi.overall_readiness}

Extract:
1. Keywords (specific terms, features, components)
2. Concepts (broader ideas, patterns, approaches)
3. Technologies (platforms, tools, frameworks)

Return as JSON with arrays: {keywords: [], concepts: [], technologies: []}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      // Fallback to simple extraction
      return this.extractKeywordsFromTitle(pbi.title);
    } catch (error) {
      console.error('Error generating search queries:', error);
      // Fallback to simple extraction
      return this.extractKeywordsFromTitle(pbi.title);
    }
  }

  private extractKeywordsFromTitle(title: string): SearchQuery {
    const words = title.toLowerCase().split(/\s+/);
    return {
      keywords: words,
      concepts: this.identifyConcepts(words),
      technologies: this.identifyTechnologies(words)
    };
  }

  private identifyConcepts(words: string[]): string[] {
    const conceptMap: { [key: string]: string } = {
      'portal': 'self-service',
      'customer': 'user-experience',
      'order': 'commerce',
      'permission': 'security',
      'b2b': 'business',
      'label': 'ui',
      'status': 'workflow'
    };

    const concepts: string[] = [];
    for (const word of words) {
      if (conceptMap[word]) {
        concepts.push(conceptMap[word]);
      }
    }
    return concepts;
  }

  private identifyTechnologies(words: string[]): string[] {
    const techKeywords = ['salesforce', 'api', 'portal', 'cloud'];
    return words.filter(word => techKeywords.some(tech => word.includes(tech)));
  }

  async calculateSimilarity(text1: string, text2: string): Promise<number> {
    const prompt = `Compare these two texts and provide a similarity score from 0-100:

Text 1: ${text1}
Text 2: ${text2}

Consider: semantic meaning, shared concepts, technical overlap, business context.
Return only a number between 0-100.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 50,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const score = parseFloat(content.text.trim());
        return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
      }
    } catch (error) {
      console.error('Error calculating similarity:', error);
    }

    // Fallback to simple text matching
    return this.simpleSimilarity(text1, text2);
  }

  private simpleSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    let common = 0;
    words1.forEach(word => {
      if (words2.has(word)) common++;
    });

    const similarity = (common / Math.max(words1.size, words2.size)) * 100;
    return Math.round(similarity);
  }

  async generateSuggestions(pbiTitle: string, context: any): Promise<string[]> {
    const prompt = `Based on this PBI and context, provide 2-3 actionable suggestions:

PBI: ${pbiTitle}
Context includes: ${context.similar_work?.length || 0} similar items, ${context.past_decisions?.length || 0} decisions, ${context.technical_docs?.length || 0} docs

Provide brief, actionable suggestions based on patterns from similar work and best practices.
Return as a JSON array of strings.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }

    // Fallback suggestions
    return [
      'Review similar completed work items for lessons learned',
      'Consult with the assigned architect from previous implementations',
      'Consider implementing caching strategy based on past performance issues'
    ];
  }

  async analyzeRisks(pbiTitle: string, similarWork: any[]): Promise<any[]> {
    const risks = [];

    // Analyze effort overruns
    for (const work of similarWork) {
      if (work.actual_effort && work.estimated_effort) {
        const overrun = ((work.actual_effort - work.estimated_effort) / work.estimated_effort) * 100;
        if (overrun > 50) {
          risks.push({
            type: 'SIMILAR_WORK_UNDERESTIMATED',
            severity: 'HIGH',
            message: `Similar project "${work.title}" took ${Math.round(overrun)}% more effort than estimated`
          });
        }
      }
    }

    // Check for common risk patterns
    const keywords = pbiTitle.toLowerCase();

    if (keywords.includes('portal') || keywords.includes('experience')) {
      risks.push({
        type: 'LICENSE_CAPACITY',
        severity: 'HIGH',
        message: 'Experience Cloud licenses may be limited (current pool: 500)'
      });
    }

    if (keywords.includes('permission') || keywords.includes('b2b')) {
      risks.push({
        type: 'SECURITY_COMPLEXITY',
        severity: 'MEDIUM',
        message: 'Permission models for B2B typically require extensive testing'
      });
    }

    if (similarWork.some(w => w.learnings?.some((l: string) => l.toLowerCase().includes('performance')))) {
      risks.push({
        type: 'PERFORMANCE_RISK',
        severity: 'MEDIUM',
        message: 'Previous similar implementations had performance challenges'
      });
    }

    return risks;
  }
}