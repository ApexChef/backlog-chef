/**
 * Template Engine
 *
 * Core Handlebars-based template engine for rendering PBI outputs
 */

import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { TemplateResolver } from './template-resolver';
import { HelperRegistry } from './helper-registry';
import { ConfigLoader, FormatConfig } from './config-loader';

export interface TemplateContext {
  pbi: any;
  metadata?: any;
  options?: any;
  [key: string]: any;
}

export interface RenderOptions {
  format: string;
  context: TemplateContext;
  outputPath?: string;
}

export interface RenderResult {
  content: string;
  fileExtension: string;
  format: string;
}

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private resolver: TemplateResolver;
  private helperRegistry: HelperRegistry;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate>;

  constructor(projectRoot?: string) {
    this.handlebars = Handlebars.create();
    this.resolver = new TemplateResolver(projectRoot);
    this.helperRegistry = new HelperRegistry();
    this.compiledTemplates = new Map();

    // Register all helpers with Handlebars
    this.helperRegistry.registerWithHandlebars(this.handlebars);
  }

  /**
   * Render a template for a specific format
   */
  async render(options: RenderOptions): Promise<RenderResult> {
    const { format, context } = options;

    // Get format configuration
    const config = this.loadFormatConfig(format);

    // Resolve and compile main template
    const templateLocation = this.resolver.resolveMain(format);
    if (!templateLocation) {
      throw new Error(
        `Template not found for format "${format}". ` +
          `Searched in: ${JSON.stringify(this.resolver.getTemplateDirs())}`
      );
    }

    // Compile template (with caching)
    const template = this.getCompiledTemplate(templateLocation.path);

    // Register partials for this format
    this.registerPartials(format);

    try {
      // Render template
      const content = template(context);

      // Get file extension from config (either direct or from first output variant)
      let fileExtension = config.fileExtension;
      if (!fileExtension && config.outputs && config.outputs.length > 0) {
        fileExtension = config.outputs[0].fileExtension;
      }
      if (!fileExtension) {
        fileExtension = '.txt'; // Ultimate fallback
      }

      return {
        content,
        fileExtension,
        format,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Template rendering failed for format "${format}" ` +
            `(${templateLocation.path}): ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Render and write to file
   */
  async renderToFile(options: RenderOptions): Promise<string> {
    if (!options.outputPath) {
      throw new Error('outputPath is required for renderToFile');
    }

    const result = await this.render(options);

    // Ensure output directory exists
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write file with correct extension
    const finalPath = options.outputPath.endsWith(result.fileExtension)
      ? options.outputPath
      : `${options.outputPath}${result.fileExtension}`;

    fs.writeFileSync(finalPath, result.content, 'utf-8');

    return finalPath;
  }

  /**
   * Get compiled template (with caching)
   */
  private getCompiledTemplate(templatePath: string): HandlebarsTemplateDelegate {
    // Check cache
    if (this.compiledTemplates.has(templatePath)) {
      return this.compiledTemplates.get(templatePath)!;
    }

    // Read and compile template
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');

    try {
      const compiled = this.handlebars.compile(templateSource);
      this.compiledTemplates.set(templatePath, compiled);
      return compiled;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Template compilation failed for ${templatePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Register all partials for a format
   */
  private registerPartials(format: string): void {
    // Get all template files for this format
    const templateFiles = this.resolver.getTemplateFiles(format);

    // Filter for partials
    const partialFiles = templateFiles.filter((file) => file.startsWith('partials/'));

    // Register each partial
    partialFiles.forEach((partialFile) => {
      // Extract partial name (remove 'partials/' prefix and '.hbs' suffix)
      const partialName = partialFile.replace('partials/', '').replace('.hbs', '');

      // Resolve partial location
      const location = this.resolver.resolvePartial(format, partialName);
      if (location) {
        const partialSource = fs.readFileSync(location.path, 'utf-8');
        this.handlebars.registerPartial(partialName, partialSource);
      }
    });
  }

  /**
   * Load format configuration
   */
  private loadFormatConfig(format: string): FormatConfig {
    // Try to find config.yaml for this format
    const formatLocation = this.resolver.resolveMain(format);
    if (!formatLocation) {
      throw new Error(`Format "${format}" not found`);
    }

    const formatDir = path.dirname(formatLocation.path);
    const configPath = path.join(formatDir, 'config.yaml');

    if (fs.existsSync(configPath)) {
      return ConfigLoader.load(configPath);
    }

    // Return default config if no config.yaml exists
    return ConfigLoader.createDefault(format);
  }

  /**
   * Register a custom helper function
   */
  registerHelper(name: string, fn: (...args: any[]) => any): void {
    this.helperRegistry.register(name, fn);
    this.handlebars.registerHelper(name, fn);
  }

  /**
   * Register multiple custom helpers
   */
  registerHelpers(helpers: Record<string, (...args: any[]) => any>): void {
    this.helperRegistry.registerMany(helpers);
    Object.entries(helpers).forEach(([name, fn]) => {
      this.handlebars.registerHelper(name, fn);
    });
  }

  /**
   * List all available formats
   */
  listFormats(): string[] {
    return this.resolver.listFormats();
  }

  /**
   * Check if a format is available
   */
  hasFormat(format: string): boolean {
    return this.resolver.hasFormat(format);
  }

  /**
   * Clear compiled template cache
   * Useful for development/testing
   */
  clearCache(): void {
    this.compiledTemplates.clear();
  }

  /**
   * Get template resolver (for advanced usage)
   */
  getResolver(): TemplateResolver {
    return this.resolver;
  }

  /**
   * Get helper registry (for advanced usage)
   */
  getHelperRegistry(): HelperRegistry {
    return this.helperRegistry;
  }
}
