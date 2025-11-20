import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Claude API Configuration
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10)
  },

  // File Paths
  paths: {
    input: process.env.INPUT_FILE || path.join(__dirname, '../../..', 'poc-step6/output/questions-proposals.json'),
    output: process.env.OUTPUT_FILE || path.join(__dirname, '../../output', 'readiness-assessment.json'),
    definitionOfReady: path.join(__dirname, '../../config', 'definition-of-ready.yaml'),
    logs: path.join(__dirname, '../../logs')
  },

  // Debug Mode
  debug: process.env.DEBUG === 'true',

  // Cost Tracking (Haiku pricing as of Nov 2024)
  pricing: {
    inputTokensPerMillion: 1.00,    // $1.00 per million input tokens
    outputTokensPerMillion: 5.00    // $5.00 per million output tokens
  }
};

export function validateConfig(): void {
  if (!config.claude.apiKey) {
    throw new Error('CLAUDE_API_KEY is not set in environment variables');
  }

  if (config.claude.maxRetries < 1 || config.claude.maxRetries > 5) {
    throw new Error('MAX_RETRIES must be between 1 and 5');
  }

  if (config.claude.retryDelay < 100 || config.claude.retryDelay > 10000) {
    throw new Error('RETRY_DELAY must be between 100 and 10000 ms');
  }
}
