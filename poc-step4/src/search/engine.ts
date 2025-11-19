import {
  ScoredPBI,
  SearchQuery,
  MockDocument,
  SimilarWork,
  PastDecision,
  TechnicalDoc
} from '../types';
import { searchDevOpsPBIs } from '../data/mock-devops';
import { searchConfluenceDocuments } from '../data/mock-confluence';
import { searchMeetingTranscripts } from '../data/mock-meetings';
import { ClaudeClient } from '../ai/claude-client';

export class ContextSearchEngine {
  constructor(private claudeClient: ClaudeClient) {}

  async searchForContext(pbi: ScoredPBI, query: SearchQuery) {
    const allKeywords = [
      ...query.keywords,
      ...query.concepts,
      ...query.technologies
    ];

    // Search all data sources in parallel
    const [devOpsResults, confluenceResults, meetingResults] = await Promise.all([
      this.searchSimilarWork(pbi, allKeywords),
      this.searchTechnicalDocs(pbi, allKeywords),
      this.searchPastDecisions(pbi, allKeywords)
    ]);

    return {
      similar_work: devOpsResults,
      technical_docs: confluenceResults,
      past_decisions: meetingResults
    };
  }

  private async searchSimilarWork(pbi: ScoredPBI, keywords: string[]): Promise<SimilarWork[]> {
    const mockPBIs = searchDevOpsPBIs(keywords);
    const results: SimilarWork[] = [];

    // Calculate similarity for each found PBI
    for (const mockPBI of mockPBIs.slice(0, 5)) { // Limit to top 5
      const similarity = await this.claudeClient.calculateSimilarity(
        pbi.title,
        mockPBI.title + ' ' + mockPBI.description
      );

      if (similarity > 40) { // Only include if similarity > 40%
        results.push({
          ref: mockPBI.id,
          title: mockPBI.title,
          similarity: similarity,
          learnings: mockPBI.learnings,
          link: `https://devops.company.com/${mockPBI.id}`
        });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, 3); // Return top 3
  }

  private async searchTechnicalDocs(pbi: ScoredPBI, keywords: string[]): Promise<TechnicalDoc[]> {
    const documents = searchConfluenceDocuments(keywords);
    const results: TechnicalDoc[] = [];

    for (const doc of documents.slice(0, 5)) {
      const relevantSections = doc.sections
        .filter(section =>
          keywords.some(keyword =>
            section.content.toLowerCase().includes(keyword.toLowerCase())
          )
        )
        .map(section => section.content);

      if (relevantSections.length > 0 || this.isRelevantDoc(pbi.title, doc)) {
        results.push({
          ref: doc.id,
          title: doc.title,
          relevant_sections: relevantSections.slice(0, 3),
          note: this.generateDocNote(doc, pbi.title),
          link: `https://confluence.company.com/${doc.id}`
        });
      }
    }

    return results.slice(0, 3); // Return top 3
  }

  private async searchPastDecisions(_pbi: ScoredPBI, keywords: string[]): Promise<PastDecision[]> {
    const meetings = searchMeetingTranscripts(keywords);
    const results: PastDecision[] = [];

    for (const meeting of meetings) {
      for (const decision of meeting.decisions) {
        const isRelevant = keywords.some(keyword =>
          decision.decision.toLowerCase().includes(keyword.toLowerCase()) ||
          decision.rationale.toLowerCase().includes(keyword.toLowerCase())
        );

        if (isRelevant) {
          results.push({
            ref: meeting.id,
            title: meeting.title,
            decision: decision.decision,
            rationale: decision.rationale,
            constraints: decision.constraints,
            assigned_architect: decision.assigned_architect,
            date: meeting.date
          });
        }
      }
    }

    return results.slice(0, 3); // Return top 3
  }

  private isRelevantDoc(pbiTitle: string, doc: MockDocument): boolean {
    const pbiKeywords = pbiTitle.toLowerCase().split(/\s+/);
    const docText = `${doc.title} ${doc.tags.join(' ')}`.toLowerCase();

    return pbiKeywords.some(keyword => docText.includes(keyword));
  }

  private generateDocNote(doc: MockDocument, pbiTitle: string): string | undefined {
    // Generate contextual notes for specific scenarios
    if (doc.id === 'CONF-Status-Picklist' && pbiTitle.toLowerCase().includes('status')) {
      return 'More statuses exist than discussed in meeting!';
    }

    if (doc.id === 'CONF-License-Management' && pbiTitle.toLowerCase().includes('portal')) {
      return 'Current license usage at 76% capacity';
    }

    if (doc.type === 'architecture') {
      return 'Architecture guide - review for implementation patterns';
    }

    return undefined;
  }
}