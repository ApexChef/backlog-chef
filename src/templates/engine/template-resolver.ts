/**
 * Template Resolver
 *
 * Handles template discovery and resolution across the hierarchy:
 * 1. Project-level: ./.backlog-chef/templates/
 * 2. User-level: ~/.backlog-chef/templates/
 * 3. Built-in: src/templates/built-in/
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigLoader, FormatConfig, OutputVariant } from './config-loader';

export interface TemplateLocation {
  type: 'project' | 'user' | 'built-in';
  path: string;
}

export interface VariantResolveResult {
  location: TemplateLocation;
  variant: OutputVariant;
  config: FormatConfig;
}

export class TemplateResolver {
  private projectRoot: string;
  private userTemplateDir: string;
  private builtInTemplateDir: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.userTemplateDir = path.join(os.homedir(), '.backlog-chef', 'templates');
    this.builtInTemplateDir = path.join(__dirname, '..', 'built-in');
  }

  /**
   * Resolve template file for a given format and filename
   * Checks in order: project → user → built-in
   */
  resolve(format: string, filename: string): TemplateLocation | null {
    // 1. Check project-level templates
    const projectPath = path.join(this.projectRoot, '.backlog-chef', 'templates', format, filename);
    if (fs.existsSync(projectPath)) {
      return {
        type: 'project',
        path: projectPath,
      };
    }

    // 2. Check user-level templates
    const userPath = path.join(this.userTemplateDir, format, filename);
    if (fs.existsSync(userPath)) {
      return {
        type: 'user',
        path: userPath,
      };
    }

    // 3. Check built-in templates
    const builtInPath = path.join(this.builtInTemplateDir, format, filename);
    if (fs.existsSync(builtInPath)) {
      return {
        type: 'built-in',
        path: builtInPath,
      };
    }

    return null;
  }

  /**
   * Resolve the main template file for a format
   * Typically looks for 'main.hbs'
   */
  resolveMain(format: string): TemplateLocation | null {
    return this.resolve(format, 'main.hbs');
  }

  /**
   * Resolve format directory (for config loading)
   * Returns the first location where the format directory exists
   */
  resolveFormatDir(format: string): TemplateLocation | null {
    // 1. Check project-level
    const projectDir = path.join(this.projectRoot, '.backlog-chef', 'templates', format);
    if (fs.existsSync(projectDir) && fs.statSync(projectDir).isDirectory()) {
      return {
        type: 'project',
        path: projectDir,
      };
    }

    // 2. Check user-level
    const userDir = path.join(this.userTemplateDir, format);
    if (fs.existsSync(userDir) && fs.statSync(userDir).isDirectory()) {
      return {
        type: 'user',
        path: userDir,
      };
    }

    // 3. Check built-in
    const builtInDir = path.join(this.builtInTemplateDir, format);
    if (fs.existsSync(builtInDir) && fs.statSync(builtInDir).isDirectory()) {
      return {
        type: 'built-in',
        path: builtInDir,
      };
    }

    return null;
  }

  /**
   * Resolve template for a specific variant
   * Loads config and returns template location + variant info
   */
  resolveVariant(format: string, variantName?: string): VariantResolveResult | null {
    // Find format directory
    const formatDir = this.resolveFormatDir(format);
    if (!formatDir) {
      return null;
    }

    // Load config
    let config: FormatConfig;
    try {
      config = ConfigLoader.loadForFormat(formatDir.path);
    } catch (error) {
      // If config doesn't exist or is invalid, fall back to legacy behavior
      return null;
    }

    // Get the requested variant (or default)
    const variant = ConfigLoader.getVariant(config, variantName);
    if (!variant) {
      return null;
    }

    // Determine which template file to use
    const templateFilename = variant.templatePath || config.templatePath;

    // Resolve the template file
    const templateLocation = this.resolve(format, templateFilename);
    if (!templateLocation) {
      return null;
    }

    return {
      location: templateLocation,
      variant,
      config,
    };
  }

  /**
   * List all available variants for a format
   */
  listVariants(format: string): string[] {
    const formatDir = this.resolveFormatDir(format);
    if (!formatDir) {
      return [];
    }

    try {
      const config = ConfigLoader.loadForFormat(formatDir.path);
      return ConfigLoader.getAvailableVariants(config);
    } catch (error) {
      // Config doesn't exist or is invalid
      return [];
    }
  }

  /**
   * Resolve a partial template
   * Partials are stored in a 'partials' subdirectory
   */
  resolvePartial(format: string, partialName: string): TemplateLocation | null {
    const filename = `partials/${partialName}.hbs`;
    return this.resolve(format, filename);
  }

  /**
   * List all available formats
   * Returns unique format names found across all template locations
   */
  listFormats(): string[] {
    const formats = new Set<string>();

    // Add formats from all locations
    [
      path.join(this.projectRoot, '.backlog-chef', 'templates'),
      this.userTemplateDir,
      this.builtInTemplateDir,
    ].forEach((dir) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((item) => {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            formats.add(item);
          }
        });
      }
    });

    return Array.from(formats).sort();
  }

  /**
   * Check if a format has templates defined
   */
  hasFormat(format: string): boolean {
    return this.resolveMain(format) !== null;
  }

  /**
   * Get all template files for a specific format
   * Useful for validation and listing
   */
  getTemplateFiles(format: string): string[] {
    const files: string[] = [];

    // Check all locations for this format
    [
      path.join(this.projectRoot, '.backlog-chef', 'templates', format),
      path.join(this.userTemplateDir, format),
      path.join(this.builtInTemplateDir, format),
    ].forEach((dir) => {
      if (fs.existsSync(dir)) {
        this.collectTemplateFiles(dir, '', files);
      }
    });

    return files;
  }

  /**
   * Recursively collect template files from a directory
   */
  private collectTemplateFiles(dir: string, prefix: string, files: string[]): void {
    fs.readdirSync(dir).forEach((item) => {
      const itemPath = path.join(dir, item);
      const relativePath = prefix ? `${prefix}/${item}` : item;

      if (fs.statSync(itemPath).isDirectory()) {
        this.collectTemplateFiles(itemPath, relativePath, files);
      } else if (item.endsWith('.hbs')) {
        files.push(relativePath);
      }
    });
  }

  /**
   * Get the template directories for debugging/info purposes
   */
  getTemplateDirs(): { project: string; user: string; builtIn: string } {
    return {
      project: path.join(this.projectRoot, '.backlog-chef', 'templates'),
      user: this.userTemplateDir,
      builtIn: this.builtInTemplateDir,
    };
  }
}
