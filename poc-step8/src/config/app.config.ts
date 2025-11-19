import dotenv from 'dotenv';
import path from 'path';
import { OutputFormat } from '../types';

dotenv.config();

export const config = {
  // File Paths
  paths: {
    input: process.env.INPUT_FILE || path.join(__dirname, '../../..', 'poc-step7/output/readiness-assessment.json'),
    outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../../output'),
    logs: path.join(__dirname, '../../logs')
  },

  // Output Formats
  outputFormats: (process.env.OUTPUT_FORMATS || 'markdown,devops,confluence')
    .split(',')
    .map(f => f.trim()) as OutputFormat[],

  // Debug Mode
  debug: process.env.DEBUG === 'true'
};

export function validateConfig(): void {
  const validFormats: OutputFormat[] = ['markdown', 'devops', 'confluence'];

  for (const format of config.outputFormats) {
    if (!validFormats.includes(format)) {
      throw new Error(`Invalid output format: ${format}. Valid formats: ${validFormats.join(', ')}`);
    }
  }

  if (config.outputFormats.length === 0) {
    throw new Error('At least one output format must be specified');
  }
}
