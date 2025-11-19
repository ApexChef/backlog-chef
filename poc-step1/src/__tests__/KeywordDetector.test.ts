/**
 * Unit tests for KeywordDetector
 */

import { KeywordDetector } from '../detectors/KeywordDetector';
import { EventType, DetectionMethod, TranscriptInput } from '../types';

describe('KeywordDetector', () => {
  let detector: KeywordDetector;

  beforeEach(() => {
    detector = new KeywordDetector();
  });

  describe('detect', () => {
    it('should detect refinement meeting with high confidence', () => {
      const transcript: TranscriptInput = {
        content: 'Welcome to our backlog refinement session. Today we will review user stories and update acceptance criteria for the upcoming sprint.',
        metadata: {
          meetingId: 'test-1',
          meetingTitle: 'Refinement Session'
        }
      };

      const result = detector.detect(transcript);

      expect(result.eventType).toBe(EventType.REFINEMENT);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.detectionMethod).toBe(DetectionMethod.KEYWORDS);
      expect(result.matchedKeywords).toContain('backlog refinement');
      expect(result.matchedKeywords).toContain('user stories');
    });

    it('should detect planning meeting', () => {
      const transcript: TranscriptInput = {
        content: 'Sprint planning time! Let\'s review our velocity and capacity for this sprint. What is our sprint goal?',
        metadata: {
          meetingId: 'test-2',
          meetingTitle: 'Sprint Planning'
        }
      };

      const result = detector.detect(transcript);

      expect(result.eventType).toBe(EventType.PLANNING);
      expect(result.matchedKeywords).toContain('sprint planning');
      expect(result.matchedKeywords).toContain('velocity');
    });

    it('should detect retrospective meeting', () => {
      const transcript: TranscriptInput = {
        content: 'Welcome to our retrospective. Let\'s discuss what went well and what didn\'t work. We need to identify action items for improvement.',
        metadata: {
          meetingId: 'test-3',
          meetingTitle: 'Team Retrospective'
        }
      };

      const result = detector.detect(transcript);

      expect(result.eventType).toBe(EventType.RETROSPECTIVE);
      expect(result.matchedKeywords).toContain('retrospective');
      expect(result.matchedKeywords).toContain('what went well');
    });

    it('should detect daily standup', () => {
      const transcript: TranscriptInput = {
        content: 'Good morning team, time for our daily standup. What did you work on yesterday? What will you do today? Any blockers?',
        metadata: {
          meetingId: 'test-4',
          meetingTitle: 'Daily Standup'
        }
      };

      const result = detector.detect(transcript);

      expect(result.eventType).toBe(EventType.DAILY);
      expect(result.matchedKeywords).toContain('daily standup');
      expect(result.matchedKeywords).toContain('yesterday');
    });

    it('should return unknown for unclear transcript', () => {
      const transcript: TranscriptInput = {
        content: 'Let\'s discuss the project timeline and budget allocation for next quarter.',
        metadata: {
          meetingId: 'test-5',
          meetingTitle: 'Project Discussion'
        }
      };

      const result = detector.detect(transcript);

      expect(result.eventType).toBe(EventType.UNKNOWN);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle Dutch keywords', () => {
      const transcript: TranscriptInput = {
        content: 'Welkom bij de verfijning. We gaan verhalen bespreken en acceptatiecriteria bepalen.',
        metadata: {
          meetingId: 'test-6',
          meetingTitle: 'Verfijning'
        }
      };

      const result = detector.detect(transcript);

      expect(result.eventType).toBe(EventType.REFINEMENT);
      expect(result.matchedKeywords).toContain('verfijning');
    });

    it('should measure processing time', () => {
      const transcript: TranscriptInput = {
        content: 'Short test transcript for timing',
        metadata: {
          meetingId: 'test-7',
          meetingTitle: 'Test'
        }
      };

      const result = detector.detect(transcript);

      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.processingTimeMs).toBeLessThan(100); // Should be fast
    });
  });
});