/**
 * Pipeline module exports
 */

// Orchestrator
export { PipelineOrchestrator } from './orchestrator/pipeline-orchestrator';

// Types
export * from './types/pipeline-types';

// Steps (for advanced usage)
export { EventDetectionStep } from './steps/step1-event-detection';
export { ExtractCandidatesStep } from './steps/step2-extract-candidates';
export { ScoreConfidenceStep } from './steps/step3-score-confidence';
export { GenerateProposalsStep } from './steps/step6-generate-proposals';
export type { PipelineStep } from './steps/base-step';
