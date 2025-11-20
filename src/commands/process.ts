/**
 * Backlog Chef - Process Command
 *
 * OCLIF command to process meeting transcripts into Product Backlog Items
 */

import { Command, Flags, Args } from '@oclif/core';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createProviderRegistry, loadRouterConfig } from '../ai/config';
import { ModelRouter } from '../ai/router';
import { PipelineOrchestrator } from '../pipeline';
import { InputParser } from '../pipeline/input';

// Load environment variables
dotenv.config();

export default class Process extends Command {
  static description = 'Process a meeting transcript into Product Backlog Items (PBIs)';

  static examples = [
    '<%= config.bin %> <%= command.id %> meeting.txt',
    '<%= config.bin %> <%= command.id %> transcript.json',
    '<%= config.bin %> <%= command.id %> meeting.xml --format obsidian',
    '<%= config.bin %> <%= command.id %> meeting.txt --output ./my-output --verbose',
  ];

  static args = {
    file: Args.string({
      description: 'Path to the meeting transcript file (TXT, JSON, or XML)',
      required: true,
    }),
  };

  static flags = {
    format: Flags.string({
      char: 'f',
      description: 'Output format (devops, obsidian, confluence)',
      options: ['devops', 'obsidian', 'confluence'],
      default: 'devops',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Custom output directory (defaults to ./output)',
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Enable verbose logging for debugging',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Process);

    // Set verbose logging
    if (flags.verbose) {
      process.env.DEBUG = 'true';
      this.log('Verbose mode enabled\n');
    }

    try {
      // 1. Validate input file
      const inputPath = path.resolve(args.file);
      if (!fs.existsSync(inputPath)) {
        this.error(
          `Input file not found: ${inputPath}\n` +
            'Please provide a valid path to a TXT, JSON, or XML transcript file.',
          { exit: 1 }
        );
      }

      if (flags.verbose) {
        this.log(`Input file: ${inputPath}`);
        this.log(`Output format: ${flags.format}`);
        if (flags.output) {
          this.log(`Output directory: ${flags.output}`);
        }
        this.log('');
      }

      // 2. Initialize AI providers
      this.log('Initializing AI providers...');
      const registry = createProviderRegistry();
      const providers = registry.getAll();

      if (providers.size === 0) {
        this.error(
          'No AI providers available. Set at least one API key:\n' +
            '  ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY\n' +
            '  Or ensure Ollama is running locally',
          { exit: 1 }
        );
      }

      if (flags.verbose) {
        this.log(`Available providers: ${Array.from(providers.keys()).join(', ')}`);
      }

      // 3. Load router configuration
      this.log('Loading router configuration...');
      const configPath = path.join(__dirname, '../../config/model-config.yaml');

      let config;
      if (fs.existsSync(configPath)) {
        config = loadRouterConfig(configPath);
      } else {
        if (flags.verbose) {
          this.log('No config file found, using defaults');
        }
        const { createDefaultRouterConfig } = await import('../ai/config/config-loader');
        config = createDefaultRouterConfig();
      }

      // 4. Create router and orchestrator
      this.log('Creating pipeline orchestrator...');
      const router = new ModelRouter(providers, config);
      const orchestrator = new PipelineOrchestrator(router, { inputPath });

      // 5. Parse input file
      this.log('Parsing input file...');
      const parser = new InputParser();
      const parsedInput = parser.parse(inputPath);

      // Print input context summary
      const contextSummary = InputParser.buildContextSummary(parsedInput);
      if (contextSummary) {
        this.log('\nInput Context:');
        this.log(contextSummary);
      }

      // Get transcript for processing
      const transcript = InputParser.getTranscriptForProcessing(parsedInput);

      // 6. Execute pipeline
      this.log('\nExecuting 8-step pipeline...');
      const output = await orchestrator.execute(
        {
          transcript,
          metadata: parsedInput.metadata as any,
        },
        {
          ai: {
            temperature: 0.7,
            maxTokens: 4096,
          },
          costLimits: {
            per_run_limit_usd: 1.0,
            alert_threshold_usd: 0.5,
          },
        }
      );

      // 7. Determine output directory
      const outputDir = flags.output
        ? path.resolve(flags.output)
        : path.join(process.cwd(), 'output');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 8. Save output file
      const timestamp = Date.now();
      const outputFileName = `pipeline-output-${timestamp}.json`;
      const outputPath = path.join(outputDir, outputFileName);

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

      this.log(`\n✓ Pipeline completed successfully!`);
      this.log(`✓ Output saved to: ${outputPath}\n`);

      // 9. Print cost summary
      if (flags.verbose) {
        this.log('Cost Statistics:');
        router.getCostStatistics();
      }
    } catch (error) {
      this.error(`Pipeline execution failed: ${(error as Error).message}`, { exit: 1 });
    }
  }
}
