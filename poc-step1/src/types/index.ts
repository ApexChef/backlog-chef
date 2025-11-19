/**
 * Core types and interfaces for Event Detection system
 */

export enum EventType {
  REFINEMENT = 'refinement',
  PLANNING = 'planning',
  RETROSPECTIVE = 'retrospective',
  DAILY = 'daily',
  UNKNOWN = 'unknown'
}

export enum DetectionMethod {
  KEYWORDS = 'keywords',
  SUMMARY_ANALYSIS = 'summary_analysis',
  LLM = 'llm'
}

export interface TranscriptInput {
  content: string;
  metadata: {
    meetingId: string;
    meetingTitle?: string;
    duration?: number;
    participants?: string[];
  };
}

export interface SummaryInput {
  actionItems: string[];
  questions: string[];
  decisions: string[];
  keyTopics: string[];
}

export interface DetectionResult {
  eventType: EventType;
  confidence: number;
  detectionMethod: DetectionMethod;
  reasoning: string;
  pipelineConfig?: PipelineConfig;
  matchedKeywords?: string[];
  processingTimeMs: number;
}

export interface PipelineConfig {
  pipelineName: string;
  version: string;
  steps: PipelineStep[];
  configuration?: Record<string, any>;
}

export interface PipelineStep {
  name: string;
  handler: string;
  input: string[];
  output: string[];
  config?: Record<string, any>;
}

export interface KeywordConfig {
  eventType: EventType;
  keywords: string[];
  weight: number;
  minMatches: number;
  confidenceBoost?: number;
}

export interface SummaryPattern {
  eventType: EventType;
  requiredSections: string[];
  patterns: string[];
  confidence: number;
}

export interface DetectorConfig {
  confidenceThreshold: number;
  maxTranscriptLength: number;
  enableLLM: boolean;
  llmModel?: string;
}

export interface LLMResponse {
  eventType: EventType;
  confidence: number;
  reasoning: string;
}