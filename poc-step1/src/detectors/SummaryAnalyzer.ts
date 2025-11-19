/**
 * Tier 2: Summary-based meeting type analyzer
 * Analyzes Fireflies summary structure without API calls
 */

import { DetectionResult, EventType, DetectionMethod, SummaryInput, SummaryPattern } from '../types';
import { summaryPatterns } from '../config/summaryPatterns';
import { Logger } from '../utils/Logger';

export class SummaryAnalyzer {
  private logger: Logger;
  private patterns: Map<EventType, SummaryPattern>;

  constructor() {
    this.logger = new Logger('SummaryAnalyzer');
    this.patterns = new Map();
    this.initializePatterns();
  }

  private initializePatterns(): void {
    summaryPatterns.forEach(pattern => {
      this.patterns.set(pattern.eventType, pattern);
    });
  }

  /**
   * Analyze summary to detect meeting type
   */
  analyze(summary: SummaryInput): DetectionResult {
    const startTime = Date.now();

    this.logger.debug('Analyzing summary structure');

    const scores = new Map<EventType, { score: number, matchDetails: string[] }>();

    // Analyze each pattern
    this.patterns.forEach((pattern, eventType) => {
      const { score, matchDetails } = this.analyzePattern(summary, pattern);
      scores.set(eventType, { score, matchDetails });
    });

    // Find best match
    let bestMatch: EventType = EventType.UNKNOWN;
    let bestScore = 0;
    let bestMatchDetails: string[] = [];

    scores.forEach((result, eventType) => {
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMatch = eventType;
        bestMatchDetails = result.matchDetails;
      }
    });

    // Calculate confidence
    const pattern = this.patterns.get(bestMatch);
    const confidence = pattern ? bestScore * pattern.confidence : 0;

    const processingTimeMs = Date.now() - startTime;

    this.logger.info(`Analyzed summary: ${bestMatch} with confidence ${confidence.toFixed(2)} in ${processingTimeMs}ms`);

    return {
      eventType: bestMatch,
      confidence,
      detectionMethod: DetectionMethod.SUMMARY_ANALYSIS,
      reasoning: this.generateReasoning(bestMatch, bestMatchDetails, confidence),
      processingTimeMs
    };
  }

  /**
   * Analyze a specific pattern against the summary
   */
  private analyzePattern(
    summary: SummaryInput,
    pattern: SummaryPattern
  ): { score: number, matchDetails: string[] } {
    const matchDetails: string[] = [];
    let score = 0;

    // Check required sections
    const sectionScore = this.checkRequiredSections(summary, pattern.requiredSections);
    score += sectionScore * 0.4; // 40% weight for sections

    if (sectionScore > 0) {
      matchDetails.push(`Has required sections: ${pattern.requiredSections.join(', ')}`);
    }

    // Check patterns in all text content
    const allText = this.extractAllText(summary);
    const patternMatches = this.checkPatterns(allText, pattern.patterns);
    score += patternMatches.score * 0.6; // 60% weight for patterns

    if (patternMatches.matches.length > 0) {
      matchDetails.push(`Pattern matches: ${patternMatches.matches.join(', ')}`);
    }

    // Bonus for specific indicators
    const bonusScore = this.calculateBonusScore(summary, pattern.eventType);
    score += bonusScore * 0.2; // 20% bonus potential

    return { score: Math.min(score, 1.0), matchDetails };
  }

  /**
   * Check if required sections exist and have content
   */
  private checkRequiredSections(summary: SummaryInput, required: string[]): number {
    if (required.length === 0) return 1.0;

    let matchCount = 0;
    for (const section of required) {
      switch (section) {
        case 'actionItems':
          if (summary.actionItems && summary.actionItems.length > 0) matchCount++;
          break;
        case 'questions':
          if (summary.questions && summary.questions.length > 0) matchCount++;
          break;
        case 'decisions':
          if (summary.decisions && summary.decisions.length > 0) matchCount++;
          break;
        case 'keyTopics':
          if (summary.keyTopics && summary.keyTopics.length > 0) matchCount++;
          break;
      }
    }

    return matchCount / required.length;
  }

  /**
   * Extract all text content from summary
   */
  private extractAllText(summary: SummaryInput): string {
    const texts: string[] = [];

    if (summary.actionItems) texts.push(...summary.actionItems);
    if (summary.questions) texts.push(...summary.questions);
    if (summary.decisions) texts.push(...summary.decisions);
    if (summary.keyTopics) texts.push(...summary.keyTopics);

    return texts.join(' ').toLowerCase();
  }

  /**
   * Check for pattern matches in text
   */
  private checkPatterns(text: string, patterns: string[]): { score: number, matches: string[] } {
    const matches: string[] = [];
    let matchCount = 0;

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(text)) {
        matchCount++;
        matches.push(pattern.replace(/\.\*/g, '').replace(/\\/g, ''));
      }
    }

    const score = patterns.length > 0 ? matchCount / patterns.length : 0;
    return { score, matches: matches.slice(0, 3) }; // Return top 3 matches
  }

  /**
   * Calculate bonus score for specific meeting type indicators
   */
  private calculateBonusScore(summary: SummaryInput, eventType: EventType): number {
    let bonus = 0;

    switch (eventType) {
      case EventType.REFINEMENT:
        // Bonus for many questions about requirements
        if (summary.questions && summary.questions.length > 5) bonus += 0.3;
        // Bonus for decisions about scope
        if (summary.decisions?.some(d => d.toLowerCase().includes('scope'))) bonus += 0.4;
        break;

      case EventType.PLANNING:
        // Bonus for decisions about sprint content
        if (summary.decisions?.some(d => d.toLowerCase().includes('sprint'))) bonus += 0.5;
        break;

      case EventType.RETROSPECTIVE:
        // Bonus for many action items
        if (summary.actionItems && summary.actionItems.length > 3) bonus += 0.5;
        break;

      case EventType.DAILY:
        // Bonus for short meeting with few decisions
        if ((!summary.decisions || summary.decisions.length < 2) &&
            (!summary.actionItems || summary.actionItems.length < 3)) bonus += 0.3;
        break;
    }

    return Math.min(bonus, 1.0);
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    eventType: EventType,
    matchDetails: string[],
    confidence: number
  ): string {
    if (eventType === EventType.UNKNOWN) {
      return 'Summary structure does not clearly indicate a specific meeting type.';
    }

    const confidenceLevel = confidence > 0.7 ? 'high' : confidence > 0.4 ? 'moderate' : 'low';
    const details = matchDetails.length > 0 ? ` ${matchDetails[0]}` : '';

    return `Summary analysis indicates ${eventType} meeting with ${confidenceLevel} confidence.${details}`;
  }
}