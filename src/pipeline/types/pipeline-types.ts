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
 * Similar work reference from Step 4
 */
export interface SimilarWork {
  ref: string;
  title: string;
  similarity: number;
  learnings: string[];
  link: string;
}

/**
 * Past decision from Step 4
 */
export interface PastDecision {
  ref: string;
  title: string;
  decision: string;
  rationale: string;
  constraints?: string;
  assigned_architect?: string;
  date?: string;
}

/**
 * Technical documentation reference from Step 4
 */
export interface TechnicalDoc {
  ref: string;
  title: string;
  relevant_sections?: string[];
  content?: string;
  note?: string;
  link: string;
}

/**
 * Risk flag from Step 4
 */
export interface RiskFlag {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

/**
 * Context enrichment from Step 4
 */
export interface ContextEnrichment {
  similar_work: SimilarWork[];
  past_decisions: PastDecision[];
  technical_docs: TechnicalDoc[];
  risk_flags: RiskFlag[];
  suggestions: string[];
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
 * Priority levels for questions from Step 6
 */
export type QuestionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Confidence levels for proposals from Step 6
 */
export type ProposalConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Question categories from Step 6
 */
export type QuestionCategory =
  | 'Business'
  | 'Technical'
  | 'Security'
  | 'UX'
  | 'UI'
  | 'Data'
  | 'Performance'
  | 'Testing'
  | 'Legal'
  | 'GDPR'
  | 'Compliance'
  | 'Budget'
  | 'Salesforce'
  | 'Integration'
  | 'Logistics'
  | 'Process'
  | 'Architecture'
  | 'Business/Security'
  | 'Technical/Budget'
  | 'Data/Performance'
  | 'Business/Technical'
  | 'Business Logic'
  | 'UX/Content';

/**
 * Stakeholder information from Step 6
 */
export interface Stakeholder {
  role: string;
  name: string;
  email: string;
}

/**
 * Documentation source from Step 6
 */
export interface DocumentationSource {
  title: string;
  excerpt: string;
  link: string;
  relevance?: number;
  note?: string;
}

/**
 * Documentation search result from Step 6
 */
export interface DocumentationSearch {
  found: boolean;
  sources?: DocumentationSource[];
  note?: string;
}

/**
 * Proposed answer from Step 6
 */
export interface ProposedAnswer {
  confidence: ProposalConfidence;
  suggestion: string;
  rationale: string;
  alternatives?: string[];
  legal_considerations?: string[];
  performance_recommendations?: string[];
  risk?: string;
  technical_implementation?: string[];
  localization_note?: string;
}

/**
 * Question with proposed answer from Step 6
 */
export interface QuestionWithAnswer {
  id: string;
  question: string;
  category: QuestionCategory;
  priority: QuestionPriority;
  stakeholders: Stakeholder[];
  proposed_answer: ProposedAnswer;
  documentation_search: DocumentationSearch;
}

/**
 * Questions grouped by priority
 */
export interface QuestionsByPriority {
  critical: QuestionWithAnswer[];
  high: QuestionWithAnswer[];
  medium: QuestionWithAnswer[];
  low: QuestionWithAnswer[];
}

/**
 * Output from Step 6: Generate Questions and Proposals
 */
export interface GenerateProposalsResult {
  pbis_with_questions: Array<{
    pbi_id: string;
    title: string;
    unanswered_questions: QuestionsByPriority;
    total_questions: number;
  }>;
  metadata: {
    total_questions: number;
    critical_questions: number;
    high_questions: number;
    medium_questions: number;
    low_questions: number;
    stakeholders_identified: string[];
  };
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
