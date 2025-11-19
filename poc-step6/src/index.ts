#!/usr/bin/env node

/**
 * POC Step 6: Generate Questions + Proposals
 * Main orchestrator that coordinates all services
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  RiskAnalysisInput,
  QuestionsAndProposalsOutput,
  PBIQuestionsAndProposals,
  Question,
  QuestionsByPriority,
  OutputMetadata
} from './types';
import { appConfig, validateConfig } from './config/app.config';
import { logger } from './utils/logger';
import { Validators } from './utils/validators';
import { ClaudeAPIClient } from './services/claude-api-client';
import { QuestionGenerator } from './services/question-generator';
import { StakeholderRouter } from './services/stakeholder-router';
import { ProposalGenerator } from './services/proposal-generator';
import { DocumentationSearchService } from './services/doc-search';

class QuestionProposalOrchestrator {
  private startTime: number = Date.now();
  private claudeClient: ClaudeAPIClient;
  private questionGenerator: QuestionGenerator;
  private stakeholderRouter: StakeholderRouter;
  private proposalGenerator: ProposalGenerator;
  private docSearch: DocumentationSearchService;

  constructor() {
    this.claudeClient = new ClaudeAPIClient();
    this.questionGenerator = new QuestionGenerator();
    this.stakeholderRouter = new StakeholderRouter();
    this.proposalGenerator = new ProposalGenerator();
    this.docSearch = new DocumentationSearchService();
  }

  /**
   * Main execution flow
   */
  async execute(): Promise<void> {
    try {
      logger.section('POC Step 6: Generate Questions + Proposals');
      logger.info('Starting question and proposal generation process...');

      // Validate configuration
      if (!validateConfig()) {
        throw new Error('Configuration validation failed');
      }

      // Test Claude API connection
      const connected = await this.claudeClient.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to Claude API');
      }

      // Load input data
      const riskAnalysis = await this.loadRiskAnalysis();
      logger.info(`Loaded ${riskAnalysis.risk_analysis.length} PBIs for processing`);

      // Load stakeholder registry
      await this.stakeholderRouter.loadRegistry();

      // Process each PBI
      const pbiResults: PBIQuestionsAndProposals[] = [];

      for (let i = 0; i < riskAnalysis.risk_analysis.length; i++) {
        const pbi = riskAnalysis.risk_analysis[i];
        logger.subsection(`Processing PBI ${pbi.id}: ${pbi.title}`);
        logger.progress(i + 1, riskAnalysis.risk_analysis.length, `Processing ${pbi.id}`);

        const result = await this.processPBI(pbi, riskAnalysis);
        pbiResults.push(result);

        // Log summary for this PBI
        const totalQuestions =
          result.unanswered_questions.critical.length +
          result.unanswered_questions.high.length +
          result.unanswered_questions.medium.length +
          result.unanswered_questions.low.length;

        logger.info(`Generated ${totalQuestions} questions for PBI ${pbi.id}`);
        logger.info(`  - Critical: ${result.unanswered_questions.critical.length}`);
        logger.info(`  - High: ${result.unanswered_questions.high.length}`);
        logger.info(`  - Medium: ${result.unanswered_questions.medium.length}`);
        logger.info(`  - Low: ${result.unanswered_questions.low.length}`);
      }

      // Generate output
      const output = this.generateOutput(pbiResults);

      // Save output
      await this.saveOutput(output);

      // Print summary
      this.printSummary(output);

      // Print and save cost summary
      const costTracker = this.claudeClient.getCostTracker();
      costTracker.logCostSummary();

      // Save cost history to CSV file
      await costTracker.saveCostToFile(
        path.dirname(appConfig.outputFile),
        `step6-${new Date().toISOString().split('T')[0]}`
      );

      logger.success('Question and proposal generation completed successfully!');
    } catch (error) {
      logger.error('Failed to generate questions and proposals', error);
      process.exit(1);
    }
  }

  /**
   * Process a single PBI
   */
  private async processPBI(
    pbi: any,
    _fullAnalysis: RiskAnalysisInput
  ): Promise<PBIQuestionsAndProposals> {
    // Step 1: Generate questions
    logger.info('Step 1: Identifying unanswered questions...');
    const questions = await this.questionGenerator.generateQuestions({
      pbi,
      stakeholderRegistry: await this.getRegistry()
    });

    // Step 2: Route to stakeholders
    logger.info('Step 2: Routing questions to stakeholders...');
    const routedQuestions = await this.stakeholderRouter.routeQuestions(questions);

    // Step 3: Generate proposals
    logger.info('Step 3: Generating proposed answers...');
    const questionsWithProposals = await this.proposalGenerator.generateProposals(
      routedQuestions,
      pbi
    );

    // Step 4: Search documentation
    logger.info('Step 4: Searching documentation...');
    const finalQuestions = await this.docSearch.searchForQuestions(questionsWithProposals);

    // Group questions by priority
    const groupedQuestions = this.groupQuestionsByPriority(finalQuestions);

    return {
      pbi_id: pbi.id,
      title: pbi.title,
      unanswered_questions: groupedQuestions
    };
  }

  /**
   * Group questions by priority
   */
  private groupQuestionsByPriority(questions: Question[]): QuestionsByPriority {
    return {
      critical: questions.filter(q => q.priority === 'CRITICAL'),
      high: questions.filter(q => q.priority === 'HIGH'),
      medium: questions.filter(q => q.priority === 'MEDIUM'),
      low: questions.filter(q => q.priority === 'LOW')
    };
  }

  /**
   * Load risk analysis from Step 5
   */
  private async loadRiskAnalysis(): Promise<RiskAnalysisInput> {
    logger.info('Loading risk analysis from Step 5...');

    try {
      const fileContent = await fs.readFile(appConfig.inputFile, 'utf-8');
      const parsed = JSON.parse(fileContent);
      return Validators.validateRiskAnalysisInput(parsed);
    } catch (error) {
      logger.error('Failed to load risk analysis', error);
      throw new Error(`Failed to load risk analysis: ${error}`);
    }
  }

  /**
   * Get stakeholder registry
   */
  private async getRegistry(): Promise<any> {
    // This is a simplified version - in production would properly type this
    const fileContent = await fs.readFile(appConfig.stakeholderRegistryFile, 'utf-8');
    const yaml = await import('js-yaml');
    return yaml.load(fileContent);
  }

  /**
   * Generate output structure
   */
  private generateOutput(pbiResults: PBIQuestionsAndProposals[]): QuestionsAndProposalsOutput {
    // Calculate statistics
    let totalQuestions = 0;
    let criticalQuestions = 0;
    let highQuestions = 0;
    let mediumQuestions = 0;
    let lowQuestions = 0;
    const stakeholdersSet = new Set<string>();

    pbiResults.forEach(pbi => {
      const questions = [
        ...pbi.unanswered_questions.critical,
        ...pbi.unanswered_questions.high,
        ...pbi.unanswered_questions.medium,
        ...pbi.unanswered_questions.low
      ];

      totalQuestions += questions.length;
      criticalQuestions += pbi.unanswered_questions.critical.length;
      highQuestions += pbi.unanswered_questions.high.length;
      mediumQuestions += pbi.unanswered_questions.medium.length;
      lowQuestions += pbi.unanswered_questions.low.length;

      questions.forEach(q => {
        q.stakeholders.forEach(s => stakeholdersSet.add(s.email));
      });
    });

    // Get cost breakdown
    const costBreakdown = this.claudeClient.getCostTracker().getCostBreakdown();

    const metadata: OutputMetadata = {
      generated_at: new Date().toISOString(),
      total_pbis: pbiResults.length,
      total_questions: totalQuestions,
      critical_questions: criticalQuestions,
      high_questions: highQuestions,
      medium_questions: mediumQuestions,
      low_questions: lowQuestions,
      stakeholders_identified: Array.from(stakeholdersSet),
      model_used: appConfig.claudeModel,
      generation_duration_ms: Date.now() - this.startTime,
      api_usage: {
        total_api_calls: costBreakdown.api_calls,
        total_input_tokens: costBreakdown.total_input_tokens,
        total_output_tokens: costBreakdown.total_output_tokens,
        total_tokens: costBreakdown.total_tokens,
        estimated_cost_usd: costBreakdown.total_cost_usd
      }
    };

    return {
      questions_and_proposals: pbiResults,
      metadata
    };
  }

  /**
   * Save output to file
   */
  private async saveOutput(output: QuestionsAndProposalsOutput): Promise<void> {
    logger.info('Saving output...');

    try {
      // Ensure output directory exists
      const outputDir = path.dirname(appConfig.outputFile);
      await fs.mkdir(outputDir, { recursive: true });

      // Write output file
      await fs.writeFile(
        appConfig.outputFile,
        JSON.stringify(output, null, 2),
        'utf-8'
      );

      logger.success(`Output saved to: ${appConfig.outputFile}`);
    } catch (error) {
      logger.error('Failed to save output', error);
      throw error;
    }
  }

  /**
   * Print summary to console
   */
  private printSummary(output: QuestionsAndProposalsOutput): void {
    logger.section('Generation Summary');

    // Overall statistics
    logger.info('Overall Statistics:');
    logger.table(
      ['Metric', 'Value'],
      [
        ['Total PBIs Processed', output.metadata.total_pbis.toString()],
        ['Total Questions Generated', output.metadata.total_questions.toString()],
        ['Critical Questions', output.metadata.critical_questions.toString()],
        ['High Priority Questions', output.metadata.high_questions.toString()],
        ['Medium Priority Questions', output.metadata.medium_questions.toString()],
        ['Low Priority Questions', output.metadata.low_questions.toString()],
        ['Unique Stakeholders', output.metadata.stakeholders_identified.length.toString()],
        ['Processing Time', `${(output.metadata.generation_duration_ms / 1000).toFixed(2)}s`]
      ]
    );

    // Per-PBI summary
    logger.info('\nPer-PBI Summary:');
    const pbiRows = output.questions_and_proposals.map(pbi => {
      const total =
        pbi.unanswered_questions.critical.length +
        pbi.unanswered_questions.high.length +
        pbi.unanswered_questions.medium.length +
        pbi.unanswered_questions.low.length;

      return [
        pbi.pbi_id,
        pbi.title.substring(0, 30),
        total.toString(),
        pbi.unanswered_questions.critical.length.toString(),
        pbi.unanswered_questions.high.length.toString()
      ];
    });

    logger.table(
      ['PBI ID', 'Title', 'Total Q', 'Critical', 'High'],
      pbiRows
    );

    // Sample critical questions
    if (output.metadata.critical_questions > 0) {
      logger.info('\nSample Critical Questions:');
      output.questions_and_proposals.forEach(pbi => {
        pbi.unanswered_questions.critical.slice(0, 2).forEach(q => {
          logger.info(`  [${pbi.pbi_id}] ${q.question}`);
          logger.info(`    → Stakeholder: ${q.stakeholders[0]?.name || 'Unassigned'}`);
          logger.info(`    → Confidence: ${q.proposed_answer.confidence}`);
        });
      });
    }

    // Documentation coverage
    let docsFound = 0;
    let totalSearches = 0;
    output.questions_and_proposals.forEach(pbi => {
      const allQuestions = [
        ...pbi.unanswered_questions.critical,
        ...pbi.unanswered_questions.high,
        ...pbi.unanswered_questions.medium,
        ...pbi.unanswered_questions.low
      ];
      totalSearches += allQuestions.length;
      docsFound += allQuestions.filter(q => q.documentation_search.found).length;
    });

    if (totalSearches > 0) {
      const docCoverage = Math.round((docsFound / totalSearches) * 100);
      logger.info(`\nDocumentation Coverage: ${docCoverage}% (${docsFound}/${totalSearches} questions)`);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const orchestrator = new QuestionProposalOrchestrator();
  orchestrator.execute().catch(error => {
    logger.error('Unhandled error', error);
    process.exit(1);
  });
}

export default QuestionProposalOrchestrator;