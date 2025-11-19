#!/usr/bin/env node

import { Command } from 'commander';
import { RiskAnalysisOrchestrator } from './services/RiskAnalysisOrchestrator';
import { createModuleLogger } from './utils/logger';
import { config } from './config';
import path from 'path';
import { promises as fs } from 'fs';

const logger = createModuleLogger('CLI');
const program = new Command();

program
  .name('risk-analyzer')
  .description('POC Step 5: AI-powered risk and conflict analysis for enriched PBIs')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze enriched PBIs for risks, conflicts, and complexity')
  .option('-i, --input <path>', 'Path to enriched PBIs JSON file')
  .option('-o, --output <path>', 'Path to output risk analysis JSON file')
  .option('--dry-run', 'Perform analysis without saving results')
  .action(async (options) => {
    try {
      logger.info('Starting Risk Analysis POC - Step 5');
      logger.info(`Configuration:`, {
        model: config.claudeModel,
        inputFile: options.input || config.inputFilePath,
        outputFile: options.output || config.outputFilePath,
        maxConcurrent: config.maxConcurrentAnalyses,
      });

      // Override paths if provided
      if (options.input) {
        (config as any).inputFilePath = path.resolve(process.cwd(), options.input);
      }
      if (options.output) {
        (config as any).outputFilePath = path.resolve(process.cwd(), options.output);
      }

      // Check if input file exists
      try {
        await fs.access(config.inputFilePath);
      } catch (error) {
        logger.error(`Input file not found: ${config.inputFilePath}`);
        logger.info('Please ensure Step 4 has been executed and the enriched PBIs file exists.');
        process.exit(1);
      }

      // Run the analysis
      const orchestrator = new RiskAnalysisOrchestrator();
      const results = await orchestrator.analyzeRisks();

      // Display summary
      console.log('\n========================================');
      console.log('Risk Analysis Summary');
      console.log('========================================');
      console.log(`Total PBIs Analyzed: ${results.metadata.total_analyzed}`);
      console.log(`\nRisk Distribution:`);
      console.log(`  - CRITICAL: ${results.metadata.critical_risks} risks`);
      console.log(`  - HIGH:     ${results.metadata.high_risks} risks`);
      console.log(`  - MEDIUM:   ${results.metadata.medium_risks} risks`);
      console.log(`  - LOW:      ${results.metadata.low_risks} risks`);
      console.log(`\nConflicts Detected: ${results.metadata.total_conflicts}`);
      console.log(`High Complexity Items: ${results.metadata.high_complexity_items}`);
      console.log(`\nAnalysis Duration: ${(results.metadata.analysis_duration_ms / 1000).toFixed(2)}s`);
      console.log(`Model Used: ${results.metadata.model_used}`);

      // Display critical risks
      if (results.metadata.critical_risks > 0) {
        console.log('\n========================================');
        console.log('CRITICAL RISKS REQUIRING IMMEDIATE ATTENTION:');
        console.log('========================================');
        for (const analysis of results.risk_analysis) {
          if (analysis.risks.CRITICAL.length > 0) {
            console.log(`\nPBI ${analysis.id}: ${analysis.title}`);
            for (const risk of analysis.risks.CRITICAL) {
              console.log(`  - [${risk.type}] ${risk.description}`);
              console.log(`    Action: ${risk.action_required} (${risk.assigned_to})`);
            }
          }
        }
      }

      // Display high complexity items
      if (results.metadata.high_complexity_items > 0) {
        console.log('\n========================================');
        console.log('HIGH COMPLEXITY ITEMS (Consider Splitting):');
        console.log('========================================');
        for (const analysis of results.risk_analysis) {
          if (analysis.complexity_score > 7) {
            console.log(`\nPBI ${analysis.id}: ${analysis.title}`);
            console.log(`  Complexity Score: ${analysis.complexity_score}/10`);
            if (analysis.split_suggestion) {
              console.log(`  Suggestion: ${analysis.split_suggestion}`);
            }
          }
        }
      }

      if (!options.dryRun) {
        console.log(`\nResults saved to: ${config.outputFilePath}`);
      }

      logger.info('Risk analysis completed successfully');
    } catch (error) {
      logger.error('Risk analysis failed:', error);
      console.error('\nError:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate input file format without running analysis')
  .option('-i, --input <path>', 'Path to enriched PBIs JSON file')
  .action(async (options) => {
    try {
      const inputPath = options.input
        ? path.resolve(process.cwd(), options.input)
        : config.inputFilePath;

      logger.info(`Validating input file: ${inputPath}`);

      const data = await fs.readFile(inputPath, 'utf-8');
      const parsed = JSON.parse(data);

      if (!parsed.enriched_candidates || !Array.isArray(parsed.enriched_candidates)) {
        throw new Error('Invalid format: missing enriched_candidates array');
      }

      console.log(`\nValidation successful!`);
      console.log(`Found ${parsed.enriched_candidates.length} enriched PBIs`);
      console.log(`\nPBIs in file:`);
      parsed.enriched_candidates.forEach((pbi: any) => {
        console.log(`  - ${pbi.id}: ${pbi.title} (${pbi.overall_readiness})`);
      });
    } catch (error) {
      logger.error('Validation failed:', error);
      console.error('\nValidation failed:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}