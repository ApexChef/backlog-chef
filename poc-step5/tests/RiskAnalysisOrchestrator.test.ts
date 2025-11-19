import { RiskAnalysisOrchestrator } from '../src/services/RiskAnalysisOrchestrator';
import { ClaudeApiClient } from '../src/services/ClaudeApiClient';
import * as fs from 'fs/promises';
import { config } from '../src/config';

// Mock dependencies
jest.mock('../src/services/ClaudeApiClient');
jest.mock('fs/promises');
jest.mock('../src/config', () => ({
  config: {
    inputFilePath: '/test/input.json',
    outputFilePath: '/test/output.json',
    maxConcurrentAnalyses: 2,
    claudeModel: 'claude-3-5-haiku-20241022',
    logLevel: 'error',
  },
}));

describe('RiskAnalysisOrchestrator', () => {
  let orchestrator: RiskAnalysisOrchestrator;
  let mockClaudeClient: jest.Mocked<ClaudeApiClient>;

  const mockEnrichedData = {
    enriched_candidates: [
      {
        id: 'PBI-001',
        title: 'Test PBI 1',
        confidenceScores: {
          isCompletePBI: { score: 90, reasoning: 'Good', evidence: [] },
          hasAllRequirements: { score: 85, reasoning: 'Complete', evidence: [] },
          isRefinementComplete: { score: 75, reasoning: 'Mostly', evidence: [] },
          hasAcceptanceCriteria: { score: 95, reasoning: 'Clear', evidence: [] },
          hasClearScope: { score: 90, reasoning: 'Defined', evidence: [] },
          isEstimable: { score: 80, reasoning: 'Can estimate', evidence: [] },
        },
        overall_readiness: 'READY',
        blocking_issues: 0,
        warning_issues: 0,
        context_enrichment: {
          similar_work: [],
          past_decisions: [],
          technical_docs: [],
          risk_flags: [
            {
              type: 'LICENSE_CAPACITY',
              severity: 'HIGH',
              message: 'Limited licenses available',
            },
          ],
          suggestions: [],
        },
      },
      {
        id: 'PBI-002',
        title: 'Test PBI 2',
        confidenceScores: {
          isCompletePBI: { score: 70, reasoning: 'Partial', evidence: [] },
          hasAllRequirements: { score: 65, reasoning: 'Missing some', evidence: [] },
          isRefinementComplete: { score: 60, reasoning: 'Needs work', evidence: [] },
          hasAcceptanceCriteria: { score: 80, reasoning: 'Good', evidence: [] },
          hasClearScope: { score: 50, reasoning: 'Unclear', evidence: [] },
          isEstimable: { score: 65, reasoning: 'Difficult', evidence: [] },
        },
        overall_readiness: 'NOT_READY',
        blocking_issues: 0,
        warning_issues: 1,
        context_enrichment: {
          similar_work: [],
          past_decisions: [],
          technical_docs: [],
          risk_flags: [],
          suggestions: [],
        },
      },
    ],
  };

  const mockClaudeResponse = {
    risks: [
      {
        type: 'BLOCKING_DEPENDENCY',
        severity: 'CRITICAL',
        description: 'License capacity insufficient',
        detail: 'Need more licenses',
        action_required: 'Purchase licenses',
        assigned_to: 'PO',
        confidence: 0.95,
        evidence: ['Current pool: 500'],
      },
      {
        type: 'TECHNICAL_COMPLEXITY',
        severity: 'HIGH',
        description: 'Complex integration',
        detail: 'Multiple systems involved',
        action_required: 'Technical spike',
        assigned_to: 'Dev Team',
        confidence: 0.85,
        evidence: ['Multiple APIs'],
      },
    ],
    conflicts: [
      {
        type: 'EXISTING_WORK',
        description: 'Overlaps with PBI-999',
        detail: 'Similar functionality',
        resolution: 'Merge or coordinate',
        assigned_to: 'SM',
        related_items: ['PBI-999'],
      },
    ],
    complexity_analysis: {
      score: 8.5,
      factors: ['Technical complexity', 'Dependencies'],
      recommended_split: true,
      split_suggestion: 'Split into 3 smaller PBIs',
    },
    analysis_confidence: 0.9,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup ClaudeApiClient mock
    mockClaudeClient = {
      analyzeRisks: jest.fn().mockResolvedValue(mockClaudeResponse),
    } as any;

    (ClaudeApiClient as jest.MockedClass<typeof ClaudeApiClient>).mockImplementation(
      () => mockClaudeClient
    );

    // Setup fs mocks
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockEnrichedData));
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

    orchestrator = new RiskAnalysisOrchestrator();
  });

  describe('analyzeRisks', () => {
    it('should successfully analyze all PBIs', async () => {
      const result = await orchestrator.analyzeRisks();

      expect(result).toBeDefined();
      expect(result.risk_analysis).toHaveLength(2);
      expect(result.metadata.total_analyzed).toBe(2);
    });

    it('should load enriched PBIs from input file', async () => {
      await orchestrator.analyzeRisks();

      expect(fs.readFile).toHaveBeenCalledWith(config.inputFilePath, 'utf-8');
    });

    it('should call Claude API for each PBI', async () => {
      await orchestrator.analyzeRisks();

      expect(mockClaudeClient.analyzeRisks).toHaveBeenCalledTimes(2);
      expect(mockClaudeClient.analyzeRisks).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'PBI-001' })
      );
      expect(mockClaudeClient.analyzeRisks).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'PBI-002' })
      );
    });

    it('should organize risks by severity', async () => {
      const result = await orchestrator.analyzeRisks();
      const firstAnalysis = result.risk_analysis[0];

      expect(firstAnalysis.risks.CRITICAL).toHaveLength(1);
      expect(firstAnalysis.risks.HIGH).toHaveLength(1);
      expect(firstAnalysis.risks.CRITICAL[0].type).toBe('BLOCKING_DEPENDENCY');
    });

    it('should include complexity analysis', async () => {
      const result = await orchestrator.analyzeRisks();
      const firstAnalysis = result.risk_analysis[0];

      expect(firstAnalysis.complexity_score).toBe(8.5);
      expect(firstAnalysis.recommended_split).toBe(true);
      expect(firstAnalysis.split_suggestion).toBe('Split into 3 smaller PBIs');
    });

    it('should save results to output file', async () => {
      await orchestrator.analyzeRisks();

      expect(fs.writeFile).toHaveBeenCalledWith(
        config.outputFilePath,
        expect.any(String),
        'utf-8'
      );

      const savedData = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedData.risk_analysis).toHaveLength(2);
      expect(savedData.metadata).toBeDefined();
    });

    it('should calculate correct metadata', async () => {
      const result = await orchestrator.analyzeRisks();

      expect(result.metadata).toMatchObject({
        total_analyzed: 2,
        critical_risks: 2, // 1 per PBI
        high_risks: 2, // 1 per PBI
        total_conflicts: 2, // 1 per PBI
        high_complexity_items: 2, // Both have score > 7
        model_used: 'claude-3-5-haiku-20241022',
      });
    });

    it('should handle API failures with fallback analysis', async () => {
      // Make first call fail, second succeed
      mockClaudeClient.analyzeRisks
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockClaudeResponse);

      const result = await orchestrator.analyzeRisks();

      expect(result.risk_analysis).toHaveLength(2);
      // First should be fallback, second normal
      expect(result.risk_analysis[0].analysis_confidence).toBe(0.5); // Fallback confidence
      expect(result.risk_analysis[1].analysis_confidence).toBe(0.9); // Normal confidence
    });

    it('should throw error if input file not found', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(orchestrator.analyzeRisks()).rejects.toThrow('Cannot read input file');
    });

    it('should throw error if no enriched PBIs found', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ enriched_candidates: [] }));

      await expect(orchestrator.analyzeRisks()).rejects.toThrow('No enriched PBIs found');
    });

    it('should respect batch size configuration', async () => {
      // Create 5 PBIs with batch size of 2
      const largeMockData = {
        enriched_candidates: Array(5).fill(mockEnrichedData.enriched_candidates[0]),
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(largeMockData));

      await orchestrator.analyzeRisks();

      // Should be called 5 times total
      expect(mockClaudeClient.analyzeRisks).toHaveBeenCalledTimes(5);
    });
  });

  describe('fallback analysis', () => {
    it('should create meaningful fallback for NOT_READY PBIs', async () => {
      // Force API to fail
      mockClaudeClient.analyzeRisks.mockRejectedValue(new Error('API Error'));

      const result = await orchestrator.analyzeRisks();

      // Check PBI-002 (NOT_READY)
      const notReadyAnalysis = result.risk_analysis.find(r => r.id === 'PBI-002');
      expect(notReadyAnalysis?.complexity_score).toBeGreaterThan(7); // Should be high
      expect(notReadyAnalysis?.recommended_split).toBe(true);
    });

    it('should use existing risk flags in fallback', async () => {
      mockClaudeClient.analyzeRisks.mockRejectedValue(new Error('API Error'));

      const result = await orchestrator.analyzeRisks();

      // Check PBI-001 which has risk flags
      const pbi1Analysis = result.risk_analysis.find(r => r.id === 'PBI-001');
      expect(pbi1Analysis?.risks.HIGH).toHaveLength(1);
      expect(pbi1Analysis?.risks.HIGH[0].detail).toContain('Limited licenses');
    });
  });
});