/**
 * Application Configuration for POC Step 6
 */

import { AppConfig } from '../types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

export const appConfig: AppConfig = {
  // Claude API Configuration
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',

  // Retry Configuration
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000'),

  // File Paths
  inputFile: path.resolve(
    __dirname,
    '../../../poc-step5/output/risk-analysis.json'
  ),
  outputFile: path.resolve(
    __dirname,
    '../../output/questions-proposals.json'
  ),
  stakeholderRegistryFile: path.resolve(
    __dirname,
    '../../config/stakeholders.yaml'
  ),

  // Logging
  enableDebugLogging: process.env.DEBUG === 'true' || false
};

// Validate required configuration
export function validateConfig(): boolean {
  const errors: string[] = [];

  if (!appConfig.claudeApiKey) {
    errors.push('CLAUDE_API_KEY is not set in environment variables');
  }

  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }

  return true;
}