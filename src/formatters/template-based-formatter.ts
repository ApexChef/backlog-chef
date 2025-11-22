/**
 * Template-Based Formatter
 *
 * Adapter that uses the template engine to implement the Formatter interface
 */

import { Formatter, OutputFormat } from './types';
import { PipelineOutput } from '../pipeline/types/pipeline-types';
import { TemplateEngine } from '../templates/engine';

export class TemplateBasedFormatter implements Formatter {
  private engine: TemplateEngine;
  private format: OutputFormat;
  private formatName: string;
  private variant?: string;

  constructor(format: OutputFormat, variant?: string) {
    this.format = format;
    this.variant = variant;
    this.engine = new TemplateEngine();

    // Set format names
    const formatNames: Record<OutputFormat, string> = {
      obsidian: 'Obsidian Markdown',
      devops: 'Azure DevOps',
      confluence: 'Confluence Wiki',
      json: 'JSON',
    };
    this.formatName = formatNames[format];

    // Append variant to format name if specified
    if (variant) {
      this.formatName += ` (${variant})`;
    }
  }

  formatPBI(pbi: PipelineOutput['pbis'][0], runId: string): string {
    // Note: TemplateEngine.render is async but Handlebars rendering is sync
    // We need to call it synchronously for the Formatter interface
    const result = this.renderSync({
      format: this.format,
      variant: this.variant,
      context: {
        pbi,
        metadata: {
          run_id: runId,
          created: new Date().toISOString(),
        },
      },
    });

    return result.content;
  }

  formatSummary(output: PipelineOutput): string {
    // For summary, we render with the full output context
    // Templates can optionally include a summary.hbs for custom summary rendering
    // For now, we'll use the first PBI as a sample and note this is a summary view

    const sections: string[] = [];
    sections.push(`# Backlog Summary - ${this.formatName}\n`);
    sections.push(`Generated: ${new Date(output.metadata.processed_at).toLocaleString()}`);
    sections.push(`Event Type: ${output.event_type}`);
    sections.push(`Total PBIs: ${output.metadata.total_pbis}\n`);

    sections.push(`Readiness Breakdown:`);
    sections.push(`- Ready for Sprint: ${output.metadata.ready_count}`);
    sections.push(`- Needs Refinement: ${output.metadata.needs_refinement_count}`);
    sections.push(`- Not Ready: ${output.metadata.not_ready_count}\n`);

    sections.push(`PBI List:`);
    for (const pbi of output.pbis) {
      const status = pbi.readiness.sprint_ready ? 'READY' : pbi.readiness.readiness_score >= 60 ? 'NEEDS REFINEMENT' : 'NOT READY';
      sections.push(`- ${pbi.pbi.id}: ${pbi.pbi.title} [${status} - ${pbi.readiness.readiness_score}/100]`);
    }

    sections.push(`\nProcessing Metadata:`);
    sections.push(`- Duration: ${(output.metadata.total_duration_ms / 1000).toFixed(2)}s`);
    sections.push(`- Cost: $${output.metadata.total_cost_usd.toFixed(4)}`);
    sections.push(`- Models: ${output.metadata.models_used.join(', ')}`);

    return sections.join('\n');
  }

  getFileExtension(): string {
    // Get extension from template configuration
    // Try variant-aware resolution first
    const variantResult = this.engine.getResolver().resolveVariant(this.format, this.variant);
    if (variantResult) {
      return variantResult.variant.fileExtension;
    }

    // Fallback to legacy resolution
    const location = this.engine.getResolver().resolveMain(this.format);
    if (location) {
      const configPath = location.path.replace(/main\.hbs$/, 'config.yaml');
      try {
        const { ConfigLoader } = require('../templates/engine/config-loader');
        const config = ConfigLoader.load(configPath);
        if (config.fileExtension) {
          return config.fileExtension;
        }
      } catch (error) {
        // Continue to defaults
      }
    }

    // Fallback to defaults
    const defaults: Record<OutputFormat, string> = {
      obsidian: '.md',
      devops: '.txt',
      confluence: '.wiki',
      json: '.json',
    };
    return defaults[this.format];
  }

  getName(): string {
    return this.formatName;
  }

  getFormatId(): OutputFormat {
    return this.format;
  }

  /**
   * Synchronous rendering helper for template engine
   */
  private renderSync(options: { format: string; variant?: string; context: any }): { content: string; fileExtension: string } {
    // Since Handlebars is actually synchronous, we can call the engine's internal rendering directly
    // This is a workaround for the async interface
    const fs = require('fs');
    const Handlebars = require('handlebars');

    // Try variant-aware resolution first
    let templateLocation;
    let fileExtension = '.txt';

    const variantResult = this.engine.getResolver().resolveVariant(options.format, options.variant);
    if (variantResult) {
      templateLocation = variantResult.location;
      fileExtension = variantResult.variant.fileExtension;
    } else {
      // Fallback to legacy main template
      templateLocation = this.engine.getResolver().resolveMain(options.format);
      if (!templateLocation) {
        throw new Error(`Template not found for format "${options.format}"${options.variant ? ` variant "${options.variant}"` : ''}`);
      }

      // Get file extension from config
      const configPath = templateLocation.path.replace(/main\.hbs$/, 'config.yaml');
      if (fs.existsSync(configPath)) {
        const { ConfigLoader } = require('../templates/engine/config-loader');
        const config = ConfigLoader.load(configPath);
        if (config.fileExtension) {
          fileExtension = config.fileExtension;
        }
      }
    }

    // Get compiled template
    const templateSource = fs.readFileSync(templateLocation.path, 'utf-8');

    // Register helpers
    this.engine.getHelperRegistry().registerWithHandlebars(Handlebars);

    // Compile and render
    const template = Handlebars.compile(templateSource);
    const content = template(options.context);

    return { content, fileExtension };
  }
}
