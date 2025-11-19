import { PBIExtractor } from '../src/extractor/PBIExtractor';
import { PromptBuilder } from '../src/extractor/PromptBuilder';
import { ClaudeClient } from '../src/api/ClaudeClient';
import { PBICandidate } from '../src/models/PBICandidate';

// Mock the ClaudeClient
jest.mock('../src/api/ClaudeClient');

describe('PBIExtractor', () => {
  let extractor: PBIExtractor;
  let mockClaudeClient: jest.Mocked<ClaudeClient>;

  beforeEach(() => {
    mockClaudeClient = new ClaudeClient('test-key') as jest.Mocked<ClaudeClient>;
    extractor = new PBIExtractor(mockClaudeClient);
  });

  describe('extract', () => {
    it('should extract PBIs from a transcript', async () => {
      // Arrange
      const mockTranscript = 'Sarah (PO): We need a customer portal for order tracking.';
      const mockResponse = JSON.stringify({
        candidates: [
          {
            id: 'PBI-001',
            title: 'Customer Order Tracking Portal',
            description: 'Enable customers to check order status',
            acceptance_criteria: ['Customers can log in', 'Orders are displayed'],
            technical_notes: ['Use Experience Cloud'],
            scope: {
              in_scope: ['Product orders'],
              out_of_scope: ['Service appointments']
            },
            dependencies: ['Experience Cloud licenses'],
            mentioned_by: ['Sarah (PO)']
          }
        ]
      });

      mockClaudeClient.generateCompletion.mockResolvedValue(mockResponse);

      // Act
      const result = await extractor.extract(mockTranscript);

      // Assert
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].title).toBe('Customer Order Tracking Portal');
      expect(result.metadata?.total_candidates).toBe(1);
    });

    it('should handle empty transcript', async () => {
      // Arrange
      const mockResponse = JSON.stringify({ candidates: [] });
      mockClaudeClient.generateCompletion.mockResolvedValue(mockResponse);

      // Act
      const result = await extractor.extract('');

      // Assert
      expect(result.candidates).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockClaudeClient.generateCompletion.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      // Act & Assert
      await expect(extractor.extract('test transcript')).rejects.toThrow(
        'PBI extraction failed: API rate limit exceeded'
      );
    });

    it('should validate and clean PBI data', async () => {
      // Arrange
      const mockResponse = JSON.stringify({
        candidates: [
          {
            title: 'Test PBI',
            // Missing required fields - should be filled with defaults
          }
        ]
      });

      mockClaudeClient.generateCompletion.mockResolvedValue(mockResponse);

      // Act
      const result = await extractor.extract('test');

      // Assert
      const pbi = result.candidates[0];
      expect(pbi.id).toBeDefined();
      expect(pbi.description).toBe('');
      expect(pbi.acceptance_criteria).toEqual([]);
      expect(pbi.technical_notes).toEqual([]);
      expect(pbi.dependencies).toEqual([]);
    });
  });

  describe('analyzeExtractionQuality', () => {
    it('should analyze extraction quality metrics', () => {
      // Arrange
      const mockResult = {
        candidates: [
          {
            id: 'PBI-001',
            title: 'Test PBI',
            description: 'Test',
            acceptance_criteria: ['AC1', 'AC2'],
            technical_notes: ['Note1'],
            scope: { in_scope: ['Feature1'], out_of_scope: [] },
            dependencies: [],
            mentioned_by: ['Person1'],
            phase: 'phase_1',
            status: 'ready'
          } as PBICandidate,
          {
            id: 'PBI-002',
            title: 'Test PBI 2',
            description: 'Test 2',
            acceptance_criteria: [],
            technical_notes: [],
            scope: { in_scope: [], out_of_scope: [] },
            dependencies: ['Dep1'],
            mentioned_by: ['Person2'],
            phase: 'phase_2'
          } as PBICandidate
        ],
        metadata: {
          extracted_at: new Date().toISOString(),
          total_candidates: 2
        }
      };

      // Act
      const analysis = extractor.analyzeExtractionQuality(mockResult);

      // Assert
      expect(analysis.totalPBIs).toBe(2);
      expect(analysis.withAcceptanceCriteria).toBe(1);
      expect(analysis.withTechnicalNotes).toBe(1);
      expect(analysis.withDependencies).toBe(1);
      expect(analysis.withScope).toBe(1);
      expect(analysis.byPhase).toEqual({ phase_1: 1, phase_2: 1 });
      expect(analysis.byStatus).toEqual({ ready: 1 });
    });
  });
});

describe('PromptBuilder', () => {
  let promptBuilder: PromptBuilder;

  beforeEach(() => {
    promptBuilder = new PromptBuilder();
  });

  describe('buildExtractionPrompt', () => {
    it('should build a prompt with transcript only', () => {
      // Act
      const { systemPrompt, userPrompt } = promptBuilder.buildExtractionPrompt(
        'Test transcript content'
      );

      // Assert
      expect(systemPrompt).toContain('expert Scrum facilitator');
      expect(userPrompt).toContain('Test transcript content');
      expect(userPrompt).toContain('extract all potential Product Backlog Items');
    });

    it('should include summary when provided', () => {
      // Act
      const { userPrompt } = promptBuilder.buildExtractionPrompt(
        'Test transcript',
        'Test summary'
      );

      // Assert
      expect(userPrompt).toContain('Test summary');
      expect(userPrompt).toContain('Meeting Summary for Context:');
    });

    it('should include extraction guidelines', () => {
      // Act
      const { userPrompt } = promptBuilder.buildExtractionPrompt('Test');

      // Assert
      expect(userPrompt).toContain('acceptance_criteria');
      expect(userPrompt).toContain('technical_notes');
      expect(userPrompt).toContain('dependencies');
      expect(userPrompt).toContain('mentioned_by');
    });
  });
});