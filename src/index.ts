/**
 * Backlog Chef - Main Entry Point
 *
 * Production implementation of the Backlog Intelligence system
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { createProviderRegistry, loadRouterConfig } from './ai/config';
import { ModelRouter } from './ai/router';
import { PipelineOrchestrator } from './pipeline';
import { InputParser } from './pipeline/input';

/**
 * Example usage of the Backlog Chef pipeline
 */
async function main() {
  try {
    // 1. Initialize AI providers from environment variables
    console.log('Initializing AI providers...');
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
    console.log('Loading router configuration...');
    const configPath = path.join(__dirname, '../config/model-config.yaml');

    let config;
    if (fs.existsSync(configPath)) {
      config = loadRouterConfig(configPath);
    } else {
      console.warn('No config file found, using defaults');
      const { createDefaultRouterConfig } = await import('./ai/config/config-loader');
      config = createDefaultRouterConfig();
    }

    // 3. Create router and orchestrator
    console.log('Creating pipeline orchestrator...');
    const router = new ModelRouter(providers, config);
    const orchestrator = new PipelineOrchestrator(router);

    // 4. Parse input file (supports TXT, JSON, XML)
    const inputPath = process.argv[2] || path.join(__dirname, '../examples/sample-transcript.txt');

    if (!fs.existsSync(inputPath)) {
      throw new Error(
        `Input file not found: ${inputPath}\n` +
          'Usage: npm start [path/to/input.txt|.json|.xml]'
      );
    }

    console.log('Parsing input file...');
    const parser = new InputParser();
    const parsedInput = parser.parse(inputPath);

    // Print input context summary
    const contextSummary = InputParser.buildContextSummary(parsedInput);
    if (contextSummary) {
      console.log('\nInput Context:');
      console.log(contextSummary);
    }

    // Get transcript for processing (enriched if available)
    const transcript = InputParser.getTranscriptForProcessing(parsedInput);

    // 5. Execute pipeline
    const output = await orchestrator.execute(
      {
        transcript,
        metadata: parsedInput.metadata as any, // Extended metadata from input parsers
      },
      {
        // Pipeline options
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

    // 6. Save output
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `pipeline-output-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`\n✓ Output saved to: ${outputPath}\n`);

    // 7. Print final cost summary
    router.getCostStatistics();
  } catch (error) {
    console.error('\n❌ Pipeline execution failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for programmatic use
export { PipelineOrchestrator } from './pipeline';
export { createProviderRegistry, loadRouterConfig } from './ai/config';
export { ModelRouter } from './ai/router';
export * from './pipeline/types/pipeline-types';
