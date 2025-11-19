import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  anthropicApiKey: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  maxConcurrentAnalyses: z.number().min(1).max(10).default(5),
  analysisTimeoutMs: z.number().min(1000).max(60000).default(30000),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  logFile: z.string().default('poc-step5.log'),
  inputFilePath: z.string().default('../poc-step4/output/enriched-pbis.json'),
  outputFilePath: z.string().default('./output/risk-analysis.json'),
  claudeModel: z.string().default('claude-3-5-haiku-20241022'),
  claudeMaxTokens: z.number().min(100).max(8192).default(4096),
  claudeTemperature: z.number().min(0).max(1).default(0.3),
});

export type Config = z.infer<typeof configSchema>;

// Parse and validate configuration
function loadConfig(): Config {
  try {
    const config = configSchema.parse({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      maxConcurrentAnalyses: process.env.MAX_CONCURRENT_ANALYSES
        ? parseInt(process.env.MAX_CONCURRENT_ANALYSES, 10)
        : 5,
      analysisTimeoutMs: process.env.ANALYSIS_TIMEOUT_MS
        ? parseInt(process.env.ANALYSIS_TIMEOUT_MS, 10)
        : 30000,
      logLevel: process.env.LOG_LEVEL || 'info',
      logFile: process.env.LOG_FILE || 'poc-step5.log',
      inputFilePath: process.env.INPUT_FILE_PATH || '../poc-step4/output/enriched-pbis.json',
      outputFilePath: process.env.OUTPUT_FILE_PATH || './output/risk-analysis.json',
      claudeModel: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',
      claudeMaxTokens: process.env.CLAUDE_MAX_TOKENS
        ? parseInt(process.env.CLAUDE_MAX_TOKENS, 10)
        : 4096,
      claudeTemperature: process.env.CLAUDE_TEMPERATURE
        ? parseFloat(process.env.CLAUDE_TEMPERATURE)
        : 0.3,
    });

    // Resolve file paths
    config.inputFilePath = path.resolve(process.cwd(), config.inputFilePath);
    config.outputFilePath = path.resolve(process.cwd(), config.outputFilePath);

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation error:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();