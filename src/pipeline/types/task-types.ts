/**
 * Task generation type definitions
 *
 * Types for generating tasks from Definition of Ready and Definition of Done
 */

/**
 * Task categories
 */
export type TaskCategory =
  | 'code_quality'
  | 'testing'
  | 'documentation'
  | 'deployment'
  | 'approval'
  | 'localization'
  | 'development'
  | 'demo'
  | 'functional'
  | 'technical'
  | 'estimation'
  | 'prioritization'
  | 'process';

/**
 * Task types
 */
export type TaskType =
  | 'refinement'   // Pre-work task from DoR gap
  | 'code'         // Implementation task
  | 'test'         // Testing task
  | 'documentation'// Documentation task
  | 'review'       // Code review task
  | 'deployment'   // Deployment task
  | 'acceptance';  // Acceptance/approval task

/**
 * Task priority (from DoR)
 */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Task status
 */
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

/**
 * A single generated task
 */
export interface GeneratedTask {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  category: TaskCategory;

  // Links to DoR/DoD
  dor_reference?: string;        // Reference to DoR item (e.g., "dor-001")
  dod_references?: string[];     // References to DoD items (e.g., ["dod-001", "dod-002"])

  // Links to PBI
  acceptance_criteria_ref?: string;  // Which AC this task relates to

  // Execution metadata
  automated: boolean;            // Can this task be automated?
  requires_human: boolean;       // Requires human intervention?
  agent_hint?: string;           // Which agent/tool can execute this
  estimated_effort?: string;     // Time estimate (e.g., "2 hours")

  // Task management
  priority?: TaskPriority;       // For refinement tasks (from DoR)
  status: TaskStatus;
  responsibility?: string;       // Who is responsible (from DoD)
  verification?: string;         // How to verify completion
}

/**
 * Tasks organized by phase
 */
export interface TasksByPhase {
  pre_work: GeneratedTask[];          // Tasks to complete before sprint (DoR gaps)
  implementation: GeneratedTask[];    // Tasks during sprint (from DoD)
  verification: GeneratedTask[];      // Tasks for verification/approval
}

/**
 * Task generation summary
 */
export interface TaskGenerationSummary {
  total_tasks: number;
  pre_work_tasks: number;
  implementation_tasks: number;
  verification_tasks: number;
  automated_tasks: number;
  manual_tasks: number;
  estimated_total_effort?: string;
  blocking_tasks: number;  // Tasks that must be done before sprint
}

/**
 * Complete task generation result for a PBI
 */
export interface TaskGenerationResult {
  pbi_id: string;
  pbi_title: string;
  tasks: TasksByPhase;
  summary: TaskGenerationSummary;
}

/**
 * Definition of Ready criterion (from config YAML)
 */
export interface DoRCriterion {
  id: string;
  requirement: string;
  requirement_nl?: string;  // Dutch translation if applicable
  verification: string;
  refinement_task: string;
  priority: TaskPriority;
  category: string;
}

/**
 * Definition of Done criterion (from config YAML)
 */
export interface DoDCriterion {
  id: string;
  category: string;
  responsibility?: string;
  requirement: string;
  requirement_nl?: string;  // Dutch translation if applicable
  verification: string;
  automated: boolean;
  task_template: string;
  agent_hint?: string;
  estimated_effort?: string;
}

/**
 * DoR configuration (loaded from YAML)
 */
export interface DoRConfig {
  definition_of_ready: DoRCriterion[];
  metadata?: {
    team?: string;
    language?: string;
    last_updated?: string;
    version?: string;
  };
  notes?: string;
}

/**
 * DoD configuration (loaded from YAML)
 */
export interface DoDConfig {
  definition_of_done: DoDCriterion[];
  metadata?: {
    team?: string;
    language?: string;
    responsibilities?: Record<string, string>;
    last_updated?: string;
    version?: string;
  };
  notes?: string;
}

/**
 * DoR gap detection result
 */
export interface DoRGap {
  criterion: DoRCriterion;
  is_met: boolean;
  reason?: string;  // Why it's not met
}

/**
 * DoR assessment result
 */
export interface DoRAssessment {
  gaps: DoRGap[];
  total_criteria: number;
  met_criteria: number;
  unmet_criteria: number;
  blocking_gaps: DoRGap[];  // Critical/high priority gaps
  warning_gaps: DoRGap[];   // Medium/low priority gaps
}
