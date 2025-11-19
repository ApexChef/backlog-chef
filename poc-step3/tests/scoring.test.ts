/**
 * Tests for PBI scoring functionality
 */

import { ScoringEngine } from '../src/services/scoringEngine';
import { ClaudeAPIClient } from '../src/services/claudeClient';
import { ExtractedPBI, ClaudeAnalysis } from '../src/models/types';

// Mock the Claude client
jest.mock('../src/services/claudeClient');

describe('ScoringEngine', () => {
  let scoringEngine: ScoringEngine;
  let mockClaudeClient: jest.Mocked<ClaudeAPIClient>;

  beforeEach(() => {
    mockClaudeClient = new ClaudeAPIClient('test-key') as jest.Mocked<ClaudeAPIClient>;
    scoringEngine = new ScoringEngine(mockClaudeClient);
  });

  describe('scorePBI', () => {
    it('should score a complete PBI with high confidence', async () => {
      const testPBI: ExtractedPBI = {
        id: 'PBI-001',
        title: 'Test PBI',
        description: 'A well-defined test PBI',
        acceptance_criteria: ['AC1', 'AC2', 'AC3'],
        technical_notes: ['Note 1', 'Note 2'],
        scope: {
          in_scope: ['Feature A', 'Feature B'],
          out_of_scope: ['Feature C'],
        },
        dependencies: [],
        mentioned_by: ['Product Owner'],
        type: 'feature',
      };

      const mockAnalysis: ClaudeAnalysis = {
        scores: {
          isCompletePBI: {
            score: 85,
            reasoning: 'Clear business value and user need',
            evidence: ['Well defined description', 'Clear acceptance criteria'],
          },
          hasAllRequirements: {
            score: 75,
            reasoning: 'Most requirements are clear',
            evidence: ['Technical notes provided', 'Dependencies identified'],
          },
          isRefinementComplete: {
            score: 70,
            reasoning: 'Ready for sprint planning',
            evidence: ['Team has discussed', 'No major unknowns'],
          },
          hasAcceptanceCriteria: {
            score: 80,
            reasoning: 'Clear testable conditions',
            evidence: ['3 acceptance criteria defined', 'Measurable outcomes'],
          },
          hasClearScope: {
            score: 90,
            reasoning: 'Boundaries well documented',
            evidence: ['In-scope defined', 'Out-of-scope listed'],
          },
          isEstimable: {
            score: 75,
            reasoning: 'Team can estimate this work',
            evidence: ['Complexity understood', 'Technical approach clear'],
          },
        },
      };

      mockClaudeClient.analyzeWithPrompt.mockResolvedValue(mockAnalysis);

      const result = await scoringEngine.scorePBI(testPBI);

      expect(result.id).toBe('PBI-001');
      expect(result.title).toBe('Test PBI');
      expect(result.overall_readiness).toBe('READY');
      expect(result.blocking_issues).toBe(0);
      expect(result.warning_issues).toBe(0);
      expect(result.confidenceScores.isCompletePBI.score).toBe(85);
    });

    it('should handle PBIs with low scores', async () => {
      const testPBI: ExtractedPBI = {
        id: 'PBI-002',
        title: 'Incomplete PBI',
        description: 'Vague description',
        acceptance_criteria: [],
        technical_notes: [],
        scope: {
          in_scope: [],
          out_of_scope: [],
        },
        dependencies: ['Unknown dependencies'],
        mentioned_by: ['Someone'],
        type: 'unknown',
      };

      const mockAnalysis: ClaudeAnalysis = {
        scores: {
          isCompletePBI: {
            score: 30,
            reasoning: 'Lacks clarity and detail',
            evidence: ['No clear value', 'User need unclear'],
          },
          hasAllRequirements: {
            score: 20,
            reasoning: 'Critical information missing',
            evidence: ['No technical details', 'Requirements undefined'],
          },
          isRefinementComplete: {
            score: 15,
            reasoning: 'Needs significant refinement',
            evidence: ['Not discussed by team', 'Many unknowns'],
          },
          hasAcceptanceCriteria: {
            score: 0,
            reasoning: 'No acceptance criteria defined',
            evidence: ['AC list is empty'],
          },
          hasClearScope: {
            score: 25,
            reasoning: 'Scope boundaries unclear',
            evidence: ['No in-scope items', 'No out-of-scope items'],
          },
          isEstimable: {
            score: 10,
            reasoning: 'Cannot estimate due to unknowns',
            evidence: ['Too vague', 'No technical approach'],
          },
        },
      };

      mockClaudeClient.analyzeWithPrompt.mockResolvedValue(mockAnalysis);

      const result = await scoringEngine.scorePBI(testPBI);

      expect(result.overall_readiness).toBe('NOT_READY');
      expect(result.blocking_issues).toBeGreaterThan(3);
      expect(result.warning_issues).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      const testPBI: ExtractedPBI = {
        id: 'PBI-003',
        title: 'Error Test PBI',
        description: 'Test error handling',
        acceptance_criteria: [],
        technical_notes: [],
        scope: { in_scope: [], out_of_scope: [] },
        dependencies: [],
        mentioned_by: [],
        type: 'test',
      };

      mockClaudeClient.analyzeWithPrompt.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const result = await scoringEngine.scorePBI(testPBI);

      expect(result.overall_readiness).toBe('NOT_READY');
      expect(result.blocking_issues).toBe(6);
      expect(result.confidenceScores.isCompletePBI.score).toBe(0);
      expect(result.confidenceScores.isCompletePBI.reasoning).toContain('Analysis failed');
    });
  });

  describe('issue counting', () => {
    it('should correctly count blocking and warning issues', async () => {
      const testPBI: ExtractedPBI = {
        id: 'PBI-004',
        title: 'Mixed Score PBI',
        description: 'PBI with varying scores',
        acceptance_criteria: ['AC1'],
        technical_notes: [],
        scope: { in_scope: ['Item'], out_of_scope: [] },
        dependencies: [],
        mentioned_by: ['PO'],
        type: 'feature',
      };

      const mockAnalysis: ClaudeAnalysis = {
        scores: {
          isCompletePBI: {
            score: 35, // Blocking (<40)
            reasoning: 'Poor definition',
            evidence: ['Low detail'],
          },
          hasAllRequirements: {
            score: 55, // Warning (40-60)
            reasoning: 'Some requirements missing',
            evidence: ['Partial info'],
          },
          isRefinementComplete: {
            score: 25, // Blocking (<40)
            reasoning: 'Not refined',
            evidence: ['Needs work'],
          },
          hasAcceptanceCriteria: {
            score: 70, // OK (>60)
            reasoning: 'AC present',
            evidence: ['Has criteria'],
          },
          hasClearScope: {
            score: 45, // Warning (40-60)
            reasoning: 'Scope unclear',
            evidence: ['Vague boundaries'],
          },
          isEstimable: {
            score: 80, // OK (>60)
            reasoning: 'Can estimate',
            evidence: ['Clear enough'],
          },
        },
      };

      mockClaudeClient.analyzeWithPrompt.mockResolvedValue(mockAnalysis);

      const result = await scoringEngine.scorePBI(testPBI);

      expect(result.blocking_issues).toBe(2); // 2 scores < 40
      expect(result.warning_issues).toBe(2); // 2 scores between 40-60
    });
  });
});