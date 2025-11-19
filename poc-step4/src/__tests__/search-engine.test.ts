import { ContextSearchEngine } from '../search/engine';
import { ClaudeClient } from '../ai/claude-client';
import { ScoredPBI, SearchQuery } from '../types';

// Mock the mock data modules
jest.mock('../data/mock-devops', () => ({
  searchDevOpsPBIs: jest.fn().mockReturnValue([
    {
      id: 'MOCK-001',
      title: 'Mock Portal Project',
      description: 'Test description',
      learnings: ['Learning 1', 'Learning 2'],
      tags: ['portal'],
      technologies: ['salesforce']
    }
  ])
}));

jest.mock('../data/mock-confluence', () => ({
  searchConfluenceDocuments: jest.fn().mockReturnValue([
    {
      id: 'DOC-001',
      title: 'Test Documentation',
      sections: [
        { title: 'Section 1', content: 'Content with keyword' }
      ],
      tags: ['test']
    }
  ])
}));

jest.mock('../data/mock-meetings', () => ({
  searchMeetingTranscripts: jest.fn().mockReturnValue([
    {
      id: 'MEETING-001',
      title: 'Test Meeting',
      date: '2024-01-01',
      decisions: [
        {
          decision: 'Test decision with keyword',
          rationale: 'Test rationale'
        }
      ]
    }
  ])
}));

describe('ContextSearchEngine', () => {
  let searchEngine: ContextSearchEngine;
  let mockClaudeClient: ClaudeClient;

  beforeEach(() => {
    const mockConfig = {
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

    mockClaudeClient = new ClaudeClient(mockConfig);

    // Mock Claude client methods
    mockClaudeClient.calculateSimilarity = jest.fn().mockResolvedValue(65);
    mockClaudeClient.generateSuggestions = jest.fn().mockResolvedValue(['Suggestion 1']);
    mockClaudeClient.analyzeRisks = jest.fn().mockResolvedValue([]);

    searchEngine = new ContextSearchEngine(mockClaudeClient);
  });

  describe('searchForContext', () => {
    it('should search all data sources and return context', async () => {
      const pbi: ScoredPBI = {
        id: 'PBI-001',
        title: 'Test Portal',
        confidenceScores: {} as any,
        overall_readiness: 'READY',
        blocking_issues: 0,
        warning_issues: 0
      };

      const searchQuery: SearchQuery = {
        keywords: ['portal', 'test', 'keyword'],
        concepts: ['self-service'],
        technologies: ['salesforce']
      };

      const result = await searchEngine.searchForContext(pbi, searchQuery);

      expect(result).toBeDefined();
      expect(result.similar_work).toBeDefined();
      expect(result.technical_docs).toBeDefined();
      expect(result.past_decisions).toBeDefined();

      // Verify Claude client was called for similarity calculation
      expect(mockClaudeClient.calculateSimilarity).toHaveBeenCalled();
    });

    it('should filter similar work by similarity threshold', async () => {
      const pbi: ScoredPBI = {
        id: 'PBI-001',
        title: 'Test PBI',
        confidenceScores: {} as any,
        overall_readiness: 'READY',
        blocking_issues: 0,
        warning_issues: 0
      };

      const searchQuery: SearchQuery = {
        keywords: ['test'],
        concepts: [],
        technologies: []
      };

      // Mock low similarity score
      mockClaudeClient.calculateSimilarity = jest.fn().mockResolvedValue(30);

      const result = await searchEngine.searchForContext(pbi, searchQuery);

      // Should filter out items with low similarity
      expect(result.similar_work).toHaveLength(0);
    });

    it('should limit results to top 3 per category', async () => {
      const pbi: ScoredPBI = {
        id: 'PBI-001',
        title: 'Test PBI',
        confidenceScores: {} as any,
        overall_readiness: 'READY',
        blocking_issues: 0,
        warning_issues: 0
      };

      const searchQuery: SearchQuery = {
        keywords: ['test'],
        concepts: [],
        technologies: []
      };

      // Mock high similarity for all items
      mockClaudeClient.calculateSimilarity = jest.fn().mockResolvedValue(80);

      const result = await searchEngine.searchForContext(pbi, searchQuery);

      // Each category should have max 3 items
      expect(result.similar_work.length).toBeLessThanOrEqual(3);
      expect(result.technical_docs.length).toBeLessThanOrEqual(3);
      expect(result.past_decisions.length).toBeLessThanOrEqual(3);
    });
  });
});