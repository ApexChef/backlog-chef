import * as dotenv from 'dotenv';
import { Config } from './types';
import * as path from 'path';

// Load environment variables
dotenv.config();

export function getConfig(): Config {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required. Please set it in your .env file.');
  }

  return {
    claudeApiKey: apiKey,
    claudeModel: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',
    inputPath: process.env.INPUT_PATH || path.join(__dirname, '../../poc-step3/output/scored-pbis.json'),
    outputPath: process.env.OUTPUT_PATH || path.join(__dirname, '../output/enriched-pbis.json'),
    searchSettings: {
      maxResults: 5,
      similarityThreshold: 0.5
    },
    mockDataSettings: {
      useMockData: true // Always true for POC
    }
  };
}