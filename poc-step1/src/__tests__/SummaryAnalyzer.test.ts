/**
 * Unit tests for SummaryAnalyzer
 */

import { SummaryAnalyzer } from '../detectors/SummaryAnalyzer';
import { EventType, DetectionMethod, SummaryInput } from '../types';

describe('SummaryAnalyzer', () => {
  let analyzer: SummaryAnalyzer;

  beforeEach(() => {
    analyzer = new SummaryAnalyzer();
  });

  describe('analyze', () => {
    it('should detect refinement from summary structure', () => {
      const summary: SummaryInput = {
        actionItems: [
          'Research which account types should have portal access',
          'Define permission model for B2B vs B2C users'
        ],
        questions: [
          'Which account types get portal access?',
          'Can B2B users see all company orders or only their own?',
          'Are current Experience Cloud licenses sufficient?'
        ],
        decisions: [
          'Scope limited to product orders for v1',
          'Use Salesforce Experience Cloud for the portal'
        ],
        keyTopics: ['Customer self-service portal', 'Order tracking']
      };

      const result = analyzer.analyze(summary);

      expect(result.eventType).toBe(EventType.REFINEMENT);
      expect(result.detectionMethod).toBe(DetectionMethod.SUMMARY_ANALYSIS);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect retrospective from action items', () => {
      const summary: SummaryInput = {
        actionItems: [
          'Improve code review process',
          'Set up automated testing pipeline',
          'Schedule knowledge sharing sessions',
          'Update team working agreements'
        ],
        questions: [
          'How can we improve our velocity?',
          'What caused the production incident?'
        ],
        decisions: [
          'Implement pair programming for complex features',
          'Add daily code review slot'
        ],
        keyTopics: ['Team performance', 'Process improvement']
      };

      const result = analyzer.analyze(summary);

      expect(result.eventType).toBe(EventType.RETROSPECTIVE);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect planning from sprint-related decisions', () => {
      const summary: SummaryInput = {
        actionItems: [
          'Update sprint backlog in Jira',
          'Schedule sprint demo'
        ],
        questions: [
          'What is our capacity for this sprint?',
          'Can we commit to all these stories?'
        ],
        decisions: [
          'Sprint goal: Complete user authentication feature',
          'Commit to 45 story points',
          'John will be out for 2 days'
        ],
        keyTopics: ['Sprint planning', 'Capacity', 'Commitments']
      };

      const result = analyzer.analyze(summary);

      expect(result.eventType).toBe(EventType.PLANNING);
    });

    it('should detect daily standup from minimal structure', () => {
      const summary: SummaryInput = {
        actionItems: [],
        questions: ['Who can help with the API integration?'],
        decisions: [],
        keyTopics: ['Daily updates', 'Blockers']
      };

      const result = analyzer.analyze(summary);

      // Daily standups typically have few action items and decisions
      expect([EventType.DAILY, EventType.UNKNOWN]).toContain(result.eventType);
    });

    it('should return unknown for empty summary', () => {
      const summary: SummaryInput = {
        actionItems: [],
        questions: [],
        decisions: [],
        keyTopics: []
      };

      const result = analyzer.analyze(summary);

      expect(result.eventType).toBe(EventType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it('should include processing time', () => {
      const summary: SummaryInput = {
        actionItems: ['Test action'],
        questions: ['Test question'],
        decisions: ['Test decision'],
        keyTopics: ['Test topic']
      };

      const result = analyzer.analyze(summary);

      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.processingTimeMs).toBeLessThan(200);
    });
  });
});