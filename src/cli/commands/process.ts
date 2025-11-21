/**
 * Process Command
 *
 * Main command for processing meeting transcripts through the pipeline
 *
 * Usage:
 *   backlog-chef process <file> [options]
 *   backlog-chef process examples/sample-transcript.txt
 *   backlog-chef process transcript.json --output ./my-output
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { createProviderRegistry, loadRouterConfig } from '../../ai/config';
import { ModelRouter } from '../../ai/router';
import { PipelineOrchestrator } from '../../pipeline';
import { InputParser } from '../../pipeline/input';

export interface ProcessCommandOptions {
  output?: string;       // Output directory
  formats?: string;      // Output formats (comma-separated: devops,obsidian,confluence)
  verbose?: boolean;     // Verbose output
  config?: string;       // Custom config file path
  fireflies?: string;    // Fireflies meeting ID or URL
}

export class ProcessCommand {
  /**
   * Execute the process command
   */
  async execute(filePath: string, options: ProcessCommandOptions): Promise<void> {
    try {
      // 0. Handle Fireflies integration if --fireflies flag is provided
      let actualFilePath = filePath;
      if (options.fireflies) {
        actualFilePath = await this.fetchFromFireflies(options.fireflies, options);
      }

      // 1. Initialize AI providers
      if (options.verbose) {
        console.log('Initializing AI providers...');
      }

      const registry = createProviderRegistry();
      const providers = registry.getAll();

      if (providers.size === 0) {
        throw new Error(
          'No AI providers available. Set at least one API key:\n' +
            '  ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY\n' +
            '  Or ensure Ollama is running locally'
        );
      }

      // 2. Load router configuration
      if (options.verbose) {
        console.log('Loading router configuration...');
      }

      const configPath = options.config || path.join(__dirname, '../../../config/model-config.yaml');
      let config;

      if (fs.existsSync(configPath)) {
        config = loadRouterConfig(configPath);
      } else {
        if (options.verbose) {
          console.warn('No config file found, using defaults');
        }
        const { createDefaultRouterConfig } = await import('../../ai/config/config-loader');
        config = createDefaultRouterConfig();
      }

      // 3. Validate input file
      if (!fs.existsSync(actualFilePath)) {
        throw new Error(`Input file not found: ${actualFilePath}`);
      }

      if (options.verbose) {
        console.log('Creating pipeline orchestrator...');
      }

      // 4. Create router and orchestrator
      const router = new ModelRouter(providers, config);
      const orchestrator = new PipelineOrchestrator(router, {
        inputPath: actualFilePath,
        outputDir: options.output,
        writeStepOutputs: true,
      });

      // 5. Parse input
      if (options.verbose) {
        console.log('Parsing input file...');
      }

      const parser = new InputParser();
      const parsedInput = parser.parse(actualFilePath);

      // Get transcript for processing
      const transcript = InputParser.getTranscriptForProcessing(parsedInput);

      // 6. Parse output formats
      const formats = this.parseFormats(options.formats);

      // 7. Execute pipeline
      await orchestrator.execute(
        {
          transcript,
          metadata: parsedInput.metadata as any,
        },
        {
          output: {
            formats,
            directory: options.output,
          },
        }
      );

      // Success!
      console.log('\n✅ Pipeline execution completed successfully!\n');
    } catch (error) {
      console.error(`\n❌ Pipeline execution failed: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  }

  /**
   * Fetch transcript from Fireflies and save to temp file
   * @returns Path to saved transcript file
   */
  private async fetchFromFireflies(
    meetingIdOrUrl: string,
    options: ProcessCommandOptions
  ): Promise<string> {
    const { FirefliesService } = await import('../../integrations/fireflies');

    if (!process.env.FIREFLIES_API_KEY) {
      throw new Error(
        'FIREFLIES_API_KEY environment variable is required for Fireflies integration.\n' +
          'Get your API key from: https://app.fireflies.ai/integrations/custom/fireflies'
      );
    }

    console.log('📥 Fetching transcript from Fireflies.ai...');

    // Initialize service
    const fireflies = new FirefliesService({
      apiKey: process.env.FIREFLIES_API_KEY,
    });

    // Extract meeting ID from URL if needed
    let meetingId = meetingIdOrUrl;
    if (meetingIdOrUrl.includes('fireflies.ai')) {
      if (options.verbose) {
        console.log(`Extracting meeting ID from URL: ${meetingIdOrUrl}`);
      }
      meetingId = fireflies.extractMeetingId(meetingIdOrUrl);
      console.log(`📋 Meeting ID: ${meetingId}`);
    }

    // Fetch transcript
    if (options.verbose) {
      console.log(`Fetching transcript for meeting: ${meetingId}`);
    }

    const transcript = await fireflies.getRawTranscript(meetingId);

    console.log(`✅ Retrieved transcript: "${transcript.title}"`);
    console.log(`   Duration: ${Math.round(transcript.duration / 60)} minutes`);
    console.log(`   Sentences: ${transcript.sentences?.length || 0}`);
    console.log(`   Participants: ${transcript.participants?.length || 0}`);

    // Create output directory
    const outputDir = options.output || path.join(process.cwd(), 'output', `run-${Date.now()}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save raw transcript to output directory
    const rawFirefliesPath = path.join(outputDir, 'raw-fireflies-transcript.json');
    fs.writeFileSync(rawFirefliesPath, JSON.stringify(transcript, null, 2));

    if (options.verbose) {
      console.log(`💾 Saved raw Fireflies transcript to: ${rawFirefliesPath}`);
    }

    console.log('');
    return rawFirefliesPath;
  }

  /**
   * Parse format string into array
   */
  private parseFormats(formatString?: string): Array<'devops' | 'obsidian' | 'confluence'> | undefined {
    if (!formatString) {
      return undefined;
    }

    const cleaned = formatString.toLowerCase().trim();
    const parts = cleaned.split(',').map(s => s.trim());
    const validFormats: Array<'devops' | 'obsidian' | 'confluence'> = [];

    for (const part of parts) {
      if (part === 'devops' || part === 'obsidian' || part === 'confluence') {
        validFormats.push(part);
      } else if (part !== '') {
        console.warn(`  Warning: Unknown format '${part}' ignored`);
      }
    }

    return validFormats.length > 0 ? validFormats : undefined;
  }

  /**
   * Show help text
   */
  static showHelp(): void {
    console.log(`
backlog-chef process - Process meeting transcripts into Product Backlog Items

USAGE
  $ backlog-chef process <file> [options]
  $ backlog-chef process --fireflies <meeting-id-or-url> [options]

ARGUMENTS
  file              Path to meeting transcript (TXT, JSON, or XML)

FLAGS
  --output <dir>       Output directory (default: auto-detected or 'output')
  --formats <list>     Generate specific formats (devops,obsidian,confluence)
  --config <path>      Path to custom model config file
  --fireflies <id>     Fetch transcript from Fireflies.ai (meeting ID or URL)
  --verbose            Show detailed progress information
  --help               Show this help

EXAMPLES
  # Process a local transcript file
  $ backlog-chef process examples/sample-transcript.txt

  # Process from Fireflies meeting ID
  $ backlog-chef process --fireflies abc123xyz

  # Process from Fireflies URL
  $ backlog-chef process --fireflies https://app.fireflies.ai/view/meeting::abc123

  # Process with custom output directory
  $ backlog-chef process transcript.txt --output ./my-pbis

  # Generate specific output formats
  $ backlog-chef process transcript.txt --formats obsidian,confluence

  # Use custom config file
  $ backlog-chef process transcript.txt --config ./my-config.yaml

  # Verbose mode with Fireflies
  $ backlog-chef process --fireflies abc123 --verbose

DESCRIPTION
  Processes meeting transcripts through the Backlog Chef pipeline:

  1. Event Detection - Identifies meeting type
  2. Extract Candidates - Finds potential PBIs
  3. Score Confidence - Evaluates quality
  4. Enrich Context - Adds similar work, decisions, docs
  5. Check Risks - Identifies dependencies and blockers
  6. Generate Proposals - Creates questions with answers
  7. Readiness Checker - Validates against DoR/DoD
  8. Format Output - Generates multiple formats

  Output includes:
  - Individual PBI JSON files with full context
  - Summary JSON with all PBIs
  - Optional formatted outputs (DevOps, Obsidian, Confluence)
  - HTML preview of results
  - Step-by-step outputs for debugging

SUPPORTED INPUT FORMATS
  - Plain text transcripts (.txt)
  - Fireflies AI JSON exports (.json)
  - Custom JSON format
  - XML transcripts (.xml)
`);
  }
}
