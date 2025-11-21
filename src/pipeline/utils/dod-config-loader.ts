/**
 * Definition of Done / Definition of Ready Configuration Loader
 *
 * Loads DoR/DoD YAML files from config directory
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { DoRConfig, DoDConfig } from '../types/task-types';

/**
 * Load Definition of Ready configuration
 * @param configPath Optional path to DoR YAML file (defaults to config/definition-of-ready.yaml)
 */
export function loadDoRConfig(configPath?: string): DoRConfig {
  const filePath = configPath || path.join(process.cwd(), 'config', 'definition-of-ready.yaml');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Definition of Ready config not found at: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const config = yaml.load(fileContent) as DoRConfig;

  if (!config.definition_of_ready || !Array.isArray(config.definition_of_ready)) {
    throw new Error(`Invalid DoR config: missing 'definition_of_ready' array in ${filePath}`);
  }

  return config;
}

/**
 * Load Definition of Done configuration
 * @param configPath Optional path to DoD YAML file (defaults to config/definition-of-done.yaml)
 */
export function loadDoDConfig(configPath?: string): DoDConfig {
  const filePath = configPath || path.join(process.cwd(), 'config', 'definition-of-done.yaml');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Definition of Done config not found at: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const config = yaml.load(fileContent) as DoDConfig;

  if (!config.definition_of_done || !Array.isArray(config.definition_of_done)) {
    throw new Error(`Invalid DoD config: missing 'definition_of_done' array in ${filePath}`);
  }

  return config;
}

/**
 * Load both DoR and DoD configs
 * @param dorPath Optional path to DoR YAML
 * @param dodPath Optional path to DoD YAML
 */
export function loadDoRDoDConfigs(dorPath?: string, dodPath?: string): {
  dor: DoRConfig;
  dod: DoDConfig;
} {
  return {
    dor: loadDoRConfig(dorPath),
    dod: loadDoDConfig(dodPath),
  };
}
