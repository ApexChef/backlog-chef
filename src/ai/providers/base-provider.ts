/**
 * Abstract base class for AI providers
 *
 * Provides common functionality for all providers including:
 * - Cost estimation with multi-currency support
 * - Token-based cost calculation
 * - Helper methods for pricing
 *
 * Subclasses only need to implement provider-specific logic.
 */

import {
  AIProvider,
  AIRequest,
  CostEstimate,
  Currency,
  ProviderConfig,
} from './base';
import { convertFromUSD, getExchangeRate } from '../utils/currency-converter';

/**
 * Pricing information for a model
 */
export interface ModelPricing {
  /** Cost per million input tokens in USD */
  input: number;
  /** Cost per million output tokens in USD */
  output: number;
}

/**
 * Abstract base class that all providers should extend
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly type: 'online' | 'local';

  protected config: ProviderConfig;

  /**
   * Pricing table for models
   * Subclasses should override this with their specific pricing
   */
  protected abstract getPricing(): Record<string, ModelPricing>;

  /**
   * Get the default model for this provider
   * Subclasses should override this
   */
  protected abstract getDefaultModel(): string;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  // Abstract methods that subclasses MUST implement
  abstract sendMessage(request: AIRequest): Promise<any>;
  abstract isAvailable(): Promise<boolean>;
  abstract supportedModels(): any[];

  /**
   * Estimate the cost of a request
   * This implementation works for most providers and can be overridden if needed
   */
  estimateCost(request: AIRequest, currency: Currency = 'EUR'): CostEstimate {
    const model = request.model || this.config.defaultModel || this.getDefaultModel();

    // Rough estimate: system + user prompt length in chars / 4 (approx tokens)
    const estimatedInputTokens = Math.ceil(
      (request.systemPrompt.length + request.userPrompt.length) / 4
    );

    // Estimate output tokens based on maxTokens or default
    const estimatedOutputTokens = request.maxTokens || 2048;

    const costUSD = this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
    const inputCostUSD = this.calculateInputCost(model, estimatedInputTokens);
    const outputCostUSD = this.calculateOutputCost(model, estimatedOutputTokens);

    const exchangeRate = getExchangeRate(currency);
    const cost = convertFromUSD(costUSD, currency);
    const inputCost = convertFromUSD(inputCostUSD, currency);
    const outputCost = convertFromUSD(outputCostUSD, currency);

    return {
      costUSD,
      cost,
      currency,
      exchangeRate,
      breakdown: {
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        inputCostUSD,
        outputCostUSD,
        inputCost,
        outputCost,
      },
    };
  }

  /**
   * Calculate total cost for a request
   * @protected - Can be overridden by subclasses
   */
  protected calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const inputCost = this.calculateInputCost(model, inputTokens);
    const outputCost = this.calculateOutputCost(model, outputTokens);
    return inputCost + outputCost;
  }

  /**
   * Calculate input token cost
   * @protected - Can be overridden by subclasses
   */
  protected calculateInputCost(model: string, tokens: number): number {
    const pricing = this.getPricing()[model];
    if (!pricing) {
      // Use default model pricing if specific model not found
      const defaultPricing = this.getPricing()[this.getDefaultModel()];
      return (tokens / 1_000_000) * (defaultPricing?.input || 0);
    }
    return (tokens / 1_000_000) * pricing.input;
  }

  /**
   * Calculate output token cost
   * @protected - Can be overridden by subclasses
   */
  protected calculateOutputCost(model: string, tokens: number): number {
    const pricing = this.getPricing()[model];
    if (!pricing) {
      // Use default model pricing if specific model not found
      const defaultPricing = this.getPricing()[this.getDefaultModel()];
      return (tokens / 1_000_000) * (defaultPricing?.output || 0);
    }
    return (tokens / 1_000_000) * pricing.output;
  }

  /**
   * Get pricing for a specific model
   * @protected - Helper method for subclasses
   */
  protected getModelPricing(model: string): ModelPricing | undefined {
    return this.getPricing()[model];
  }
}

/**
 * Base class for local providers (free models)
 * Local providers always return zero cost
 */
export abstract class BaseLocalProvider extends BaseAIProvider {
  readonly type = 'local' as const;

  /**
   * Local providers have no pricing
   */
  protected getPricing(): Record<string, ModelPricing> {
    return {};
  }

  /**
   * Local providers always return zero cost
   * @override
   */
  estimateCost(_request: AIRequest, currency: Currency = 'EUR'): CostEstimate {
    return {
      costUSD: 0,
      cost: 0,
      currency,
      exchangeRate: 1.0,
      breakdown: {
        inputTokens: 0,
        outputTokens: 0,
        inputCostUSD: 0,
        outputCostUSD: 0,
        inputCost: 0,
        outputCost: 0,
      },
    };
  }
}
