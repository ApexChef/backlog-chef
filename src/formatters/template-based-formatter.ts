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

  constructor(format: OutputFormat) {
    this.format = format;
    this.engine = new TemplateEngine();

    // Set format names
    const formatNames: Record<OutputFormat, string> = {
      obsidian: 'Obsidian Markdown',
      devops: 'Azure DevOps',
      confluence: 'Confluence Wiki',
    };
    this.formatName = formatNames[format];
  }

  formatPBI(pbi: PipelineOutput['pbis'][0], runId: string): string {
    // Note: TemplateEngine.render is async but Handlebars rendering is sync
    // We need to call it synchronously for the Formatter interface
    const result = this.renderSync({
      format: this.format,
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
    const location = this.engine.getResolver().resolveMain(this.format);
    if (location) {
      const configPath = location.path.replace(/main\.hbs$/, 'config.yaml');
      try {
        const { ConfigLoader } = require('../templates/engine/config-loader');
        const config = ConfigLoader.load(configPath);
        return config.fileExtension;
      } catch (error) {
        // Fallback to defaults
        const defaults: Record<OutputFormat, string> = {
          obsidian: '.md',
          devops: '.txt',
          confluence: '.wiki',
        };
        return defaults[this.format];
      }
    }

    // Ultimate fallback
    return '.txt';
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
  private renderSync(options: { format: string; context: any }): { content: string; fileExtension: string } {
    // Since Handlebars is actually synchronous, we can call the engine's internal rendering directly
    // This is a workaround for the async interface
    const templateLocation = this.engine.getResolver().resolveMain(options.format);
    if (!templateLocation) {
      throw new Error(`Template not found for format "${options.format}"`);
    }

    // Get compiled template
    const fs = require('fs');
    const Handlebars = require('handlebars');
    const templateSource = fs.readFileSync(templateLocation.path, 'utf-8');

    // Register helpers
    this.engine.getHelperRegistry().registerWithHandlebars(Handlebars);

    // Compile and render
    const template = Handlebars.compile(templateSource);
    const content = template(options.context);

    // Get file extension from config
    let fileExtension = '.txt';
    const configPath = templateLocation.path.replace(/main\.hbs$/, 'config.yaml');
    if (fs.existsSync(configPath)) {
      const { ConfigLoader } = require('../templates/engine/config-loader');
      const config = ConfigLoader.load(configPath);
      fileExtension = config.fileExtension;
    }

    return { content, fileExtension };
  }
}
