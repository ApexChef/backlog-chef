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
export { EnrichContextStep } from './steps/step4-enrich-context';
export { CheckRisksStep } from './steps/step5-check-risks';
export { GenerateProposalsStep } from './steps/step6-generate-proposals';
export { ReadinessCheckerStep } from './steps/step7-readiness-checker';
export type { PipelineStep } from './steps/base-step';
