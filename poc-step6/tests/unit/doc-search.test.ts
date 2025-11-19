/**
 * Unit tests for Documentation Search Service
 */

import { DocumentationSearchService } from '../../src/services/doc-search';
import { Question } from '../../src/types';

describe('DocumentationSearchService', () => {
  describe('generateDocumentationSummary', () => {
    it('should calculate correct documentation coverage', () => {
      const questions: Partial<Question>[] = [
        {
          documentation_search: {
            found: true,
            sources: [
              {
                title: 'Test Doc 1',
                excerpt: 'Test excerpt',
                link: 'https://example.com/doc1'
              }
            ]
          }
        },
        {
          documentation_search: {
            found: true,
            sources: [
              {
                title: 'Test Doc 2',
                excerpt: 'Test excerpt',
                link: 'https://example.com/doc2'
              },
              {
                title: 'Test Doc 1',
                excerpt: 'Another excerpt',
                link: 'https://example.com/doc1'
              }
            ]
          }
        },
        {
          documentation_search: {
            found: false,
            note: 'No documentation found'
          }
        }
      ];

      const summary = DocumentationSearchService.generateDocumentationSummary(
        questions as Question[]
      );

      expect(summary.totalSearches).toBe(3);
      expect(summary.documentsFound).toBe(2);
      expect(summary.coverageRate).toBe(67); // 2/3 = 66.67%
      expect(summary.topSources).toContain('https://example.com/doc1');
    });

    it('should handle no documentation found', () => {
      const questions: Partial<Question>[] = [
        { documentation_search: { found: false } },
        { documentation_search: { found: false } }
      ];

      const summary = DocumentationSearchService.generateDocumentationSummary(
        questions as Question[]
      );

      expect(summary.totalSearches).toBe(2);
      expect(summary.documentsFound).toBe(0);
      expect(summary.coverageRate).toBe(0);
      expect(summary.topSources).toHaveLength(0);
    });

    it('should identify top sources correctly', () => {
      const questions: Partial<Question>[] = [
        {
          documentation_search: {
            found: true,
            sources: [
              { title: 'Doc A', excerpt: '', link: 'link-a' },
              { title: 'Doc B', excerpt: '', link: 'link-b' }
            ]
          }
        },
        {
          documentation_search: {
            found: true,
            sources: [
              { title: 'Doc A', excerpt: '', link: 'link-a' },
              { title: 'Doc C', excerpt: '', link: 'link-c' }
            ]
          }
        },
        {
          documentation_search: {
            found: true,
            sources: [
              { title: 'Doc A', excerpt: '', link: 'link-a' }
            ]
          }
        }
      ];

      const summary = DocumentationSearchService.generateDocumentationSummary(
        questions as Question[]
      );

      expect(summary.topSources[0]).toBe('link-a'); // Most referenced
      expect(summary.topSources).toHaveLength(3);
    });
  });
});