#!/usr/bin/env node

/**
 * CLI entry point for PBI Confidence Scoring (Step 3)
 */

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ScoreOrchestrator } from './orchestrator';

// Load environment variables
dotenv.config();

// Create CLI program
const program = new Command();

program
  .name('score-pbis')
  .description('Score PBI candidates for quality and readiness (Step 3 of processing pipeline)')
  .version('1.0.0')
  .option(
    '-i, --input <path>',
    'Path to extracted PBIs JSON file',
    '../poc/output/extracted-pbis.json'
  )
  .option('-o, --output <path>', 'Path to output scored PBIs JSON file', './output/scored-pbis.json')
  .option('-k, --api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY env var)')
  .option(
    '-m, --model <model>',
    'Claude model to use',
    process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022'
  )
  .option('-d, --debug', 'Enable debug logging')
  .action(async (options) => {
    try {
      // Get API key
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('❌ Error: Anthropic API key is required');
        console.error('   Set ANTHROPIC_API_KEY environment variable or use --api-key option');
        process.exit(1);
      }

      // Enable debug if requested
      if (options.debug) {
        process.env.DEBUG = 'true';
      }

      // Resolve paths
      const inputPath = path.resolve(options.input);
      const outputPath = path.resolve(options.output);

      // Create and run orchestrator
      const orchestrator = new ScoreOrchestrator(apiKey, options.model);
      await orchestrator.execute(inputPath, outputPath);
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);