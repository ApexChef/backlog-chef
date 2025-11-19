/**
 * TypeScript Type Definitions for POC Step 6: Generate Questions + Proposals
 */

// Priority levels for questions
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// Confidence levels for proposals
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

// Question categories/domains
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

// Stakeholder interface
export interface Stakeholder {
  role: string;
  name: string;
  email: string;
}

// Documentation source interface
export interface DocumentationSource {
  title: string;
  excerpt: string;
  link: string;
  relevance?: number;
  note?: string;
}

// Documentation search result
export interface DocumentationSearch {
  found: boolean;
  sources?: DocumentationSource[];
  note?: string;
}

// Proposed answer interface
export interface ProposedAnswer {
  confidence: Confidence;
  suggestion: string;
  rationale: string;
  alternatives?: string[];
  legal_considerations?: string[];
  performance_recommendations?: string[];
  risk?: string;
  technical_implementation?: string[];
  localization_note?: string;
}

// Main question interface
export interface Question {
  id: string;
  question: string;
  category: QuestionCategory;
  priority: Priority;
  stakeholders: Stakeholder[];
  proposed_answer: ProposedAnswer;
  documentation_search: DocumentationSearch;
}

// Question group by priority
export interface QuestionsByPriority {
  critical: Question[];
  high: Question[];
  medium: Question[];
  low: Question[];
}

// PBI questions and proposals
export interface PBIQuestionsAndProposals {
  pbi_id: string;
  title: string;
  unanswered_questions: QuestionsByPriority;
}

// Output metadata
export interface OutputMetadata {
  generated_at: string;
  total_pbis: number;
  total_questions: number;
  critical_questions: number;
  high_questions: number;
  medium_questions: number;
  low_questions: number;
  stakeholders_identified: string[];
  model_used: string;
  generation_duration_ms: number;
  api_usage?: {
    total_api_calls: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

// Main output structure
export interface QuestionsAndProposalsOutput {
  questions_and_proposals: PBIQuestionsAndProposals[];
  metadata: OutputMetadata;
}

// Input from Step 5 - Risk Analysis
export interface Risk {
  type: string;
  description: string;
  detail: string;
  action_required: string;
  assigned_to: string;
  confidence: number;
  evidence: string[];
}

export interface Conflict {
  type: string;
  description: string;
  detail: string;
  resolution: string;
  assigned_to: string;
  related_items: string[];
}

export interface RisksByPriority {
  CRITICAL: Risk[];
  HIGH: Risk[];
  MEDIUM: Risk[];
  LOW: Risk[];
}

export interface RiskAnalyzedPBI {
  id: string;
  title: string;
  risks: RisksByPriority;
  conflicts: Conflict[];
  complexity_score: number;
  recommended_split: boolean;
  split_suggestion?: string | null;
  analysis_confidence: number;
  analyzed_at: string;
}

export interface RiskAnalysisInput {
  risk_analysis: RiskAnalyzedPBI[];
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

// Stakeholder registry configuration
export interface StakeholderRole {
  id: string;
  title: string;
  domains: string[];
  default_assignee: {
    name: string;
    email: string;
  };
  backup_assignee?: {
    name: string;
    email: string;
  };
}

export interface StakeholderRegistry {
  roles: StakeholderRole[];
  domain_mapping: Record<string, string[]>;
  escalation_rules: Record<Priority, string[]>;
}

// Claude API interfaces
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Application configuration
export interface AppConfig {
  claudeApiKey: string;
  claudeModel: string;
  maxRetries: number;
  retryDelay: number;
  inputFile: string;
  outputFile: string;
  stakeholderRegistryFile: string;
  enableDebugLogging: boolean;
}

// Question generation context
export interface QuestionGenerationContext {
  pbi: RiskAnalyzedPBI;
  stakeholderRegistry: StakeholderRegistry;
  existingQuestions?: Question[];
}