// Core type definitions for Risk Analysis POC

export interface EnrichedPBI {
  id: string;
  title: string;
  confidenceScores: {
    isCompletePBI: ScoreDetail;
    hasAllRequirements: ScoreDetail;
    isRefinementComplete: ScoreDetail;
    hasAcceptanceCriteria: ScoreDetail;
    hasClearScope: ScoreDetail;
    isEstimable: ScoreDetail;
  };
  overall_readiness: 'READY' | 'MOSTLY_READY' | 'NOT_READY';
  blocking_issues: number;
  warning_issues: number;
  context_enrichment: ContextEnrichment;
}

export interface ScoreDetail {
  score: number;
  reasoning: string;
  evidence: string[];
}

export interface ContextEnrichment {
  similar_work: SimilarWork[];
  past_decisions: PastDecision[];
  technical_docs: TechnicalDoc[];
  risk_flags: RiskFlag[];
  suggestions: string[];
}

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
  date: string;
}

export interface TechnicalDoc {
  ref: string;
  title: string;
  relevant_sections: string[];
  note?: string;
  link: string;
}

export interface RiskFlag {
  type: string;
  severity: string;
  message: string;
}

// Risk Analysis Result Types
export interface RiskAnalysisResult {
  id: string;
  title: string;
  risks: RiskCollection;
  conflicts: Conflict[];
  complexity_score: number;
  recommended_split: boolean;
  split_suggestion?: string;
  analysis_confidence: number;
  analyzed_at: string;
}

export interface RiskCollection {
  CRITICAL: Risk[];
  HIGH: Risk[];
  MEDIUM: Risk[];
  LOW: Risk[];
}

export interface Risk {
  type: RiskType;
  description: string;
  detail: string;
  action_required: string;
  assigned_to: string;
  confidence: number;
  evidence: string[];
}

export interface Conflict {
  type: ConflictType;
  description: string;
  detail: string;
  resolution: string;
  assigned_to: string;
  related_items: string[];
}

export enum RiskType {
  BLOCKING_DEPENDENCY = 'BLOCKING_DEPENDENCY',
  UNRESOLVED_DECISION = 'UNRESOLVED_DECISION',
  SCOPE_CREEP_RISK = 'SCOPE_CREEP_RISK',
  TECHNICAL_COMPLEXITY = 'TECHNICAL_COMPLEXITY',
  DEPENDENCY_ON_INFLIGHT_WORK = 'DEPENDENCY_ON_INFLIGHT_WORK',
  ESTIMATION_UNCERTAINTY = 'ESTIMATION_UNCERTAINTY',
  MISSING_STAKEHOLDER = 'MISSING_STAKEHOLDER',
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY'
}

export enum ConflictType {
  EXISTING_WORK = 'EXISTING_WORK',
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT'
}

export enum RiskSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

// API Response Types
export interface ClaudeAnalysisResponse {
  risks: Array<{
    type: string;
    severity: string;
    description: string;
    detail: string;
    action_required: string;
    assigned_to: string;
    confidence: number;
    evidence: string[];
  }>;
  conflicts: Array<{
    type: string;
    description: string;
    detail: string;
    resolution: string;
    assigned_to: string;
    related_items: string[];
  }>;
  complexity_analysis: {
    score: number;
    factors: string[];
    recommended_split: boolean;
    split_suggestion?: string;
  };
  analysis_confidence: number;
}

// Output format
export interface RiskAnalysisOutput {
  risk_analysis: RiskAnalysisResult[];
  metadata: {
    analyzed_at: string;
    total_analyzed: number;
    critical_risks: number;
    high_risks: number;
    medium_risks: number;
    low_risks: number;
    total_conflicts: number;
    high_complexity_items: number;
    model_used: string;
    analysis_duration_ms: number;
  };
}