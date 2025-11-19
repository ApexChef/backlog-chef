/**
 * Main orchestrator for multi-tier event detection
 * Coordinates fallback between detection methods
 */

import {
  DetectionResult,
  TranscriptInput,
  SummaryInput,
  DetectorConfig,
  EventType
} from './types';
import { KeywordDetector } from './detectors/KeywordDetector';
import { SummaryAnalyzer } from './detectors/SummaryAnalyzer';
import { LLMAnalyzer } from './detectors/LLMAnalyzer';
import { PipelineRouter } from './PipelineRouter';
import { Logger } from './utils/Logger';

export class DetectionOrchestrator {
  private tier1Detector: KeywordDetector;
  private tier2Analyzer: SummaryAnalyzer;
  private tier3Analyzer?: LLMAnalyzer;
  private pipelineRouter: PipelineRouter;
  private config: DetectorConfig;
  private logger: Logger;

  constructor(config: DetectorConfig, apiKey?: string) {
    this.logger = new Logger('DetectionOrchestrator');
    this.config = config;

    // Initialize detectors
    this.tier1Detector = new KeywordDetector();
    this.tier2Analyzer = new SummaryAnalyzer();

    if (config.enableLLM && apiKey) {
      this.tier3Analyzer = new LLMAnalyzer(apiKey, config.maxTranscriptLength);
    }

    this.pipelineRouter = new PipelineRouter();

    this.logger.info('Detection orchestrator initialized');
  }

  /**
   * Main detection method with tier fallback
   */
  async detect(transcript: TranscriptInput, summary: SummaryInput): Promise<DetectionResult> {
    const overallStartTime = Date.now();
    let result: DetectionResult;

    this.logger.info(`Starting detection for meeting ${transcript.metadata.meetingId}`);

    // Tier 1: Keyword Detection
    this.logger.info('Starting Tier 1: Keyword Detection');
    result = this.tier1Detector.detect(transcript);

    if (this.shouldContinue(result, 'Tier 1')) {
      // Tier 2: Summary Analysis
      this.logger.info('Falling back to Tier 2: Summary Analysis');
      result = this.tier2Analyzer.analyze(summary);

      if (this.shouldContinue(result, 'Tier 2') && this.tier3Analyzer) {
        // Tier 3: LLM Analysis
        this.logger.info('Falling back to Tier 3: LLM Analysis');
        result = await this.tier3Analyzer.analyze(transcript.content);
      } else if (this.shouldContinue(result, 'Tier 2') && !this.tier3Analyzer) {
        this.logger.warn('Tier 3 LLM analysis not available, using Tier 2 results');
      }
    }

    // Add pipeline configuration
    if (result.eventType !== EventType.UNKNOWN) {
      result.pipelineConfig = this.pipelineRouter.route(result.eventType);
    }

    // Update total processing time
    const totalTime = Date.now() - overallStartTime;

    this.logger.info(
      `Detection completed in ${totalTime}ms - ` +
      `Type: ${result.eventType}, ` +
      `Confidence: ${result.confidence.toFixed(2)}, ` +
      `Method: ${result.detectionMethod}`
    );

    return {
      ...result,
      processingTimeMs: totalTime
    };
  }

  /**
   * Determine if detection should continue to next tier
   */
  private shouldContinue(result: DetectionResult, tier: string): boolean {
    const shouldFallback = result.confidence < this.config.confidenceThreshold ||
                          result.eventType === EventType.UNKNOWN;

    if (shouldFallback) {
      this.logger.info(
        `${tier} confidence (${result.confidence.toFixed(2)}) below threshold ` +
        `(${this.config.confidenceThreshold}), will try next tier`
      );
    } else {
      this.logger.info(
        `${tier} confidence (${result.confidence.toFixed(2)}) acceptable, ` +
        `using ${result.eventType}`
      );
    }

    return shouldFallback;
  }

  /**
   * Get current configuration
   */
  getConfig(): DetectorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DetectorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.info('Configuration updated', this.config);
  }
}