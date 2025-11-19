// ============================================================================
// INPUT TYPES (from Step 7 - Readiness Assessment)
// ============================================================================

export interface ReadinessAssessmentInput {
  readiness_assessment: PBIReadinessAssessment[];
  metadata: AssessmentMetadata;
}

export interface PBIReadinessAssessment {
  pbi_id: string;
  title: string;
  readiness_status: string;  // "🟢 READY", "🟡 NEEDS REFINEMENT", "🔴 NOT READY"
  readiness_score: string;   // e.g., "85/100"
  definition_of_ready_checklist: ChecklistResult;
  recommended_next_actions: RecommendedActions;
  sprint_readiness_eta: string;
  confidence_in_eta: 'HIGH' | 'MEDIUM' | 'LOW';
  estimation_guidance?: EstimationGuidance;
}

export interface ChecklistResult {
  passed: Record<string, CriterionEvaluation>;
  blocking_failures?: Record<string, CriterionEvaluation>;
  warnings?: Record<string, CriterionEvaluation>;
  suggestions?: Record<string, CriterionEvaluation>;
}

export interface CriterionEvaluation {
  status: string;
  evidence?: string;
  severity?: string;
  issues?: string[];
  issue?: string;
  note?: string;
  action_required?: string;
  recommendation?: string;
  suggestion?: string;
}

export interface RecommendedActions {
  immediate?: RecommendedAction[];
  before_sprint?: RecommendedAction[];
  nice_to_have?: RecommendedAction[];
  sprint_ready?: boolean;
  can_start?: string;
}

export interface RecommendedAction {
  action: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  owner?: string;
  estimated_time?: string;
}

export interface EstimationGuidance {
  similar_work?: string;
  complexity_factors?: string[];
  recommended_estimate?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AssessmentMetadata {
  generated_at: string;
  total_pbis: number;
  ready_count: number;
  not_ready_count: number;
  needs_refinement_count: number;
  average_readiness_score: number;
  model_used: string;
  processing_duration_ms: number;
  total_api_cost?: number;
}

// ============================================================================
// OUTPUT CONFIGURATION
// ============================================================================

export type OutputFormat = 'markdown' | 'devops' | 'confluence';

export interface OutputConfig {
  formats: OutputFormat[];
  outputDir: string;
}

// ============================================================================
// FORMATTER INTERFACES
// ============================================================================

export interface Formatter {
  format(assessment: PBIReadinessAssessment): string;
  formatSummary(input: ReadinessAssessmentInput): string;
  getFileExtension(): string;
  getName(): string;
}

// ============================================================================
// FORMATTED OUTPUT TYPES
// ============================================================================

export interface FormattedOutput {
  format: OutputFormat;
  filename: string;
  content: string;
  size: number;
}

export interface OutputResult {
  format: OutputFormat;
  success: boolean;
  filepath: string;
  size: number;
  error?: string;
}

export interface ProcessingResult {
  outputs: OutputResult[];
  total_pbis: number;
  total_outputs: number;
  success_count: number;
  failure_count: number;
  processing_duration_ms: number;
}
