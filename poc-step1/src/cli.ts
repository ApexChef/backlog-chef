#!/usr/bin/env node

/**
 * CLI interface for Event Detection system
 */

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { DetectionOrchestrator } from './DetectionOrchestrator';
import { InputParser } from './utils/InputParser';
import { DetectorConfig } from './types';
import { Logger } from './utils/Logger';

// Load environment variables
dotenv.config();

const program = new Command();
const logger = new Logger('CLI');

program
  .name('backlog-chef-detector')
  .description('Event Detection and Pipeline Router for Backlog Chef')
  .version('1.0.0');

program
  .command('detect')
  .description('Detect meeting type from transcript and route to appropriate pipeline')
  .requiredOption('-t, --transcript <path>', 'Path to transcript file')
  .requiredOption('-s, --summary <path>', 'Path to summary file')
  .option('-o, --output <format>', 'Output format (json, yaml, text)', 'json')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('--confidence-threshold <number>', 'Confidence threshold for detection', '0.7')
  .option('--max-transcript-length <number>', 'Maximum transcript length for LLM', '2000')
  .option('--enable-llm', 'Enable LLM-based detection (requires API key)', false)
  .option('--output-file <path>', 'Save output to file')
  .action(async (options) => {
    try {
      // Set log level based on verbose flag
      if (options.verbose) {
        process.env.LOG_LEVEL = 'DEBUG';
      }

      logger.info('Starting event detection');

      // Validate input files
      if (!fs.existsSync(options.transcript)) {
        throw new Error(`Transcript file not found: ${options.transcript}`);
      }
      if (!fs.existsSync(options.summary)) {
        throw new Error(`Summary file not found: ${options.summary}`);
      }

      // Parse configuration
      const config: DetectorConfig = {
        confidenceThreshold: parseFloat(options.confidenceThreshold),
        maxTranscriptLength: parseInt(options.maxTranscriptLength),
        enableLLM: options.enableLlm
      };

      // Initialize components
      const parser = new InputParser();
      const orchestrator = new DetectionOrchestrator(
        config,
        process.env.ANTHROPIC_API_KEY
      );

      // Parse inputs
      logger.info('Parsing input files');
      const transcript = parser.parseTranscript(options.transcript);
      const summary = parser.parseSummary(options.summary);

      // Run detection
      logger.info('Running detection');
      const result = await orchestrator.detect(transcript, summary);

      // Format output
      let output: string;
      switch (options.output) {
        case 'yaml':
          const yaml = await import('js-yaml');
          output = yaml.dump(result, { indent: 2 });
          break;
        case 'text':
          output = formatTextOutput(result);
          break;
        case 'json':
        default:
          output = JSON.stringify(result, null, 2);
      }

      // Output results
      if (options.outputFile) {
        fs.writeFileSync(options.outputFile, output);
        logger.info(`Results saved to ${options.outputFile}`);
      } else {
        console.log(output);
      }

      // Exit with appropriate code
      process.exit(result.eventType === 'unknown' ? 1 : 0);
    } catch (error) {
      logger.error('Detection failed', error);
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Run detection on sample data')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (options) => {
    try {
      if (options.verbose) {
        process.env.LOG_LEVEL = 'DEBUG';
      }

      logger.info('Running test with sample data');

      const transcriptPath = path.join(
        path.dirname(path.dirname(__dirname)),
        'docs',
        'poc',
        'transcript.md'
      );
      const summaryPath = path.join(
        path.dirname(path.dirname(__dirname)),
        'docs',
        'poc',
        'transcript-summary.md'
      );

      if (!fs.existsSync(transcriptPath) || !fs.existsSync(summaryPath)) {
        throw new Error('Sample data not found. Please ensure transcript.md and transcript-summary.md exist in docs/poc/');
      }

      const config: DetectorConfig = {
        confidenceThreshold: 0.7,
        maxTranscriptLength: 2000,
        enableLLM: false
      };

      const parser = new InputParser();
      const orchestrator = new DetectionOrchestrator(config);

      const transcript = parser.parseTranscript(transcriptPath);
      const summary = parser.parseSummary(summaryPath);

      const result = await orchestrator.detect(transcript, summary);

      console.log('\n=== Test Results ===\n');
      console.log(formatTextOutput(result));
      console.log('\n===================\n');

      process.exit(0);
    } catch (error) {
      logger.error('Test failed', error);
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Helper function to format text output
function formatTextOutput(result: any): string {
  const lines: string[] = [
    '=== Detection Result ===',
    `Event Type: ${result.eventType}`,
    `Confidence: ${(result.confidence * 100).toFixed(1)}%`,
    `Detection Method: ${result.detectionMethod}`,
    `Processing Time: ${result.processingTimeMs}ms`,
    '',
    'Reasoning:',
    result.reasoning,
    ''
  ];

  if (result.matchedKeywords && result.matchedKeywords.length > 0) {
    lines.push('Matched Keywords:');
    result.matchedKeywords.forEach((kw: string) => lines.push(`  - ${kw}`));
    lines.push('');
  }

  if (result.pipelineConfig) {
    lines.push('Pipeline Configuration:');
    lines.push(`  Name: ${result.pipelineConfig.pipelineName}`);
    lines.push(`  Version: ${result.pipelineConfig.version}`);
    lines.push(`  Steps:`);
    result.pipelineConfig.steps.forEach((step: any) => {
      lines.push(`    - ${step.name}`);
    });
  }

  return lines.join('\n');
}

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}