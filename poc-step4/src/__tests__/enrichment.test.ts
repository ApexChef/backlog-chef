import { ClaudeClient } from '../ai/claude-client';
import { searchDevOpsPBIs } from '../data/mock-devops';
import { searchConfluenceDocuments } from '../data/mock-confluence';
import { searchMeetingTranscripts } from '../data/mock-meetings';

describe('Context Enrichment', () => {
  describe('Mock Data Sources', () => {
    it('should find DevOps PBIs by keywords', () => {
      const results = searchDevOpsPBIs(['portal', 'experience']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Portal');
    });

    it('should find Confluence documents by keywords', () => {
      const results = searchConfluenceDocuments(['order', 'status']);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(doc => doc.id === 'CONF-Status-Picklist')).toBe(true);
    });

    it('should find meeting transcripts by keywords', () => {
      const results = searchMeetingTranscripts(['gdpr', 'compliance']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].decisions.length).toBeGreaterThan(0);
    });
  });

  describe('Search Query Generation', () => {
    it('should extract keywords from PBI title', () => {
      const mockConfig = {
        claudeApiKey: 'test-key',
        claudeModel: 'claude-3-5-haiku-20241022',
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

      const client = new ClaudeClient(mockConfig);
      // Test the fallback keyword extraction
      const result = (client as any).extractKeywordsFromTitle('Customer Order Portal');
      expect(result.keywords).toContain('customer');
      expect(result.keywords).toContain('order');
      expect(result.keywords).toContain('portal');
    });
  });

  describe('Risk Analysis', () => {
    it('should identify risks based on patterns', async () => {
      const mockConfig = {
        claudeApiKey: 'test-key',
        claudeModel: 'claude-3-5-haiku-20241022',
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

      const client = new ClaudeClient(mockConfig);
      const mockSimilarWork = [
        {
          title: 'Test Project',
          estimated_effort: 10,
          actual_effort: 20,
          learnings: ['Performance issues encountered']
        }
      ];

      const risks = await client.analyzeRisks('Customer Portal', mockSimilarWork);
      expect(risks.length).toBeGreaterThan(0);
      expect(risks.some(r => r.type === 'SIMILAR_WORK_UNDERESTIMATED')).toBe(true);
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate simple text similarity', () => {
      const mockConfig = {
        claudeApiKey: 'test-key',
        claudeModel: 'claude-3-5-haiku-20241022',
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

      const client = new ClaudeClient(mockConfig);
      const similarity = (client as any).simpleSimilarity(
        'Customer Order Portal',
        'Customer Portal Implementation'
      );
      expect(similarity).toBeGreaterThan(30);
      expect(similarity).toBeLessThan(100);
    });
  });
});