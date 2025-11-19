#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';

import { ClaudeClient } from './api/ClaudeClient';
import { PBIExtractor } from './extractor/PBIExtractor';
import { FileHandler } from './utils/FileHandler';
import { logger } from './utils/Logger';

// Load environment variables
dotenv.config();

// Configure CLI
const program = new Command();

program
  .name('backlog-chef-poc')
  .description('Extract Product Backlog Items from meeting transcripts')
  .version('1.0.0')
  .option(
    '-i, --input <path>',
    'path to transcript file',
    '../docs/poc/transcript.md'
  )
  .option(
    '-s, --summary <path>',
    'path to optional summary file',
    '../docs/poc/transcript-summary.md'
  )
  .option(
    '-o, --output <path>',
    'path to output JSON file',
    './output/extracted-pbis.json'
  )
  .option(
    '--no-summary',
    'skip loading the summary file'
  )
  .option(
    '-v, --verbose',
    'enable verbose logging'
  )
  .option(
    '--analyze',
    'show extraction quality analysis'
  );

program.parse(process.argv);

const options = program.opts();

// Set log level
if (options.verbose) {
  process.env.LOG_LEVEL = 'debug';
}

async function main() {
  console.log(chalk.cyan.bold('\n🍳 Backlog Chef POC - PBI Extraction\n'));

  // Validate API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.error('ANTHROPIC_API_KEY environment variable is not set');
    console.log(chalk.yellow('\nPlease set your Anthropic API key:'));
    console.log(chalk.gray('  1. Copy .env.example to .env'));
    console.log(chalk.gray('  2. Add your API key to the .env file\n'));
    process.exit(1);
  }

  try {
    // Initialize Claude client
    const spinner = ora('Initializing Claude API client...').start();
    const claudeClient = new ClaudeClient(apiKey);

    // Validate API key
    const isValid = await claudeClient.validateApiKey();
    if (!isValid) {
      spinner.fail('Invalid API key');
      process.exit(1);
    }
    spinner.succeed('Claude API client initialized');

    // Read transcript
    spinner.start('Reading transcript file...');
    const transcriptPath = path.resolve(options.input);
    const transcript = await FileHandler.readFile(transcriptPath);
    spinner.succeed(`Transcript loaded (${transcript.length} characters)`);

    // Read summary if provided
    let summary: string | undefined;
    if (options.summary !== false) {
      try {
        spinner.start('Reading summary file...');
        const summaryPath = path.resolve(options.summary);
        if (await FileHandler.exists(summaryPath)) {
          summary = await FileHandler.readFile(summaryPath);
          spinner.succeed(`Summary loaded (${summary.length} characters)`);
        } else {
          spinner.info('Summary file not found, proceeding without it');
        }
      } catch (error) {
        spinner.warn(`Could not read summary: ${(error as Error).message}`);
      }
    }

    // Extract PBIs
    spinner.start('Extracting PBIs from transcript...');
    const extractor = new PBIExtractor(claudeClient);
    const result = await extractor.extract(transcript, summary);
    spinner.succeed(`Extracted ${result.candidates.length} PBI candidates`);

    // Display extracted PBIs
    console.log(chalk.cyan('\n📋 Extracted PBIs:\n'));
    result.candidates.forEach((pbi, index) => {
      console.log(chalk.bold(`${index + 1}. ${pbi.title}`));
      console.log(chalk.gray(`   ID: ${pbi.id}`));
      console.log(chalk.gray(`   Description: ${pbi.description.substring(0, 100)}...`));
      if (pbi.phase) {
        console.log(chalk.yellow(`   Phase: ${pbi.phase}`));
      }
      if (pbi.status) {
        console.log(chalk.yellow(`   Status: ${pbi.status}`));
      }
      console.log();
    });

    // Show analysis if requested
    if (options.analyze) {
      console.log(chalk.cyan('📊 Extraction Analysis:\n'));
      const analysis = extractor.analyzeExtractionQuality(result);

      console.log(chalk.gray('Quality Metrics:'));
      console.log(`  • Total PBIs: ${analysis.totalPBIs}`);
      console.log(`  • With acceptance criteria: ${analysis.withAcceptanceCriteria}`);
      console.log(`  • With technical notes: ${analysis.withTechnicalNotes}`);
      console.log(`  • With dependencies: ${analysis.withDependencies}`);
      console.log(`  • With defined scope: ${analysis.withScope}`);

      if (Object.keys(analysis.byPhase).length > 0) {
        console.log(chalk.gray('\nBy Phase:'));
        Object.entries(analysis.byPhase).forEach(([phase, count]) => {
          console.log(`  • ${phase}: ${count}`);
        });
      }

      if (Object.keys(analysis.byStatus).length > 0) {
        console.log(chalk.gray('\nBy Status:'));
        Object.entries(analysis.byStatus).forEach(([status, count]) => {
          console.log(`  • ${status}: ${count}`);
        });
      }
      console.log();
    }

    // Save to file
    spinner.start('Saving results to JSON file...');
    const outputPath = path.resolve(options.output);
    await FileHandler.writeJson(outputPath, result);
    spinner.succeed(`Results saved to ${outputPath}`);

    console.log(chalk.green.bold('\n✨ Extraction completed successfully!\n'));

  } catch (error) {
    logger.error('Extraction failed', error as Error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unexpected error', error);
  process.exit(1);
});