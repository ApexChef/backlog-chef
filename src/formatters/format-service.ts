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

export interface FormatSpec {
  format: OutputFormat;
  variant?: string;
}

export class FormatService {
  private formatters: Map<string, Formatter>; // Key: "format" or "format:variant"

  constructor() {
    this.formatters = new Map();
    // Use template-based formatters for all formats (default variants)
    this.registerFormatter(new TemplateBasedFormatter('obsidian'));
    this.registerFormatter(new TemplateBasedFormatter('devops'));
    this.registerFormatter(new TemplateBasedFormatter('confluence'));
    this.registerFormatter(new TemplateBasedFormatter('json'));
  }

  /**
   * Register a formatter
   */
  private registerFormatter(formatter: Formatter, variant?: string): void {
    const key = variant ? `${formatter.getFormatId()}:${variant}` : formatter.getFormatId();
    this.formatters.set(key, formatter);
  }

  /**
   * Get a formatter by format ID and optional variant
   */
  getFormatter(format: OutputFormat, variant?: string): Formatter {
    // Try specific variant first
    if (variant) {
      const key = `${format}:${variant}`;
      let formatter = this.formatters.get(key);
      if (formatter) {
        return formatter;
      }

      // If variant not found, create it dynamically
      formatter = new TemplateBasedFormatter(format, variant);
      this.formatters.set(key, formatter);
      return formatter;
    }

    // Return default formatter for format
    let formatter = this.formatters.get(format);
    if (!formatter) {
      // Create dynamically if needed
      formatter = new TemplateBasedFormatter(format);
      this.formatters.set(format, formatter);
    }
    return formatter;
  }

  /**
   * Get all registered formatters
   */
  getAllFormatters(): Formatter[] {
    return Array.from(this.formatters.values());
  }

  /**
   * Parse format specification string (supports "format" or "format:variant")
   */
  static parseFormatSpec(spec: string): FormatSpec {
    const parts = spec.split(':');
    const format = parts[0] as OutputFormat;
    const variant = parts[1];
    return { format, variant };
  }

  /**
   * Generate multiple formats for pipeline output
   *
   * @param output - Pipeline output with all PBIs
   * @param formats - Array of format IDs or FormatSpecs to generate ('all' for all formats)
   * @param options - Output options (directory, force, etc.)
   * @returns Array of format results
   */
  async generateFormats(
    output: PipelineOutput,
    formats: OutputFormat[] | FormatSpec[] | 'all',
    options: FormatOptions
  ): Promise<FormatResult[]> {
    const results: FormatResult[] = [];

    // Resolve 'all' to actual format specs
    let targetFormats: FormatSpec[];
    if (formats === 'all') {
      // Get unique formats (ignore variants for 'all')
      const uniqueFormats = new Set<OutputFormat>();
      for (const key of this.formatters.keys()) {
        const format = key.split(':')[0] as OutputFormat;
        uniqueFormats.add(format);
      }
      targetFormats = Array.from(uniqueFormats).map(f => ({ format: f }));
    } else if (Array.isArray(formats) && formats.length > 0) {
      // Check if it's OutputFormat[] or FormatSpec[]
      if (typeof formats[0] === 'string') {
        // OutputFormat[] - convert to FormatSpec[]
        targetFormats = (formats as OutputFormat[]).map(f => ({ format: f }));
      } else {
        // Already FormatSpec[]
        targetFormats = formats as FormatSpec[];
      }
    } else {
      targetFormats = [];
    }

    // Extract runId from metadata (use timestamp as fallback)
    const runId = output.metadata.processed_at.replace(/[:.]/g, '-').substring(0, 19);

    // Ensure output directory exists
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    for (const spec of targetFormats) {
      const formatter = this.getFormatter(spec.format, spec.variant);

      if (!formatter) {
        results.push({
          format: spec.format,
          filename: '',
          filepath: '',
          content: '',
          success: false,
          error: `No formatter found for format: ${spec.format}${spec.variant ? `:${spec.variant}` : ''}`,
        });
        continue;
      }

      // Generate summary file
      const summaryResult = await this.generateSummaryFile(
        output,
        formatter,
        runId,
        options,
        spec.variant
      );
      results.push(summaryResult);

      // Generate individual PBI files
      for (const pbi of output.pbis) {
        const pbiResult = await this.generatePBIFile(
          pbi,
          formatter,
          runId,
          options,
          spec.variant
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
    options: FormatOptions,
    variant?: string
  ): Promise<FormatResult> {
    try {
      const content = formatter.formatSummary(output);
      const extension = formatter.getFileExtension();
      const variantSuffix = variant ? `.${variant}` : '';
      const filename = `summary${variantSuffix}${extension}`;
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
      const extension = formatter.getFileExtension();
      const variantSuffix = variant ? `.${variant}` : '';
      const filename = `summary${variantSuffix}${extension}`;

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
   * Generate PBI file for a format
   */
  private async generatePBIFile(
    pbi: PipelineOutput['pbis'][0],
    formatter: Formatter,
    runId: string,
    options: FormatOptions,
    variant?: string
  ): Promise<FormatResult> {
    try {
      const content = formatter.formatPBI(pbi, runId);

      // File naming: pbi-{id}.{format}[.{variant}].{ext}
      // For example: PBI-001.obsidian.md, PBI-001.devops.api.json, PBI-001.devops.manual.md
      const formatId = formatter.getFormatId();
      const extension = formatter.getFileExtension();

      // Remove leading dot from extension if present
      const ext = extension.startsWith('.') ? extension.substring(1) : extension;

      const variantPart = variant ? `.${variant}` : '';
      const filename = `${pbi.pbi.id}.${formatId}${variantPart}.${ext}`;
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
      const variantPart = variant ? `.${variant}` : '';
      const filename = `${pbi.pbi.id}.${formatId}${variantPart}.${ext}`;

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
