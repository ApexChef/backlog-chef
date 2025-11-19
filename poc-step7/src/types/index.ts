// ============================================================================
// INPUT TYPES (from Step 6)
// ============================================================================

export interface QuestionProposal {
  id: string;
  question: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  stakeholders: Stakeholder[];
  proposed_answer?: ProposedAnswer;
  documentation_search?: DocumentationSearch;
}

export interface Stakeholder {
  role: string;
  name: string;
  email: string;
}

export interface ProposedAnswer {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
  rationale: string;
  alternatives?: string[];
  legal_considerations?: string[];
  risk?: string;
}

export interface DocumentationSearch {
  found: boolean;
  sources?: DocumentationSource[];
}

export interface DocumentationSource {
  title: string;
  excerpt: string;
  link: string;
  relevance?: number;
  note?: string;
}

export interface PBIWithQuestions {
  pbi_id: string;
  title: string;
  unanswered_questions: {
    critical: QuestionProposal[];
    high: QuestionProposal[];
    medium: QuestionProposal[];
    low: QuestionProposal[];
  };
  complexity_score?: number;
  recommended_split?: boolean;
  split_suggestion?: string;
}

export interface Step6Input {
  questions_and_proposals: PBIWithQuestions[];
  metadata: {
    generated_at: string;
    total_pbis: number;
    total_questions: number;
    critical_questions: number;
    high_questions: number;
    [key: string]: any;
  };
}

// ============================================================================
// DEFINITION OF READY CONFIG TYPES
// ============================================================================

export interface ReadinessCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  evaluation_prompt: string;
}

export interface DefinitionOfReadyConfig {
  criteria: {
    blocking: ReadinessCriterion[];
    warning: ReadinessCriterion[];
    suggestion: ReadinessCriterion[];
  };
  thresholds: {
    ready: number;
    needs_refinement: number;
    not_ready: number;
  };
  severity: {
    blocking: SeverityConfig;
    warning: SeverityConfig;
    suggestion: SeverityConfig;
  };
  status_icons: {
    ready: string;
    needs_refinement: string;
    not_ready: string;
    deferred: string;
    future_phase: string;
  };
  action_priorities: {
    [key: string]: PriorityConfig;
  };
  confidence_levels: Array<{ [key: string]: string }>;
}

export interface SeverityConfig {
  emoji: string;
  label: string;
  description: string;
}

export interface PriorityConfig {
  label: string;
  description: string;
}

// ============================================================================
// READINESS ASSESSMENT OUTPUT TYPES
// ============================================================================

export type ReadinessStatus = 'READY' | 'NOT_READY' | 'NEEDS_REFINEMENT' | 'DEFERRED' | 'FUTURE_PHASE';
export type CriterionStatus = 'PASS' | 'FAIL' | 'WARNING' | 'SUGGESTION' | 'MOSTLY';
export type ActionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CriterionEvaluation {
  status: CriterionStatus;
  evidence?: string;
  severity?: 'BLOCKING' | 'WARNING' | 'SUGGESTION';
  issues?: string[];
  issue?: string;
  note?: string;
  action_required?: string;
  recommendation?: string;
  suggestion?: string;
}

export interface ChecklistResult {
  passed: Record<string, CriterionEvaluation>;
  blocking_failures?: Record<string, CriterionEvaluation>;
  warnings?: Record<string, CriterionEvaluation>;
  suggestions?: Record<string, CriterionEvaluation>;
}

export interface RecommendedAction {
  action: string;
  priority: ActionPriority;
  owner?: string;
  estimated_time?: string;
}

export interface RecommendedActions {
  immediate?: RecommendedAction[];
  before_sprint?: RecommendedAction[];
  nice_to_have?: RecommendedAction[];
  sprint_ready?: boolean;
  can_start?: string;
}

export interface EstimationGuidance {
  similar_work?: string;
  complexity_factors?: string[];
  recommended_estimate?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PBIReadinessAssessment {
  pbi_id: string;
  title: string;
  readiness_status: string;
  readiness_score: string;
  definition_of_ready_checklist: ChecklistResult;
  recommended_next_actions: RecommendedActions;
  sprint_readiness_eta: string;
  confidence_in_eta: 'HIGH' | 'MEDIUM' | 'LOW';
  estimation_guidance?: EstimationGuidance;
}

export interface ReadinessAssessmentOutput {
  readiness_assessment: PBIReadinessAssessment[];
  metadata: {
    generated_at: string;
    total_pbis: number;
    ready_count: number;
    not_ready_count: number;
    needs_refinement_count: number;
    average_readiness_score: number;
    model_used: string;
    processing_duration_ms: number;
    total_api_cost?: number;
  };
}

// ============================================================================
// INTERNAL EVALUATION TYPES
// ============================================================================

export interface CriterionEvaluationRequest {
  pbi: PBIWithQuestions;
  criterion: ReadinessCriterion;
  severity: 'blocking' | 'warning' | 'suggestion';
}

export interface CriterionEvaluationResult {
  criterion_id: string;
  status: CriterionStatus;
  score: number;
  evidence?: string;
  issues?: string[];
  issue?: string;
  note?: string;
  action_required?: string;
  recommendation?: string;
  suggestion?: string;
}

export interface ReadinessEvaluationContext {
  pbi: PBIWithQuestions;
  config: DefinitionOfReadyConfig;
  unanswered_critical_questions: number;
  unanswered_high_questions: number;
  has_blocking_dependencies: boolean;
  has_license_issues: boolean;
  has_legal_issues: boolean;
}

// ============================================================================
// API CLIENT TYPES
// ============================================================================

export interface ClaudeAPIConfig {
  apiKey: string;
  model: string;
  maxRetries: number;
  retryDelay: number;
}

export interface ClaudeAPIResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason?: string;
}

export interface APICallMetrics {
  timestamp: string;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number;
}
