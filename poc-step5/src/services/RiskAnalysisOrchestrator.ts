import { promises as fs } from 'fs';
import path from 'path';
import { ClaudeApiClient } from './ClaudeApiClient';
import { createModuleLogger } from '../utils/logger';
import { config } from '../config';
import {
  EnrichedPBI,
  RiskAnalysisResult,
  RiskAnalysisOutput,
  Risk,
  RiskSeverity,
  ClaudeAnalysisResponse,
} from '../types';

const logger = createModuleLogger('RiskAnalysisOrchestrator');

export class RiskAnalysisOrchestrator {
  private claudeClient: ClaudeApiClient;

  constructor() {
    this.claudeClient = new ClaudeApiClient();
  }

  async analyzeRisks(): Promise<RiskAnalysisOutput> {
    const startTime = Date.now();

    try {
      // Load enriched PBIs
      logger.info(`Loading enriched PBIs from ${config.inputFilePath}`);
      const enrichedData = await this.loadEnrichedPBIs();

      if (!enrichedData.enriched_candidates || enrichedData.enriched_candidates.length === 0) {
        throw new Error('No enriched PBIs found in input file');
      }

      logger.info(`Found ${enrichedData.enriched_candidates.length} PBIs to analyze`);

      // Analyze each PBI
      const analysisResults: RiskAnalysisResult[] = [];
      const batchSize = config.maxConcurrentAnalyses;

      for (let i = 0; i < enrichedData.enriched_candidates.length; i += batchSize) {
        const batch = enrichedData.enriched_candidates.slice(i, i + batchSize);
        logger.info(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} PBIs)`);

        const batchPromises = batch.map(pbi => this.analyzeSinglePBI(pbi));
        const batchResults = await Promise.allSettled(batchPromises);

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          if (result.status === 'fulfilled') {
            analysisResults.push(result.value);
          } else {
            logger.error(`Failed to analyze PBI:`, result.reason);
            // Add a fallback analysis for failed PBIs
            analysisResults.push(this.createFallbackAnalysis(batch[j]));
          }
        }
      }

      // Calculate metadata
      const metadata = this.calculateMetadata(analysisResults, startTime);

      // Create output
      const output: RiskAnalysisOutput = {
        risk_analysis: analysisResults,
        metadata,
      };

      // Save results
      await this.saveResults(output);

      logger.info('Risk analysis completed successfully');
      logger.info(`Total risks identified: ${metadata.critical_risks + metadata.high_risks + metadata.medium_risks + metadata.low_risks}`);
      logger.info(`Critical risks: ${metadata.critical_risks}, High risks: ${metadata.high_risks}`);
      logger.info(`High complexity items: ${metadata.high_complexity_items}`);

      return output;
    } catch (error) {
      logger.error('Risk analysis failed:', error);
      throw error;
    }
  }

  private async loadEnrichedPBIs(): Promise<any> {
    try {
      const data = await fs.readFile(config.inputFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error(`Failed to load enriched PBIs from ${config.inputFilePath}:`, error);
      throw new Error(`Cannot read input file: ${error}`);
    }
  }

  private async analyzeSinglePBI(pbi: EnrichedPBI): Promise<RiskAnalysisResult> {
    logger.info(`Analyzing PBI ${pbi.id}: ${pbi.title}`);

    try {
      // Get AI analysis
      const claudeAnalysis = await this.claudeClient.analyzeRisks(pbi);

      // Transform and organize risks by severity
      const risksBySeverity = this.organizeRisksBySeverity(claudeAnalysis.risks);

      // Create the analysis result
      const result: RiskAnalysisResult = {
        id: pbi.id,
        title: pbi.title,
        risks: risksBySeverity,
        conflicts: claudeAnalysis.conflicts,
        complexity_score: claudeAnalysis.complexity_analysis.score,
        recommended_split: claudeAnalysis.complexity_analysis.recommended_split,
        split_suggestion: claudeAnalysis.complexity_analysis.split_suggestion,
        analysis_confidence: claudeAnalysis.analysis_confidence,
        analyzed_at: new Date().toISOString(),
      };

      logger.info(`Successfully analyzed PBI ${pbi.id} - Complexity: ${result.complexity_score}/10`);
      return result;
    } catch (error) {
      logger.error(`Error analyzing PBI ${pbi.id}:`, error);
      throw error;
    }
  }

  private organizeRisksBySeverity(risks: ClaudeAnalysisResponse['risks']): RiskAnalysisResult['risks'] {
    const organized: RiskAnalysisResult['risks'] = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };

    for (const risk of risks) {
      const transformedRisk: Risk = {
        type: risk.type as any,
        description: risk.description,
        detail: risk.detail,
        action_required: risk.action_required,
        assigned_to: risk.assigned_to,
        confidence: risk.confidence,
        evidence: risk.evidence,
      };

      const severity = risk.severity.toUpperCase() as keyof typeof organized;
      if (organized[severity]) {
        organized[severity].push(transformedRisk);
      } else {
        logger.warn(`Unknown risk severity: ${risk.severity}`);
        organized.MEDIUM.push(transformedRisk);
      }
    }

    return organized;
  }

  private createFallbackAnalysis(pbi: EnrichedPBI): RiskAnalysisResult {
    logger.warn(`Creating fallback analysis for PBI ${pbi.id}`);

    // Create basic risk analysis based on available data
    const risks: RiskAnalysisResult['risks'] = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };

    // Check for existing risk flags
    if (pbi.context_enrichment?.risk_flags) {
      for (const flag of pbi.context_enrichment.risk_flags) {
        const severity = flag.severity.toUpperCase() as keyof typeof risks;
        if (risks[severity]) {
          risks[severity].push({
            type: 'TECHNICAL_COMPLEXITY' as any,
            description: flag.type.replace(/_/g, ' ').toLowerCase(),
            detail: flag.message,
            action_required: 'Review and assess impact',
            assigned_to: 'Team',
            confidence: 0.7,
            evidence: [flag.message],
          });
        }
      }
    }

    // Calculate basic complexity score
    let complexityScore = 5; // Base score

    // Adjust based on readiness
    if (pbi.overall_readiness === 'NOT_READY') {
      complexityScore += 2;
    } else if (pbi.overall_readiness === 'MOSTLY_READY') {
      complexityScore += 1;
    }

    // Adjust based on confidence scores
    const avgConfidence = Object.values(pbi.confidenceScores)
      .reduce((sum, score) => sum + score.score, 0) / 6;
    if (avgConfidence < 70) {
      complexityScore += 1;
    }

    return {
      id: pbi.id,
      title: pbi.title,
      risks,
      conflicts: [],
      complexity_score: Math.min(complexityScore, 10),
      recommended_split: complexityScore > 7,
      split_suggestion: complexityScore > 7 ? 'Consider breaking down into smaller, more focused tasks' : undefined,
      analysis_confidence: 0.5, // Lower confidence for fallback
      analyzed_at: new Date().toISOString(),
    };
  }

  private calculateMetadata(
    results: RiskAnalysisResult[],
    startTime: number
  ): RiskAnalysisOutput['metadata'] {
    let criticalRisks = 0;
    let highRisks = 0;
    let mediumRisks = 0;
    let lowRisks = 0;
    let totalConflicts = 0;
    let highComplexityItems = 0;

    for (const result of results) {
      criticalRisks += result.risks.CRITICAL.length;
      highRisks += result.risks.HIGH.length;
      mediumRisks += result.risks.MEDIUM.length;
      lowRisks += result.risks.LOW.length;
      totalConflicts += result.conflicts.length;

      if (result.complexity_score > 7) {
        highComplexityItems++;
      }
    }

    return {
      analyzed_at: new Date().toISOString(),
      total_analyzed: results.length,
      critical_risks: criticalRisks,
      high_risks: highRisks,
      medium_risks: mediumRisks,
      low_risks: lowRisks,
      total_conflicts: totalConflicts,
      high_complexity_items: highComplexityItems,
      model_used: config.claudeModel,
      analysis_duration_ms: Date.now() - startTime,
    };
  }

  private async saveResults(output: RiskAnalysisOutput): Promise<void> {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(config.outputFilePath);
      await fs.mkdir(outputDir, { recursive: true });

      // Save the results
      await fs.writeFile(
        config.outputFilePath,
        JSON.stringify(output, null, 2),
        'utf-8'
      );

      logger.info(`Results saved to ${config.outputFilePath}`);
    } catch (error) {
      logger.error('Failed to save results:', error);
      throw new Error(`Cannot save output file: ${error}`);
    }
  }
}