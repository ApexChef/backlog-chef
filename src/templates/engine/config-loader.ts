/**
 * Format Configuration Loader
 *
 * Loads and validates format configuration files (YAML)
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Output variant configuration
 * Defines a specific delivery format for a target system
 */
export interface OutputVariant {
  variant: string;                    // e.g., 'api', 'manual', 'import'
  description: string;                // Human-readable description
  fileExtension: string;              // File extension (e.g., '.json', '.md')
  contentType?: string;               // MIME type (e.g., 'application/json')
  templatePath?: string;              // Optional: variant-specific template (overrides main)
  delivery: {
    method: 'api' | 'file' | 'clipboard';  // How to deliver this output
    endpoint?: string;                // API endpoint pattern (for method: 'api')
    authentication?: 'pat' | 'oauth' | 'basic' | 'none';  // Auth method
    instructions?: string;            // Instructions for manual delivery
  };
}

/**
 * Target system information
 */
export interface TargetSystem {
  system: string;                     // System identifier (e.g., 'azure-devops', 'jira')
  organization?: string;              // Organization/instance URL pattern
  project?: string;                   // Project identifier pattern
  workItemType?: string;              // Work item type (for issue trackers)
  [key: string]: any;                 // Additional system-specific config
}

/**
 * Format configuration (enhanced with variants support)
 */
export interface FormatConfig {
  name: string;
  description: string;
  templatePath: string;               // Default/main template

  // NEW: Target system information
  target?: TargetSystem;

  // NEW: Output variants (multiple delivery methods)
  outputs?: OutputVariant[];

  // LEGACY: Backward compatibility - will be treated as single variant
  fileExtension?: string;

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
   * Get a specific variant from config, or default variant
   */
  static getVariant(config: FormatConfig, variantName?: string): OutputVariant | null {
    // If config has outputs array (new format)
    if (config.outputs && config.outputs.length > 0) {
      if (variantName) {
        // Find specific variant
        const variant = config.outputs.find(v => v.variant === variantName);
        if (!variant) {
          throw new Error(`Variant '${variantName}' not found in format '${config.name}'`);
        }
        return variant;
      }
      // Return first variant as default
      return config.outputs[0];
    }

    // Legacy config: create variant from fileExtension
    if (config.fileExtension) {
      return {
        variant: 'default',
        description: config.description,
        fileExtension: config.fileExtension,
        templatePath: config.templatePath,
        delivery: {
          method: 'file',
        },
      };
    }

    return null;
  }

  /**
   * Get all available variants for a config
   */
  static getAvailableVariants(config: FormatConfig): string[] {
    if (config.outputs && config.outputs.length > 0) {
      return config.outputs.map(v => v.variant);
    }
    return ['default'];
  }

  /**
   * Validate format configuration
   */
  private static validate(config: any, configPath: string): void {
    const required = ['name', 'description', 'templatePath'];
    const missing = required.filter((field) => !config[field]);

    if (missing.length > 0) {
      throw new Error(
        `Invalid format configuration in ${configPath}: ` + `missing required fields: ${missing.join(', ')}`
      );
    }

    // Either outputs array OR fileExtension must be present
    if (!config.outputs && !config.fileExtension) {
      throw new Error(
        `Invalid format configuration in ${configPath}: ` +
        `must have either 'outputs' array or 'fileExtension' field`
      );
    }

    // Validate outputs array if present
    if (config.outputs) {
      if (!Array.isArray(config.outputs) || config.outputs.length === 0) {
        throw new Error(
          `Invalid format configuration in ${configPath}: ` +
          `'outputs' must be a non-empty array`
        );
      }

      // Validate each output variant
      for (const output of config.outputs) {
        const requiredFields = ['variant', 'description', 'fileExtension', 'delivery'];
        const missingFields = requiredFields.filter(field => !output[field]);

        if (missingFields.length > 0) {
          throw new Error(
            `Invalid output variant in ${configPath}: ` +
            `missing required fields: ${missingFields.join(', ')}`
          );
        }

        // Validate fileExtension format
        if (!output.fileExtension.startsWith('.')) {
          throw new Error(
            `Invalid fileExtension for variant '${output.variant}' in ${configPath}: ` +
            `must start with a dot (e.g., ".md", ".json")`
          );
        }

        // Validate delivery method
        if (!['api', 'file', 'clipboard'].includes(output.delivery.method)) {
          throw new Error(
            `Invalid delivery method for variant '${output.variant}' in ${configPath}: ` +
            `must be 'api', 'file', or 'clipboard'`
          );
        }
      }
    }

    // Legacy validation: fileExtension format
    if (config.fileExtension && !config.fileExtension.startsWith('.')) {
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
