/**
 * Model Router - Intelligent request routing with fallback strategies
 *
 * Routes AI requests to the appropriate provider based on:
 * - Per-step configuration
 * - Pipeline defaults
 * - Provider availability
 * - Cost limits
 * - Fallback strategies
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  Currency,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
} from '../providers/base';
import { CostTracker } from './cost-tracker';
import { logInfo, logWarn, logError } from '../../utils/logger';

/**
 * Fallback strategies
 */
export type FallbackStrategy = 'cascade' | 'round-robin' | 'cheapest-first';

/**
 * Configuration for a single step
 */
export interface StepConfig {
  provider: string;
  model: string;
  reason?: string;
}

/**
 * Fallback provider configuration
 */
export interface FallbackProvider {
  provider: string;
  model: string;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  // Default provider and model
  defaults: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    currency?: Currency;
  };

  // Fallback configuration
  fallback: {
    enabled: boolean;
    strategy: FallbackStrategy;
    providers: FallbackProvider[];
  };

  // Per-step overrides
  steps: Record<string, StepConfig>;

  // Cost management
  cost_management?: {
    daily_limit_usd?: number;
    per_run_limit_usd?: number;
    alert_threshold_usd?: number;
  };

  // Offline mode (local-only)
  offline_mode?: {
    enabled: boolean;
    default_provider: string;
    default_model: string;
  };
}

/**
 * Routing result with metadata
 */
export interface RoutingResult extends AIResponse {
  attemptedProviders: string[];
  fallbackUsed: boolean;
}

/**
 * Model Router class
 */
export class ModelRouter {
  private providers: Map<string, AIProvider>;
  private config: RouterConfig;
  private costTracker: CostTracker;
  private roundRobinIndex = 0;

  constructor(providers: Map<string, AIProvider>, config: RouterConfig) {
    this.providers = providers;
    this.config = config;
    this.costTracker = new CostTracker(config.cost_management || {});
  }

  /**
   * Route a request to the appropriate provider
   * @param step Pipeline step name (e.g., 'extract_candidates', 'score_confidence')
   * @param request AI request
   * @returns AI response with routing metadata
   */
  async route(step: string, request: AIRequest): Promise<RoutingResult> {
    // Check offline mode
    if (this.config.offline_mode?.enabled) {
      return this.routeOffline(step, request);
    }

    // Get step configuration
    const stepConfig = this.config.steps[step];
    const providerName = stepConfig?.provider || this.config.defaults.provider;
    const model = stepConfig?.model || this.config.defaults.model;

    logInfo(`[Router] Step: ${step} → Provider: ${providerName}, Model: ${model}`);
    if (stepConfig?.reason) {
      logInfo(`[Router] Reason: ${stepConfig.reason}`);
    }

    // Attempt primary provider
    const attemptedProviders: string[] = [providerName];

    try {
      const response = await this.sendRequest(providerName, model, request);
      return {
        ...response,
        attemptedProviders,
        fallbackUsed: false,
      };
    } catch (error) {
      logWarn(`[Router] Primary provider ${providerName} failed: ${(error as Error).message}`);

      // Try fallback if enabled
      if (this.config.fallback.enabled) {
        return this.handleFallback(step, request, attemptedProviders, error as Error);
      }

      throw error;
    }
  }

  /**
   * Send request to a specific provider
   * @private
   */
  private async sendRequest(
    providerName: string,
    model: string,
    request: AIRequest
  ): Promise<AIResponse> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new ProviderError(`Provider ${providerName} not found`, providerName);
    }

    // Check availability
    if (!(await provider.isAvailable())) {
      throw new ProviderUnavailableError(providerName);
    }

    // Estimate cost
    const currency = this.config.defaults.currency || 'EUR';
    const estimate = provider.estimateCost(request, currency);

    // Check cost limits
    if (!this.costTracker.canAfford(estimate.costUSD)) {
      throw new ProviderError(
        `Cost limit would be exceeded. Estimated: $${estimate.costUSD.toFixed(4)}`,
        providerName
      );
    }

    // Send request
    const response = await provider.sendMessage({
      ...request,
      model,
      temperature: request.temperature ?? this.config.defaults.temperature,
      maxTokens: request.maxTokens ?? this.config.defaults.maxTokens,
    });

    // Track cost
    this.costTracker.record(response);

    return response;
  }

  /**
   * Handle fallback when primary provider fails
   * @private
   */
  private async handleFallback(
    step: string,
    request: AIRequest,
    attemptedProviders: string[],
    originalError: Error
  ): Promise<RoutingResult> {
    logInfo(`[Router] Attempting fallback strategy: ${this.config.fallback.strategy}`);

    const fallbackProviders = this.selectFallbackProviders();

    for (const fallback of fallbackProviders) {
      // Skip if already attempted
      if (attemptedProviders.includes(fallback.provider)) {
        continue;
      }

      attemptedProviders.push(fallback.provider);

      try {
        logInfo(`[Router] Trying fallback: ${fallback.provider}/${fallback.model}`);
        const response = await this.sendRequest(fallback.provider, fallback.model, request);

        logInfo(`[Router] ✓ Fallback successful: ${fallback.provider}`);

        return {
          ...response,
          attemptedProviders,
          fallbackUsed: true,
        };
      } catch (error) {
        logWarn(`[Router] Fallback ${fallback.provider} failed: ${(error as Error).message}`);
        continue;
      }
    }

    // All fallbacks failed
    logError(`[Router] All providers failed for step: ${step}`);
    throw new ProviderError(
      `All providers failed. Attempted: ${attemptedProviders.join(', ')}`,
      attemptedProviders[0],
      originalError
    );
  }

  /**
   * Select fallback providers based on strategy
   * @private
   */
  private selectFallbackProviders(): FallbackProvider[] {
    const { strategy, providers } = this.config.fallback;

    switch (strategy) {
      case 'cascade':
        // Try providers in order
        return providers;

      case 'round-robin':
        // Rotate through providers
        const rotated = [...providers];
        const selected = rotated.splice(this.roundRobinIndex, 1);
        this.roundRobinIndex = (this.roundRobinIndex + 1) % providers.length;
        return [...selected, ...rotated];

      case 'cheapest-first':
        // Sort by estimated cost (local first, then by pricing)
        return [...providers].sort((a, b) => {
          const providerA = this.providers.get(a.provider);
          const providerB = this.providers.get(b.provider);

          if (!providerA || !providerB) return 0;

          // Local providers always first (cost = 0)
          if (providerA.type === 'local' && providerB.type !== 'local') return -1;
          if (providerA.type !== 'local' && providerB.type === 'local') return 1;

          // For online providers, estimate and compare
          const dummyRequest: AIRequest = {
            systemPrompt: 'test',
            userPrompt: 'test',
            maxTokens: 2000,
          };

          const costA = providerA.estimateCost(dummyRequest).costUSD;
          const costB = providerB.estimateCost(dummyRequest).costUSD;

          return costA - costB;
        });

      default:
        return providers;
    }
  }

  /**
   * Route in offline mode (local providers only)
   * @private
   */
  private async routeOffline(step: string, request: AIRequest): Promise<RoutingResult> {
    const { default_provider, default_model } = this.config.offline_mode!;

    logInfo(`[Router] OFFLINE MODE - Using local provider: ${default_provider}`);

    const response = await this.sendRequest(default_provider, default_model, request);

    return {
      ...response,
      attemptedProviders: [default_provider],
      fallbackUsed: false,
    };
  }

  /**
   * Get cost tracking statistics
   */
  getCostStatistics() {
    return this.costTracker.getStatistics();
  }

  /**
   * Reset cost tracking (e.g., for new day/run)
   */
  resetCostTracking() {
    this.costTracker.reset();
  }

  /**
   * Check if a provider is available
   */
  async isProviderAvailable(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    return provider.isAvailable();
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
