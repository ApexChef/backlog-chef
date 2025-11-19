/**
 * Tier 1: Keyword-based meeting type detector
 * Fast, no API calls required
 */

import { DetectionResult, EventType, DetectionMethod, TranscriptInput, KeywordConfig } from '../types';
import { keywordConfigs } from '../config/keywords';
import { Logger } from '../utils/Logger';

export class KeywordDetector {
  private logger: Logger;
  private keywordConfigs: Map<EventType, KeywordConfig>;

  constructor() {
    this.logger = new Logger('KeywordDetector');
    this.keywordConfigs = new Map();
    this.initializeKeywords();
  }

  private initializeKeywords(): void {
    keywordConfigs.forEach(config => {
      this.keywordConfigs.set(config.eventType, config);
    });
  }

  /**
   * Detect meeting type based on keyword matches
   */
  detect(transcript: TranscriptInput): DetectionResult {
    const startTime = Date.now();
    const text = this.preprocessText(transcript.content);
    const tokens = this.tokenize(text);

    this.logger.debug(`Processing ${tokens.length} tokens`);

    const scores = new Map<EventType, { matches: string[], score: number }>();

    // Calculate scores for each event type
    this.keywordConfigs.forEach((config, eventType) => {
      const { matches, score } = this.calculateScore(tokens, config);
      scores.set(eventType, { matches, score });
    });

    // Find the best match
    let bestMatch: EventType = EventType.UNKNOWN;
    let bestScore = 0;
    let bestMatches: string[] = [];

    scores.forEach((result, eventType) => {
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMatch = eventType;
        bestMatches = result.matches;
      }
    });

    // Calculate confidence based on score and matches
    const config = this.keywordConfigs.get(bestMatch);
    const confidence = this.calculateConfidence(bestScore, bestMatches.length, config);

    const processingTimeMs = Date.now() - startTime;

    this.logger.info(`Detected ${bestMatch} with confidence ${confidence.toFixed(2)} in ${processingTimeMs}ms`);

    return {
      eventType: bestMatch,
      confidence,
      detectionMethod: DetectionMethod.KEYWORDS,
      reasoning: this.generateReasoning(bestMatch, bestMatches, confidence),
      matchedKeywords: bestMatches,
      processingTimeMs
    };
  }

  /**
   * Preprocess text for analysis
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\[\]\(\)]/g, ' ') // Remove brackets
      .replace(/\d{2}:\d{2}/g, ' ') // Remove timestamps
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(token => token.length > 2) // Filter out very short tokens
      .map(token => token.replace(/[^\w\s]/g, '')); // Remove punctuation
  }

  /**
   * Calculate score for a specific event type
   */
  private calculateScore(
    tokens: string[],
    config: KeywordConfig
  ): { matches: string[], score: number } {
    const matches = new Set<string>();
    let score = 0;

    // Check for exact matches
    tokens.forEach(token => {
      if (config.keywords.includes(token)) {
        matches.add(token);
        score += config.weight;
      }
    });

    // Check for partial matches (bigrams)
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      if (config.keywords.some(kw => kw === bigram)) {
        matches.add(bigram);
        score += config.weight * 1.5; // Boost for multi-word matches
      }
    }

    // Check for trigrams
    for (let i = 0; i < tokens.length - 2; i++) {
      const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      if (config.keywords.some(kw => kw === trigram)) {
        matches.add(trigram);
        score += config.weight * 2; // Higher boost for longer matches
      }
    }

    return {
      matches: Array.from(matches),
      score
    };
  }

  /**
   * Calculate confidence based on matches
   */
  private calculateConfidence(
    score: number,
    matchCount: number,
    config?: KeywordConfig
  ): number {
    if (!config || matchCount === 0) {
      return 0;
    }

    // Base confidence from match count vs minimum required
    let confidence = Math.min(matchCount / (config.minMatches * 2), 1.0);

    // Adjust based on score
    const scoreMultiplier = Math.min(score / (config.minMatches * 2), 1.5);
    confidence *= scoreMultiplier;

    // Apply confidence boost if configured
    if (config.confidenceBoost && matchCount >= config.minMatches) {
      confidence += config.confidenceBoost;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    eventType: EventType,
    matches: string[],
    confidence: number
  ): string {
    if (eventType === EventType.UNKNOWN) {
      return 'No clear meeting type indicators found in the transcript.';
    }

    const matchList = matches.slice(0, 5).join(', ');
    const confidenceLevel = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'moderate' : 'low';

    return `Detected ${eventType} meeting with ${confidenceLevel} confidence based on keywords: ${matchList}${
      matches.length > 5 ? ` and ${matches.length - 5} more` : ''
    }.`;
  }
}