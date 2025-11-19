/**
 * Integration tests for DetectionOrchestrator
 */

import { DetectionOrchestrator } from '../DetectionOrchestrator';
import { EventType, DetectionMethod, TranscriptInput, SummaryInput, DetectorConfig } from '../types';

describe('DetectionOrchestrator', () => {
  let orchestrator: DetectionOrchestrator;
  const config: DetectorConfig = {
    confidenceThreshold: 0.7,
    maxTranscriptLength: 2000,
    enableLLM: false
  };

  beforeEach(() => {
    orchestrator = new DetectionOrchestrator(config);
  });

  describe('detect with tier fallback', () => {
    it('should use Tier 1 when confidence is high', async () => {
      const transcript: TranscriptInput = {
        content: 'Welcome to our backlog refinement session. Let\'s review user stories and acceptance criteria.',
        metadata: {
          meetingId: 'test-1',
          meetingTitle: 'Backlog Refinement'
        }
      };

      const summary: SummaryInput = {
        actionItems: [],
        questions: [],
        decisions: [],
        keyTopics: []
      };

      const result = await orchestrator.detect(transcript, summary);

      expect(result.eventType).toBe(EventType.REFINEMENT);
      expect(result.detectionMethod).toBe(DetectionMethod.KEYWORDS);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.pipelineConfig).toBeDefined();
      expect(result.pipelineConfig?.pipelineName).toBe('refinement_pipeline');
    });

    it('should fallback to Tier 2 when Tier 1 confidence is low', async () => {
      const transcript: TranscriptInput = {
        content: 'Let\'s discuss the project status and next steps.',
        metadata: {
          meetingId: 'test-2',
          meetingTitle: 'Team Meeting'
        }
      };

      const summary: SummaryInput = {
        actionItems: [
          'Research account types for portal access',
          'Define permission model'
        ],
        questions: [
          'Which account types get access?',
          'What are the requirements?'
        ],
        decisions: [
          'Scope limited to phase 1',
          'Use existing platform'
        ],
        keyTopics: ['Requirements', 'Planning']
      };

      const result = await orchestrator.detect(transcript, summary);

      expect(result.detectionMethod).toBe(DetectionMethod.SUMMARY_ANALYSIS);
    });

    it('should include pipeline configuration for known types', async () => {
      const transcript: TranscriptInput = {
        content: 'Sprint planning meeting. Review velocity and capacity.',
        metadata: {
          meetingId: 'test-3',
          meetingTitle: 'Sprint Planning'
        }
      };

      const summary: SummaryInput = {
        actionItems: [],
        questions: [],
        decisions: ['Sprint goal defined'],
        keyTopics: ['Sprint planning']
      };

      const result = await orchestrator.detect(transcript, summary);

      expect(result.eventType).toBe(EventType.PLANNING);
      expect(result.pipelineConfig).toBeDefined();
      expect(result.pipelineConfig?.steps).toBeDefined();
      expect(result.pipelineConfig?.steps.length).toBeGreaterThan(0);
    });

    it('should not include pipeline config for unknown type', async () => {
      const transcript: TranscriptInput = {
        content: 'Random meeting discussion without clear purpose.',
        metadata: {
          meetingId: 'test-4',
          meetingTitle: 'Meeting'
        }
      };

      const summary: SummaryInput = {
        actionItems: [],
        questions: [],
        decisions: [],
        keyTopics: []
      };

      const result = await orchestrator.detect(transcript, summary);

      if (result.eventType === EventType.UNKNOWN) {
        expect(result.pipelineConfig).toBeUndefined();
      }
    });
  });

  describe('configuration', () => {
    it('should respect confidence threshold', async () => {
      const customConfig: DetectorConfig = {
        confidenceThreshold: 0.9, // Very high threshold
        maxTranscriptLength: 2000,
        enableLLM: false
      };

      const customOrchestrator = new DetectionOrchestrator(customConfig);

      const transcript: TranscriptInput = {
        content: 'Meeting about stuff.',
        metadata: {
          meetingId: 'test-5',
          meetingTitle: 'Meeting'
        }
      };

      const summary: SummaryInput = {
        actionItems: ['Some action'],
        questions: [],
        decisions: [],
        keyTopics: []
      };

      const result = await customOrchestrator.detect(transcript, summary);

      // With high threshold, should fallback through tiers
      expect(result.detectionMethod).toBe(DetectionMethod.SUMMARY_ANALYSIS);
    });

    it('should update configuration', () => {
      orchestrator.updateConfig({ confidenceThreshold: 0.5 });
      const newConfig = orchestrator.getConfig();

      expect(newConfig.confidenceThreshold).toBe(0.5);
      expect(newConfig.maxTranscriptLength).toBe(2000);
    });
  });

  describe('error handling', () => {
    it('should handle empty transcript gracefully', async () => {
      const transcript: TranscriptInput = {
        content: '',
        metadata: {
          meetingId: 'test-6',
          meetingTitle: 'Empty'
        }
      };

      const summary: SummaryInput = {
        actionItems: [],
        questions: [],
        decisions: [],
        keyTopics: []
      };

      const result = await orchestrator.detect(transcript, summary);

      expect(result.eventType).toBe(EventType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });
  });
});