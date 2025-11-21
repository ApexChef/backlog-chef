/**
 * Format Configuration Loader
 *
 * Loads and validates format configuration files (YAML)
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface FormatConfig {
  name: string;
  description: string;
  fileExtension: string;
  templatePath: string;
  metadata?: {
    author?: string;
    version?: string;
    documentation?: string;
  };
  options?: {
    prettyPrint?: boolean;
    lineEndings?: 'lf' | 'crlf';
    includeMetadata?: boolean;
    [key: string]: any;
  };
}

export class ConfigLoader {
  /**
   * Load format configuration from a YAML file
   */
  static load(configPath: string): FormatConfig {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Format configuration not found: ${configPath}`);
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = yaml.load(content) as FormatConfig;

      this.validate(config, configPath);
      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load format config ${configPath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load format configuration for a specific format
   * Looks for config.yaml in the format directory
   */
  static loadForFormat(formatDir: string): FormatConfig {
    const configPath = path.join(formatDir, 'config.yaml');
    return this.load(configPath);
  }

  /**
   * Validate format configuration
   */
  private static validate(config: any, configPath: string): void {
    const required = ['name', 'description', 'fileExtension', 'templatePath'];
    const missing = required.filter((field) => !config[field]);

    if (missing.length > 0) {
      throw new Error(
        `Invalid format configuration in ${configPath}: ` + `missing required fields: ${missing.join(', ')}`
      );
    }

    // Validate fileExtension format
    if (!config.fileExtension.startsWith('.')) {
      throw new Error(
        `Invalid fileExtension in ${configPath}: ` + `must start with a dot (e.g., ".md", ".json")`
      );
    }

    // Validate templatePath
    if (!config.templatePath.endsWith('.hbs')) {
      throw new Error(`Invalid templatePath in ${configPath}: ` + `must be a .hbs file`);
    }
  }

  /**
   * Create a default format configuration
   */
  static createDefault(
    formatName: string,
    options: Partial<FormatConfig> = {}
  ): FormatConfig {
    return {
      name: formatName,
      description: options.description || `${formatName} format`,
      fileExtension: options.fileExtension || `.${formatName.toLowerCase()}`,
      templatePath: options.templatePath || 'main.hbs',
      metadata: options.metadata,
      options: options.options,
    };
  }

  /**
   * Save format configuration to a YAML file
   */
  static save(config: FormatConfig, outputPath: string): void {
    try {
      this.validate(config, outputPath);

      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
      });

      fs.writeFileSync(outputPath, yamlContent, 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save format config ${outputPath}: ${error.message}`);
      }
      throw error;
    }
  }
}
