/**
 * Formatter types for multi-format output generation
 */

import { PipelineOutput } from '../pipeline/types/pipeline-types';

/**
 * Supported output formats
 */
export type OutputFormat = 'devops' | 'obsidian' | 'confluence' | 'json';

/**
 * Formatter interface - each formatter must implement these methods
 */
export interface Formatter {
  /**
   * Format a single PBI from pipeline output
   */
  formatPBI(pbi: PipelineOutput['pbis'][0], runId: string): string;

  /**
   * Format a summary of all PBIs
   */
  formatSummary(output: PipelineOutput): string;

  /**
   * Get file extension for this format
   */
  getFileExtension(): string;

  /**
   * Get human-readable name of this format
   */
  getName(): string;

  /**
   * Get format identifier
   */
  getFormatId(): OutputFormat;
}

/**
 * Result of formatting a single PBI
 */
export interface FormatResult {
  format: OutputFormat;
  filename: string;
  filepath: string;
  content: string;
  success: boolean;
  error?: string;
}

/**
 * Options for format generation
 */
export interface FormatOptions {
  outputDir: string;
  force?: boolean;  // Overwrite existing files
}
