import { ClaudeApiClient } from '../src/services/ClaudeApiClient';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');
jest.mock('../src/config', () => ({
  config: {
    anthropicApiKey: 'test-key',
    claudeModel: 'claude-3-5-haiku-20241022',
    claudeMaxTokens: 4096,
    claudeTemperature: 0.3,
    logLevel: 'error',
  },
}));

describe('ClaudeApiClient', () => {
  let client: ClaudeApiClient;
  let mockAnthropicClient: jest.Mocked<Anthropic>;

  const mockPBI = {
    id: 'PBI-001',
    title: 'Test PBI',
    confidenceScores: {
      isCompletePBI: { score: 90, reasoning: 'Good', evidence: [] },
      hasAllRequirements: { score: 85, reasoning: 'Complete', evidence: [] },
      isRefinementComplete: { score: 75, reasoning: 'Mostly', evidence: [] },
      hasAcceptanceCriteria: { score: 95, reasoning: 'Clear', evidence: [] },
      hasClearScope: { score: 90, reasoning: 'Defined', evidence: [] },
      isEstimable: { score: 80, reasoning: 'Can estimate', evidence: [] },
    },
    overall_readiness: 'READY' as const,
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
          message: 'Limited licenses',
        },
      ],
      suggestions: [],
    },
  };

  const mockValidResponse = {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          risks: [
            {
              type: 'BLOCKING_DEPENDENCY',
              severity: 'CRITICAL',
              description: 'Test risk',
              detail: 'Test detail',
              action_required: 'Test action',
              assigned_to: 'Test person',
              confidence: 0.9,
              evidence: ['Test evidence'],
            },
          ],
          conflicts: [
            {
              type: 'EXISTING_WORK',
              description: 'Test conflict',
              detail: 'Test detail',
              resolution: 'Test resolution',
              assigned_to: 'Test person',
              related_items: ['PBI-999'],
            },
          ],
          complexity_analysis: {
            score: 7.5,
            factors: ['Factor 1'],
            recommended_split: true,
            split_suggestion: 'Test suggestion',
          },
          analysis_confidence: 0.85,
        }),
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAnthropicClient = {
      messages: {
        create: jest.fn().mockResolvedValue(mockValidResponse),
      },
    } as any;

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
      () => mockAnthropicClient
    );

    client = new ClaudeApiClient();
  });

  describe('analyzeRisks', () => {
    it('should successfully analyze a PBI', async () => {
      const result = await client.analyzeRisks(mockPBI);

      expect(result).toBeDefined();
      expect(result.risks).toHaveLength(1);
      expect(result.conflicts).toHaveLength(1);
      expect(result.complexity_analysis.score).toBe(7.5);
      expect(result.analysis_confidence).toBe(0.85);
    });

    it('should call Claude API with correct parameters', async () => {
      await client.analyzeRisks(mockPBI);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('PBI-001'),
          },
        ],
      });
    });

    it('should include PBI details in the prompt', async () => {
      await client.analyzeRisks(mockPBI);

      const call = mockAnthropicClient.messages.create.mock.calls[0][0];
      const prompt = call.messages[0].content;

      expect(prompt).toContain('PBI-001');
      expect(prompt).toContain('Test PBI');
      expect(prompt).toContain('LICENSE_CAPACITY');
    });

    it('should retry on API failure', async () => {
      // Fail twice, then succeed
      mockAnthropicClient.messages.create
        .mockRejectedValueOnce(new Error('API Error 1'))
        .mockRejectedValueOnce(new Error('API Error 2'))
        .mockResolvedValueOnce(mockValidResponse);

      const result = await client.analyzeRisks(mockPBI);

      expect(result).toBeDefined();
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));

      await expect(client.analyzeRisks(mockPBI)).rejects.toThrow('API Error');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
    });

    it('should handle malformed JSON in response', async () => {
      const badResponse = {
        content: [
          {
            type: 'text',
            text: 'This is not JSON',
          },
        ],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(badResponse as any);

      await expect(client.analyzeRisks(mockPBI)).rejects.toThrow(
        'Failed to parse AI response'
      );
    });

    it('should handle response with markdown formatting', async () => {
      const markdownResponse = {
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify({
              risks: [],
              conflicts: [],
              complexity_analysis: {
                score: 5,
                factors: [],
                recommended_split: false,
              },
              analysis_confidence: 0.8,
            }) + '\n```',
          },
        ],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(markdownResponse as any);

      const result = await client.analyzeRisks(mockPBI);

      expect(result).toBeDefined();
      expect(result.complexity_analysis.score).toBe(5);
    });

    it('should validate response structure', async () => {
      const invalidResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              // Missing required fields
              risks: [],
              // Missing: conflicts, complexity_analysis, analysis_confidence
            }),
          },
        ],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(invalidResponse as any);

      await expect(client.analyzeRisks(mockPBI)).rejects.toThrow(
        'Invalid response structure'
      );
    });

    it('should handle non-text response type', async () => {
      const nonTextResponse = {
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: 'abc' },
          },
        ],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(nonTextResponse as any);

      await expect(client.analyzeRisks(mockPBI)).rejects.toThrow(
        'Unexpected response type from Claude API'
      );
    });
  });

  describe('prompt building', () => {
    it('should include all risk types in prompt', async () => {
      await client.analyzeRisks(mockPBI);

      const call = mockAnthropicClient.messages.create.mock.calls[0][0];
      const prompt = call.messages[0].content;

      expect(prompt).toContain('BLOCKING_DEPENDENCY');
      expect(prompt).toContain('UNRESOLVED_DECISION');
      expect(prompt).toContain('SCOPE_CREEP_RISK');
      expect(prompt).toContain('TECHNICAL_COMPLEXITY');
      expect(prompt).toContain('DEPENDENCY_ON_INFLIGHT_WORK');
      expect(prompt).toContain('ESTIMATION_UNCERTAINTY');
      expect(prompt).toContain('MISSING_STAKEHOLDER');
      expect(prompt).toContain('DATA_INCONSISTENCY');
    });

    it('should include all severity levels in prompt', async () => {
      await client.analyzeRisks(mockPBI);

      const call = mockAnthropicClient.messages.create.mock.calls[0][0];
      const prompt = call.messages[0].content;

      expect(prompt).toContain('CRITICAL');
      expect(prompt).toContain('HIGH');
      expect(prompt).toContain('MEDIUM');
      expect(prompt).toContain('LOW');
    });

    it('should include conflict types in prompt', async () => {
      await client.analyzeRisks(mockPBI);

      const call = mockAnthropicClient.messages.create.mock.calls[0][0];
      const prompt = call.messages[0].content;

      expect(prompt).toContain('EXISTING_WORK');
      expect(prompt).toContain('DATA_INCONSISTENCY');
      expect(prompt).toContain('RESOURCE_CONFLICT');
    });
  });
});