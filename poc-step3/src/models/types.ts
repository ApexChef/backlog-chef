/**
 * Type definitions for POC Step 3: Score Confidence
 */

// Input types from Step 2
export interface ExtractedPBI {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  technical_notes: string[];
  scope: {
    in_scope: string[];
    out_of_scope: string[];
  };
  dependencies: string[];
  mentioned_by: string[];
  phase?: string;
  type: string;
}

export interface ExtractedPBIsFile {
  candidates: ExtractedPBI[];
  metadata: {
    extracted_at: string;
    total_candidates: number;
  };
}

// Scoring types
export interface ConfidenceScore {
  score: number;
  reasoning: string;
  evidence: string[];
}

export interface PBIConfidenceScores {
  isCompletePBI: ConfidenceScore;
  hasAllRequirements: ConfidenceScore;
  isRefinementComplete: ConfidenceScore;
  hasAcceptanceCriteria: ConfidenceScore;
  hasClearScope: ConfidenceScore;
  isEstimable: ConfidenceScore;
}

export type ReadinessLevel = 'READY' | 'MOSTLY_READY' | 'NOT_READY' | 'DEFERRED' | 'FUTURE_PHASE';

export interface ScoredPBI {
  id: string;
  title: string;
  confidenceScores: PBIConfidenceScores;
  overall_readiness: ReadinessLevel;
  blocking_issues: number;
  warning_issues: number;
}

export interface ScoredPBIsOutput {
  scored_candidates: ScoredPBI[];
  metadata: {
    scored_at: string;
    total_scored: number;
    model_used: string;
  };
}

// Claude API response structure
export interface ClaudeAnalysis {
  scores: {
    isCompletePBI: {
      score: number;
      reasoning: string;
      evidence: string[];
    };
    hasAllRequirements: {
      score: number;
      reasoning: string;
      evidence: string[];
    };
    isRefinementComplete: {
      score: number;
      reasoning: string;
      evidence: string[];
    };
    hasAcceptanceCriteria: {
      score: number;
      reasoning: string;
      evidence: string[];
    };
    hasClearScope: {
      score: number;
      reasoning: string;
      evidence: string[];
    };
    isEstimable: {
      score: number;
      reasoning: string;
      evidence: string[];
    };
  };
}