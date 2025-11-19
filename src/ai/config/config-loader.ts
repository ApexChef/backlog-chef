/**
 * Configuration loader for model routing
 *
 * Loads and validates YAML configuration files
 */

import fs from 'fs';
import yaml from 'js-yaml';
import { RouterConfig } from '../router';

/**
 * Load router configuration from YAML file
 * @param configPath Path to YAML configuration file
 * @returns Parsed and validated router configuration
 */
export function loadRouterConfig(configPath: string): RouterConfig {
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents) as RouterConfig;

    // Validate configuration
    validateRouterConfig(config);

    return config;
  } catch (error) {
    throw new Error(`Failed to load router configuration from ${configPath}: ${(error as Error).message}`);
  }
}

/**
 * Validate router configuration
 * @param config Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateRouterConfig(config: RouterConfig): void {
  // Validate defaults
  if (!config.defaults) {
    throw new Error('Missing required field: defaults');
  }

  if (!config.defaults.provider) {
    throw new Error('Missing required field: defaults.provider');
  }

  if (!config.defaults.model) {
    throw new Error('Missing required field: defaults.model');
  }

  // Validate fallback configuration
  if (!config.fallback) {
    throw new Error('Missing required field: fallback');
  }

  if (typeof config.fallback.enabled !== 'boolean') {
    throw new Error('Invalid field: fallback.enabled must be a boolean');
  }

  if (config.fallback.enabled) {
    if (!config.fallback.strategy) {
      throw new Error('Missing required field: fallback.strategy when fallback is enabled');
    }

    const validStrategies = ['cascade', 'round-robin', 'cheapest-first'];
    if (!validStrategies.includes(config.fallback.strategy)) {
      throw new Error(
        `Invalid fallback.strategy: ${config.fallback.strategy}. Must be one of: ${validStrategies.join(', ')}`
      );
    }

    if (!config.fallback.providers || config.fallback.providers.length === 0) {
      throw new Error('Missing or empty required field: fallback.providers when fallback is enabled');
    }

    // Validate each fallback provider
    for (const provider of config.fallback.providers) {
      if (!provider.provider) {
        throw new Error('Fallback provider missing required field: provider');
      }
      if (!provider.model) {
        throw new Error(`Fallback provider ${provider.provider} missing required field: model`);
      }
    }
  }

  // Validate steps (optional, but if present must be valid)
  if (config.steps) {
    for (const [stepName, stepConfig] of Object.entries(config.steps)) {
      if (!stepConfig.provider) {
        throw new Error(`Step ${stepName} missing required field: provider`);
      }
      if (!stepConfig.model) {
        throw new Error(`Step ${stepName} missing required field: model`);
      }
    }
  }

  // Validate cost management (optional)
  if (config.cost_management) {
    const { daily_limit_usd, per_run_limit_usd, alert_threshold_usd } = config.cost_management;

    if (daily_limit_usd !== undefined && (daily_limit_usd < 0 || isNaN(daily_limit_usd))) {
      throw new Error('Invalid cost_management.daily_limit_usd: must be a non-negative number');
    }

    if (per_run_limit_usd !== undefined && (per_run_limit_usd < 0 || isNaN(per_run_limit_usd))) {
      throw new Error('Invalid cost_management.per_run_limit_usd: must be a non-negative number');
    }

    if (
      alert_threshold_usd !== undefined &&
      (alert_threshold_usd < 0 || isNaN(alert_threshold_usd))
    ) {
      throw new Error('Invalid cost_management.alert_threshold_usd: must be a non-negative number');
    }
  }

  // Validate offline mode (optional)
  if (config.offline_mode) {
    if (typeof config.offline_mode.enabled !== 'boolean') {
      throw new Error('Invalid field: offline_mode.enabled must be a boolean');
    }

    if (config.offline_mode.enabled) {
      if (!config.offline_mode.default_provider) {
        throw new Error('Missing required field: offline_mode.default_provider when offline mode is enabled');
      }
      if (!config.offline_mode.default_model) {
        throw new Error('Missing required field: offline_mode.default_model when offline mode is enabled');
      }
    }
  }
}

/**
 * Create a default router configuration
 * @returns Default router configuration
 */
export function createDefaultRouterConfig(): RouterConfig {
  return {
    defaults: {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
      temperature: 0.7,
      maxTokens: 4096,
      currency: 'EUR',
    },
    fallback: {
      enabled: true,
      strategy: 'cascade',
      providers: [
        { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'ollama', model: 'llama3.2:latest' },
      ],
    },
    steps: {},
    cost_management: {
      daily_limit_usd: 10.0,
      per_run_limit_usd: 1.0,
      alert_threshold_usd: 0.5,
    },
  };
}
