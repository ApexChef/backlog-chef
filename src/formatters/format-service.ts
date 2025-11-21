/**
 * Format Service
 *
 * Handles multi-format output generation and format regeneration
 */

import * as fs from 'fs';
import * as path from 'path';
import { Formatter, OutputFormat, FormatResult, FormatOptions } from './types';
import { PipelineOutput } from '../pipeline/types/pipeline-types';
import { TemplateBasedFormatter } from './template-based-formatter';

export class FormatService {
  private formatters: Map<OutputFormat, Formatter>;

  constructor() {
    this.formatters = new Map();
    // Use template-based formatters for all formats
    this.registerFormatter(new TemplateBasedFormatter('obsidian'));
    this.registerFormatter(new TemplateBasedFormatter('devops'));
    this.registerFormatter(new TemplateBasedFormatter('confluence'));
  }

  /**
   * Register a formatter
   */
  private registerFormatter(formatter: Formatter): void {
    this.formatters.set(formatter.getFormatId(), formatter);
  }

  /**
   * Get a formatter by format ID
   */
  getFormatter(format: OutputFormat): Formatter | undefined {
    return this.formatters.get(format);
  }

  /**
   * Get all registered formatters
   */
  getAllFormatters(): Formatter[] {
    return Array.from(this.formatters.values());
  }

  /**
   * Generate multiple formats for pipeline output
   *
   * @param output - Pipeline output with all PBIs
   * @param formats - Array of format IDs to generate ('all' for all formats)
   * @param options - Output options (directory, force, etc.)
   * @returns Array of format results
   */
  async generateFormats(
    output: PipelineOutput,
    formats: OutputFormat[] | 'all',
    options: FormatOptions
  ): Promise<FormatResult[]> {
    const results: FormatResult[] = [];

    // Resolve 'all' to actual format array
    const targetFormats = formats === 'all'
      ? Array.from(this.formatters.keys())
      : formats;

    // Extract runId from metadata (use timestamp as fallback)
    const runId = output.metadata.processed_at.replace(/[:.]/g, '-').substring(0, 19);

    // Ensure output directory exists
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    for (const format of targetFormats) {
      const formatter = this.formatters.get(format);

      if (!formatter) {
        results.push({
          format,
          filename: '',
          filepath: '',
          content: '',
          success: false,
          error: `No formatter found for format: ${format}`,
        });
        continue;
      }

      // Generate summary file
      const summaryResult = await this.generateSummaryFile(
        output,
        formatter,
        runId,
        options
      );
      results.push(summaryResult);

      // Generate individual PBI files
      for (const pbi of output.pbis) {
        const pbiResult = await this.generatePBIFile(
          pbi,
          formatter,
          runId,
          options
        );
        results.push(pbiResult);
      }
    }

    return results;
  }

  /**
   * Regenerate format from existing JSON file
   *
   * @param jsonPath - Path to PipelineOutput JSON file
   * @param formats - Array of format IDs or 'all'
   * @param options - Output options
   * @returns Array of format results
   */
  async regenerateFromJSON(
    jsonPath: string,
    formats: OutputFormat[] | 'all',
    options: FormatOptions
  ): Promise<FormatResult[]> {
    // Read and parse JSON file
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    let output: PipelineOutput;

    try {
      output = JSON.parse(jsonContent);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Validate JSON structure
    if (!output.pbis || !Array.isArray(output.pbis)) {
      throw new Error('Invalid PipelineOutput structure: missing pbis array');
    }

    // Use same output directory as JSON if not specified
    if (!options.outputDir) {
      options.outputDir = path.dirname(jsonPath);
    }

    // Generate formats
    return this.generateFormats(output, formats, options);
  }

  /**
   * Generate summary file for a format
   */
  private async generateSummaryFile(
    output: PipelineOutput,
    formatter: Formatter,
    runId: string,
    options: FormatOptions
  ): Promise<FormatResult> {
    try {
      const content = formatter.formatSummary(output);
      const filename = `summary${formatter.getFileExtension()}`;
      const filepath = path.join(options.outputDir, filename);

      // Check if file exists and force flag
      if (fs.existsSync(filepath) && !options.force) {
        return {
          format: formatter.getFormatId(),
          filename,
          filepath,
          content: '',
          success: false,
          error: 'File already exists (use --force to overwrite)',
        };
      }

      // Write file
      fs.writeFileSync(filepath, content, 'utf-8');

      return {
        format: formatter.getFormatId(),
        filename,
        filepath,
        content,
        success: true,
      };
    } catch (error) {
      return {
        format: formatter.getFormatId(),
        filename: `summary${formatter.getFileExtension()}`,
        filepath: path.join(options.outputDir, `summary${formatter.getFileExtension()}`),
        content: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate PBI file for a format
   */
  private async generatePBIFile(
    pbi: PipelineOutput['pbis'][0],
    formatter: Formatter,
    runId: string,
    options: FormatOptions
  ): Promise<FormatResult> {
    try {
      const content = formatter.formatPBI(pbi, runId);

      // File naming: pbi-{id}.{format}.{ext}
      // For example: PBI-001.obsidian.md, PBI-001.devops.json, PBI-001.confluence.md
      const formatId = formatter.getFormatId();
      const extension = formatter.getFileExtension();

      // Remove leading dot from extension if present
      const ext = extension.startsWith('.') ? extension.substring(1) : extension;

      const filename = `${pbi.pbi.id}.${formatId}.${ext}`;
      const filepath = path.join(options.outputDir, filename);

      // Check if file exists and force flag
      if (fs.existsSync(filepath) && !options.force) {
        return {
          format: formatter.getFormatId(),
          filename,
          filepath,
          content: '',
          success: false,
          error: 'File already exists (use --force to overwrite)',
        };
      }

      // Write file
      fs.writeFileSync(filepath, content, 'utf-8');

      return {
        format: formatter.getFormatId(),
        filename,
        filepath,
        content,
        success: true,
      };
    } catch (error) {
      const formatId = formatter.getFormatId();
      const extension = formatter.getFileExtension();
      const ext = extension.startsWith('.') ? extension.substring(1) : extension;
      const filename = `${pbi.pbi.id}.${formatId}.${ext}`;

      return {
        format: formatter.getFormatId(),
        filename,
        filepath: path.join(options.outputDir, filename),
        content: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get file naming pattern for a format
   */
  getFilePattern(format: OutputFormat): string {
    const formatter = this.formatters.get(format);
    if (!formatter) {
      throw new Error(`Unknown format: ${format}`);
    }

    const extension = formatter.getFileExtension();
    const ext = extension.startsWith('.') ? extension.substring(1) : extension;

    return `PBI-*.${format}.${ext}`;
  }
}
