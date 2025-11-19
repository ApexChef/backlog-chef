// Type definitions for Step 4: Enrich with Context

// Input types from Step 3
export interface ConfidenceScore {
  score: number;
  reasoning: string;
  evidence: string[];
}

export interface ConfidenceScores {
  isCompletePBI: ConfidenceScore;
  hasAllRequirements: ConfidenceScore;
  isRefinementComplete: ConfidenceScore;
  hasAcceptanceCriteria: ConfidenceScore;
  hasClearScope: ConfidenceScore;
  isEstimable: ConfidenceScore;
}

export interface ScoredPBI {
  id: string;
  title: string;
  confidenceScores: ConfidenceScores;
  overall_readiness: 'READY' | 'MOSTLY_READY' | 'NOT_READY';
  blocking_issues: number;
  warning_issues: number;
}

// Context enrichment types
export interface SimilarWork {
  ref: string;
  title: string;
  similarity: number;
  learnings: string[];
  link: string;
}

export interface PastDecision {
  ref: string;
  title: string;
  decision: string;
  rationale: string;
  constraints?: string;
  assigned_architect?: string;
  date?: string;
}

export interface TechnicalDoc {
  ref: string;
  title: string;
  relevant_sections?: string[];
  content?: string;
  note?: string;
  link: string;
}

export interface RiskFlag {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

export interface ContextEnrichment {
  similar_work: SimilarWork[];
  past_decisions: PastDecision[];
  technical_docs: TechnicalDoc[];
  risk_flags: RiskFlag[];
  suggestions: string[];
}

// Output type
export interface EnrichedPBI extends ScoredPBI {
  context_enrichment: ContextEnrichment;
}

// Mock data types
export interface MockPBI {
  id: string;
  title: string;
  description: string;
  tags: string[];
  actual_effort: number;
  estimated_effort: number;
  learnings: string[];
  technologies: string[];
  completion_date: string;
  status: string;
}

export interface MockDocument {
  id: string;
  title: string;
  space: string;
  content: string;
  sections: {
    title: string;
    content: string;
  }[];
  tags: string[];
  last_updated: string;
  type: 'architecture' | 'technical' | 'process' | 'guidelines';
}

export interface MockDecision {
  decision: string;
  rationale: string;
  constraints?: string;
  assigned_architect?: string;
}

export interface MockMeeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  decisions: MockDecision[];
  action_items: string[];
  topics: string[];
}

// Configuration
export interface Config {
  claudeApiKey: string;
  claudeModel: string;
  inputPath: string;
  outputPath: string;
  searchSettings: {
    maxResults: number;
    similarityThreshold: number;
  };
  mockDataSettings: {
    useMockData: boolean;
  };
}

// Search types
export interface SearchQuery {
  keywords: string[];
  concepts: string[];
  technologies: string[];
}

export interface SearchResult<T> {
  item: T;
  relevance: number;
  matchedTerms: string[];
}