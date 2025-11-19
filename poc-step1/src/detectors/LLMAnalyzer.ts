/**
 * Tier 3: LLM-based meeting type analyzer
 * Uses Claude API for advanced analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { DetectionResult, EventType, DetectionMethod, LLMResponse } from '../types';
import { Logger } from '../utils/Logger';

export class LLMAnalyzer {
  private client: Anthropic;
  private logger: Logger;
  private maxTranscriptLength: number;
  private modelName: string;

  constructor(apiKey: string, maxTranscriptLength: number = 2000) {
    this.logger = new Logger('LLMAnalyzer');
    this.client = new Anthropic({ apiKey });
    this.maxTranscriptLength = maxTranscriptLength;
    this.modelName = 'claude-3-5-haiku-20241022';
  }

  /**
   * Analyze transcript using LLM
   */
  async analyze(transcript: string): Promise<DetectionResult> {
    const startTime = Date.now();

    try {
      const excerpt = this.extractExcerpt(transcript);
      const prompt = this.buildPrompt(excerpt);

      this.logger.debug(`Sending request to Claude API (${excerpt.length} chars)`);

      const response = await this.client.messages.create({
        model: this.modelName,
        max_tokens: 500,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const llmResponse = this.parseResponse(response.content[0].type === 'text' ? response.content[0].text : '');
      const processingTimeMs = Date.now() - startTime;

      this.logger.info(`LLM analysis completed: ${llmResponse.eventType} with confidence ${llmResponse.confidence.toFixed(2)} in ${processingTimeMs}ms`);

      return {
        eventType: llmResponse.eventType,
        confidence: llmResponse.confidence,
        detectionMethod: DetectionMethod.LLM,
        reasoning: llmResponse.reasoning,
        processingTimeMs
      };
    } catch (error) {
      this.logger.error('LLM analysis failed', error);

      return {
        eventType: EventType.UNKNOWN,
        confidence: 0,
        detectionMethod: DetectionMethod.LLM,
        reasoning: `LLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Extract relevant excerpt from transcript
   */
  private extractExcerpt(transcript: string): string {
    // Take first N characters
    let excerpt = transcript.slice(0, this.maxTranscriptLength);

    // Try to end at a sentence boundary
    const lastPeriod = excerpt.lastIndexOf('.');
    const lastQuestion = excerpt.lastIndexOf('?');
    const lastExclamation = excerpt.lastIndexOf('!');

    const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

    if (lastSentenceEnd > this.maxTranscriptLength * 0.8) {
      excerpt = excerpt.slice(0, lastSentenceEnd + 1);
    }

    return excerpt;
  }

  /**
   * Build prompt for LLM
   */
  private buildPrompt(excerpt: string): string {
    return `Analyze the following meeting transcript excerpt and classify it into one of these meeting types:
- refinement: Product backlog refinement, story grooming, requirement clarification
- planning: Sprint planning, iteration planning, capacity planning
- retrospective: Sprint retrospective, team reflection, process improvement
- daily: Daily standup, daily scrum, synchronization meeting
- unknown: Cannot determine or doesn't match any type

Transcript excerpt:
${excerpt}

Respond in JSON format with these fields:
{
  "eventType": "one of: refinement, planning, retrospective, daily, unknown",
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation of why this classification was chosen"
}

Focus on:
1. Meeting structure and flow
2. Topics discussed
3. Types of decisions made
4. Participant roles and interactions
5. Meeting objectives

Provide your classification:`;
  }

  /**
   * Parse LLM response
   */
  private parseResponse(response: string): LLMResponse {
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize event type
      const eventType = this.normalizeEventType(parsed.eventType);

      return {
        eventType,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      this.logger.error('Failed to parse LLM response', error);

      // Try to extract information from plain text
      const lowerResponse = response.toLowerCase();

      if (lowerResponse.includes('refinement')) {
        return {
          eventType: EventType.REFINEMENT,
          confidence: 0.5,
          reasoning: 'Extracted from non-JSON response'
        };
      } else if (lowerResponse.includes('planning')) {
        return {
          eventType: EventType.PLANNING,
          confidence: 0.5,
          reasoning: 'Extracted from non-JSON response'
        };
      } else if (lowerResponse.includes('retrospective')) {
        return {
          eventType: EventType.RETROSPECTIVE,
          confidence: 0.5,
          reasoning: 'Extracted from non-JSON response'
        };
      } else if (lowerResponse.includes('daily')) {
        return {
          eventType: EventType.DAILY,
          confidence: 0.5,
          reasoning: 'Extracted from non-JSON response'
        };
      }

      return {
        eventType: EventType.UNKNOWN,
        confidence: 0,
        reasoning: 'Could not parse LLM response'
      };
    }
  }

  /**
   * Normalize event type string to enum
   */
  private normalizeEventType(type: string): EventType {
    const normalized = type.toLowerCase().trim();

    switch (normalized) {
      case 'refinement':
      case 'backlog refinement':
      case 'grooming':
        return EventType.REFINEMENT;

      case 'planning':
      case 'sprint planning':
        return EventType.PLANNING;

      case 'retrospective':
      case 'retro':
        return EventType.RETROSPECTIVE;

      case 'daily':
      case 'standup':
      case 'daily scrum':
        return EventType.DAILY;

      default:
        return EventType.UNKNOWN;
    }
  }
}