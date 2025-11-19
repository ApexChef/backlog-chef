/**
 * Claude API client for PBI analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { ClaudeAnalysis } from '../models/types';

export class ClaudeAPIClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
    this.model = model || 'claude-3-5-haiku-20241022';
  }

  /**
   * Send a prompt to Claude and get analysis results
   */
  async analyzeWithPrompt(prompt: string): Promise<ClaudeAnalysis> {
    try {
      console.log(`Sending analysis request to Claude (${this.model})...`);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent scoring
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract the text content from the response
      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('');

      if (!textContent) {
        throw new Error('No text content in Claude response');
      }

      // Parse the JSON response
      const analysis = this.parseJsonResponse(textContent);
      return analysis;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse JSON from Claude's response
   */
  private parseJsonResponse(text: string): ClaudeAnalysis {
    try {
      // Try to extract JSON from the response
      // Claude might include explanation text before/after the JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate the structure
      if (!parsed.scores) {
        throw new Error('Invalid response structure: missing scores');
      }

      const requiredDimensions = [
        'isCompletePBI',
        'hasAllRequirements',
        'isRefinementComplete',
        'hasAcceptanceCriteria',
        'hasClearScope',
        'isEstimable',
      ];

      for (const dimension of requiredDimensions) {
        if (!parsed.scores[dimension]) {
          throw new Error(`Missing score dimension: ${dimension}`);
        }
        const score = parsed.scores[dimension];
        if (
          typeof score.score !== 'number' ||
          typeof score.reasoning !== 'string' ||
          !Array.isArray(score.evidence)
        ) {
          throw new Error(`Invalid structure for dimension: ${dimension}`);
        }
      }

      return parsed as ClaudeAnalysis;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse Claude response: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return this.model;
  }
}