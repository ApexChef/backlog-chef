import { EnrichmentOrchestrator } from '../enrichment/orchestrator';
import { Config } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock the Claude client to avoid API calls in tests
jest.mock('../ai/claude-client', () => ({
  ClaudeClient: jest.fn().mockImplementation(() => ({
    generateSearchQueries: jest.fn().mockResolvedValue({
      keywords: ['customer', 'portal', 'order'],
      concepts: ['self-service', 'user-experience'],
      technologies: ['salesforce', 'cloud']
    }),
    calculateSimilarity: jest.fn().mockResolvedValue(75),
    generateSuggestions: jest.fn().mockResolvedValue([
      'Test suggestion 1',
      'Test suggestion 2'
    ]),
    analyzeRisks: jest.fn().mockResolvedValue([
      {
        type: 'TEST_RISK',
        severity: 'HIGH',
        message: 'Test risk message'
      }
    ])
  }))
}));

describe('EnrichmentOrchestrator', () => {
  let orchestrator: EnrichmentOrchestrator;
  let config: Config;
  let testInputPath: string;
  let testOutputPath: string;

  beforeEach(() => {
    config = {
      claudeApiKey: 'test-key',
      claudeModel: 'test-model',
      inputPath: '',
      outputPath: '',
      searchSettings: {
        maxResults: 5,
        similarityThreshold: 0.5
      },
      mockDataSettings: {
        useMockData: true
      }
    };

    orchestrator = new EnrichmentOrchestrator(config);

    // Create test file paths
    testInputPath = path.join(__dirname, 'test-input.json');
    testOutputPath = path.join(__dirname, 'test-output.json');
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testInputPath)) {
      fs.unlinkSync(testInputPath);
    }
    if (fs.existsSync(testOutputPath)) {
      fs.unlinkSync(testOutputPath);
    }
  });

  describe('enrichPBIs', () => {
    it('should load and enrich PBI candidates', async () => {
      // Create test input file
      const testInput = {
        scored_candidates: [
          {
            id: 'TEST-001',
            title: 'Test PBI',
            confidenceScores: {},
            overall_readiness: 'READY',
            blocking_issues: 0,
            warning_issues: 0
          }
        ]
      };

      fs.writeFileSync(testInputPath, JSON.stringify(testInput));

      // Enrich PBIs
      const result = await orchestrator.enrichPBIs(testInputPath);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('TEST-001');
      expect(result[0].context_enrichment).toBeDefined();
      expect(result[0].context_enrichment.suggestions).toHaveLength(2);
      expect(result[0].context_enrichment.risk_flags).toHaveLength(1);
    });

    it('should handle missing input file gracefully', async () => {
      const nonExistentPath = '/path/that/does/not/exist.json';

      await expect(orchestrator.enrichPBIs(nonExistentPath))
        .rejects
        .toThrow('Input file not found');
    });

    it('should handle invalid JSON gracefully', async () => {
      fs.writeFileSync(testInputPath, 'invalid json content');

      await expect(orchestrator.enrichPBIs(testInputPath))
        .rejects
        .toThrow();
    });

    it('should handle missing scored_candidates array', async () => {
      const invalidInput = { someOtherField: 'value' };
      fs.writeFileSync(testInputPath, JSON.stringify(invalidInput));

      await expect(orchestrator.enrichPBIs(testInputPath))
        .rejects
        .toThrow('Invalid input format: missing scored_candidates array');
    });
  });

  describe('saveEnrichedPBIs', () => {
    it('should save enriched PBIs to file', () => {
      const enrichedPBIs: any[] = [
        {
          id: 'TEST-001',
          title: 'Test PBI',
          confidenceScores: {},
          overall_readiness: 'READY' as const,
          blocking_issues: 0,
          warning_issues: 0,
          context_enrichment: {
            similar_work: [],
            past_decisions: [],
            technical_docs: [],
            risk_flags: [],
            suggestions: []
          }
        }
      ];

      orchestrator.saveEnrichedPBIs(enrichedPBIs, testOutputPath);

      expect(fs.existsSync(testOutputPath)).toBe(true);

      const savedContent = JSON.parse(fs.readFileSync(testOutputPath, 'utf-8'));
      expect(savedContent.enriched_candidates).toHaveLength(1);
      expect(savedContent.metadata).toBeDefined();
      expect(savedContent.metadata.total_enriched).toBe(1);
    });

    it('should create output directory if it does not exist', () => {
      const nestedPath = path.join(__dirname, 'nested', 'dir', 'output.json');

      const enrichedPBIs: any[] = [
        {
          id: 'TEST-001',
          title: 'Test PBI',
          confidenceScores: {},
          overall_readiness: 'READY' as const,
          blocking_issues: 0,
          warning_issues: 0,
          context_enrichment: {
            similar_work: [],
            past_decisions: [],
            technical_docs: [],
            risk_flags: [],
            suggestions: []
          }
        }
      ];

      orchestrator.saveEnrichedPBIs(enrichedPBIs, nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);

      // Clean up
      fs.unlinkSync(nestedPath);
      fs.rmdirSync(path.dirname(nestedPath));
      fs.rmdirSync(path.dirname(path.dirname(nestedPath)));
    });
  });
});