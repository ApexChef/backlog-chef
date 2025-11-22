/**
 * Format Command
 *
 * Regenerates PBI output in different formats from existing JSON files
 * without re-running the entire pipeline.
 *
 * Usage:
 *   backlog-chef format <file-or-pattern> --to <format>
 *   backlog-chef format output/pbi-001.json --to obsidian
 *   backlog-chef format output/**\/*.json --to all --force
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { FormatService, FormatSpec, OutputFormat } from '../../formatters';
import { PipelineOutput } from '../../pipeline/types/pipeline-types';

export interface FormatCommandOptions {
  to: string;  // Target format(s): 'devops', 'devops:api', 'obsidian', 'confluence', 'all'
  output?: string;  // Output directory (defaults to input file directory)
  force?: boolean;  // Overwrite existing files
  verbose?: boolean;  // Show detailed output
}

export class FormatCommand {
  private formatService: FormatService;

  constructor() {
    this.formatService = new FormatService();
  }

  /**
   * Execute the format command
   */
  async execute(filePattern: string, options: FormatCommandOptions): Promise<void> {
    console.log('🎨 Backlog Chef Format Command\n');

    // Parse target formats
    const targetFormats = this.parseFormats(options.to);

    if (targetFormats.length === 0) {
      throw new Error('No valid formats specified. Use: devops, obsidian, confluence, json, or all');
    }

    // Find matching files
    const files = await this.findJSONFiles(filePattern);

    if (files.length === 0) {
      throw new Error(`No JSON files found matching pattern: ${filePattern}`);
    }

    console.log(`Found ${files.length} JSON file(s)\n`);

    // Process each file
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[${i + 1}/${files.length}] ${path.basename(file)}`);

      try {
        const result = await this.formatFile(file, targetFormats, options);

        if (result.success) {
          successCount += result.generated;
          skipCount += result.skipped;
          console.log(`  ✓ Generated ${result.generated} format(s)`);

          if (result.skipped > 0 && !options.force) {
            console.log(`  ⚠️  Skipped ${result.skipped} existing file(s) (use --force to overwrite)`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`  Files processed: ${files.length}`);
    console.log(`  Formats generated: ${successCount}`);
    if (skipCount > 0) {
      console.log(`  Files skipped: ${skipCount}`);
    }
    if (errorCount > 0) {
      console.log(`  Errors: ${errorCount}`);
    }
    console.log('='.repeat(60));
  }

  /**
   * Format a single file
   */
  private async formatFile(
    filePath: string,
    formats: OutputFormat[] | FormatSpec[] | 'all',
    options: FormatCommandOptions
  ): Promise<{ success: boolean; generated: number; skipped: number }> {
    // Determine output directory
    const outputDir = options.output || path.dirname(filePath);

    // Read and validate JSON
    const output = this.readPipelineOutput(filePath);

    // Generate formats
    const results = await this.formatService.generateFormats(
      output,
      formats,
      {
        outputDir,
        force: options.force || false,
      }
    );

    // Count successes and skips
    const generated = results.filter(r => r.success && !r.error?.includes('already exists')).length;
    const skipped = results.filter(r => !r.success && r.error?.includes('already exists')).length;

    if (options.verbose) {
      for (const result of results) {
        if (result.success) {
          console.log(`    ✓ ${result.filename}`);
        } else {
          console.log(`    ⚠️  ${result.filename}: ${result.error}`);
        }
      }
    }

    return { success: true, generated, skipped };
  }

  /**
   * Read and validate Pipeline Output JSON
   */
  private readPipelineOutput(filePath: string): PipelineOutput {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    let data: any;
    try {
      data = JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Validate structure
    if (!data.pbis || !Array.isArray(data.pbis)) {
      throw new Error('Invalid PipelineOutput: missing pbis array');
    }

    if (!data.metadata) {
      throw new Error('Invalid PipelineOutput: missing metadata');
    }

    return data as PipelineOutput;
  }

  /**
   * Parse format string into array of FormatSpec (supports format:variant syntax)
   */
  private parseFormats(formatString: string): OutputFormat[] | FormatSpec[] | 'all' {
    const cleaned = formatString.toLowerCase().trim();

    if (cleaned === 'all') {
      return 'all';
    }

    const parts = cleaned.split(',').map(s => s.trim());
    const validFormats: FormatSpec[] = [];

    for (const part of parts) {
      // Split on colon to support format:variant syntax
      const [format, variant] = part.split(':');

      if (format === 'devops' || format === 'obsidian' || format === 'confluence' || format === 'json') {
        validFormats.push({ format: format as OutputFormat, variant });
      } else if (part !== '') {
        console.warn(`  Warning: Unknown format '${part}' ignored`);
      }
    }

    return validFormats;
  }

  /**
   * Find JSON files matching pattern (supports glob)
   */
  private async findJSONFiles(pattern: string): Promise<string[]> {
    // If it's a direct file path, return it
    if (fs.existsSync(pattern) && fs.statSync(pattern).isFile()) {
      return [pattern];
    }

    // Otherwise, use glob pattern matching
    try {
      const files = await glob(pattern, {
        absolute: true,
        nodir: true,
      });

      // Filter to only JSON files
      return files.filter(f => f.endsWith('.json'));
    } catch (error) {
      throw new Error(`Failed to find files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Show help text
   */
  static showHelp(): void {
    console.log(`
backlog-chef format - Convert PBI JSON to different output formats

USAGE
  $ backlog-chef format <file-or-pattern> --to <format> [options]

ARGUMENTS
  file-or-pattern   Path to JSON file or glob pattern (e.g., output/**/*.json)

FLAGS
  --to <format>     Target format(s): devops, devops:api, devops:manual, obsidian, confluence, json, all
                    Supports format:variant syntax for multi-variant formats
  --output <dir>    Output directory (defaults to same as input file)
  --force           Overwrite existing files
  --verbose         Show detailed output
  --help            Show this help

EXAMPLES
  # Convert single file to Obsidian format
  $ backlog-chef format output/pbi-001.json --to obsidian

  # Convert to DevOps API variant (JSON for REST API)
  $ backlog-chef format output/pbi-001.json --to devops:api

  # Convert to DevOps manual variant (Markdown for copy-paste)
  $ backlog-chef format output/pbi-001.json --to devops:manual

  # Convert to both DevOps variants
  $ backlog-chef format output/pbi-001.json --to devops:api,devops:manual

  # Convert to all formats
  $ backlog-chef format output/pbi-001.json --to all

  # Convert multiple files
  $ backlog-chef format "output/**/*.json" --to confluence

  # Overwrite existing files
  $ backlog-chef format output/pbi-001.json --to obsidian --force

  # Custom output directory
  $ backlog-chef format output/pbi-001.json --to obsidian --output ./my-notes

DESCRIPTION
  Regenerates PBI output in different formats from existing JSON files without
  re-running the expensive pipeline. This saves time and API costs.

  JSON files generated by 'backlog-chef process' contain all the data needed
  to generate any format. Use this command to convert them on-demand.
`);
  }
}
