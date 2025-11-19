/**
 * Pipeline type definitions
 *
 * Core types for the Backlog Chef processing pipeline
 */

/**
 * Input for the pipeline - meeting transcript
 */
export interface PipelineInput {
  transcript: string;
  metadata?: {
    meeting_date?: string;
    meeting_duration?: string;
    participants?: string[];
    source?: string;
  };
}

/**
 * Output from Step 1: Event Detection
 */
export interface EventDetectionResult {
  event_type: 'refinement' | 'planning' | 'retrospective' | 'daily_standup' | 'unknown';
  confidence: number;
  reasoning: string;
}

/**
 * Candidate PBI from Step 2: Extract Candidates
 */
export interface CandidatePBI {
  id: string;
  title: string;
  description: string;
  acceptance_criteria?: string[];
  notes?: string[];
  mentioned_by?: string[];
}

/**
 * Output from Step 2: Extract Candidates
 */
export interface ExtractCandidatesResult {
  candidates: CandidatePBI[];
  total_found: number;
}

/**
 * Confidence score from Step 3: Score Confidence
 */
export interface ConfidenceScore {
  overall_score: number;
  completeness: number;
  clarity: number;
  actionability: number;
  testability: number;
  missing_elements: string[];
  strengths: string[];
  concerns: string[];
}

/**
 * Output from Step 3: Score Confidence
 */
export interface ScoreConfidenceResult {
  scored_pbis: Array<{
    pbi: CandidatePBI;
    scores: ConfidenceScore;
  }>;
}

/**
 * Context enrichment from Step 4
 */
export interface ContextEnrichment {
  similar_work?: string[];
  related_decisions?: string[];
  technical_context?: string;
  dependencies?: string[];
}

/**
 * Output from Step 4: Enrich with Context
 */
export interface EnrichContextResult {
  enriched_pbis: Array<{
    pbi: CandidatePBI;
    scores: ConfidenceScore;
    context: ContextEnrichment;
  }>;
}

/**
 * Risk assessment from Step 5
 */
export interface RiskAssessment {
  risks: Array<{
    type: 'dependency' | 'scope_creep' | 'blocker' | 'technical_debt' | 'resource';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigation?: string;
  }>;
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Output from Step 5: Check Risks
 */
export interface CheckRisksResult {
  pbis_with_risks: Array<{
    pbi: CandidatePBI;
    scores: ConfidenceScore;
    context: ContextEnrichment;
    risks: RiskAssessment;
  }>;
}

/**
 * Question with proposed answer from Step 6
 */
export interface QuestionWithAnswer {
  question: string;
  category: 'functional' | 'technical' | 'acceptance' | 'scope' | 'dependencies';
  priority: 'must_answer' | 'should_answer' | 'nice_to_have';
  proposed_answer: string;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
}

/**
 * Output from Step 6: Generate Questions and Proposals
 */
export interface GenerateProposalsResult {
  pbis_with_questions: Array<{
    pbi: CandidatePBI;
    scores: ConfidenceScore;
    context: ContextEnrichment;
    risks: RiskAssessment;
    questions: QuestionWithAnswer[];
  }>;
}

/**
 * Readiness assessment from Step 7
 */
export interface ReadinessAssessment {
  readiness_status: '🟢 READY' | '🟡 NEEDS REFINEMENT' | '🔴 NOT READY';
  readiness_score: number;
  blocking_issues: string[];
  warnings: string[];
  recommendations: string[];
  sprint_ready: boolean;
  estimated_refinement_time?: string;
}

/**
 * Output from Step 7: Readiness Checker
 */
export interface ReadinessCheckerResult {
  assessed_pbis: Array<{
    pbi: CandidatePBI;
    scores: ConfidenceScore;
    context: ContextEnrichment;
    risks: RiskAssessment;
    questions: QuestionWithAnswer[];
    readiness: ReadinessAssessment;
  }>;
}

/**
 * Final pipeline output (Step 8 formats this)
 */
export interface PipelineOutput {
  event_type: string;
  pbis: Array<{
    pbi: CandidatePBI;
    scores: ConfidenceScore;
    context: ContextEnrichment;
    risks: RiskAssessment;
    questions: QuestionWithAnswer[];
    readiness: ReadinessAssessment;
  }>;
  metadata: {
    processed_at: string;
    total_pbis: number;
    ready_count: number;
    needs_refinement_count: number;
    not_ready_count: number;
    total_cost_usd: number;
    total_duration_ms: number;
    models_used: string[];
  };
}

/**
 * Pipeline execution options
 */
export interface PipelineOptions {
  // Step control
  steps?: {
    skip?: string[];  // Steps to skip
    only?: string[];  // Only run these steps
  };

  // AI configuration
  ai?: {
    temperature?: number;
    maxTokens?: number;
  };

  // Output configuration
  output?: {
    formats?: Array<'markdown' | 'devops' | 'confluence'>;
    directory?: string;
  };

  // Cost limits
  costLimits?: {
    per_run_limit_usd?: number;
    alert_threshold_usd?: number;
  };
}

/**
 * Pipeline execution context
 * Passed between steps
 */
export interface PipelineContext {
  input: PipelineInput;
  options: PipelineOptions;

  // Results from each step
  eventDetection?: EventDetectionResult;
  extractedCandidates?: ExtractCandidatesResult;
  scoredPBIs?: ScoreConfidenceResult;
  enrichedPBIs?: EnrichContextResult;
  risksAssessed?: CheckRisksResult;
  questionsGenerated?: GenerateProposalsResult;
  readinessAssessed?: ReadinessCheckerResult;

  // Execution metadata
  startTime: number;
  stepTimings: Record<string, number>;
  totalCost: number;
  modelsUsed: Set<string>;
}
