/**
 * Anthropic Claude provider implementation
 *
 * Supports Claude 3.5 Sonnet, Claude 3.5 Haiku, and other Claude models.
 * This is the default provider for the system.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  AIRequest,
  AIResponse,
  CostEstimate,
  Model,
  Currency,
  AnthropicConfig,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
} from './base';
import { convertFromUSD, getExchangeRate } from '../utils/currency-converter';

/**
 * Anthropic Claude provider adapter
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly type = 'online' as const;

  private client: Anthropic;
  private config: AnthropicConfig;

  /**
   * Pricing per million tokens (as of January 2025)
   *
   * TODO (Future): Move pricing to external configuration file
   * This is hardcoded for MVP phase. In production, this should be:
   * - Loaded from a YAML/JSON config file
   * - Updated via API or periodic refresh
   * - Versioned with effective dates
   * - Support for regional pricing variations
   */
  private static readonly PRICING: Record<string, { input: number; output: number }> = {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  };

  constructor(config: AnthropicConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 2,
    });
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.defaultModel || 'claude-3-5-haiku-20241022';

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.userPrompt,
          },
        ],
      });

      const duration = Date.now() - startTime;

      // Extract text content
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('\n');

      // Calculate cost
      const usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      const cost = this.calculateCost(model, usage.inputTokens, usage.outputTokens);

      return {
        content,
        usage,
        provider: this.name,
        model,
        cost,
        duration,
        rawResponse: response,
      };
    } catch (error: any) {
      // Handle Anthropic-specific errors
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after']
          ? parseInt(error.headers['retry-after'], 10)
          : undefined;
        throw new RateLimitError(this.name, retryAfter);
      }

      if (error.status === 401 || error.status === 403) {
        throw new ProviderError(
          'Authentication failed. Check your Anthropic API key.',
          this.name,
          error
        );
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ProviderUnavailableError(this.name, error);
      }

      throw new ProviderError(
        `Anthropic API error: ${error.message}`,
        this.name,
        error
      );
    }
  }

  estimateCost(request: AIRequest, currency: Currency = 'EUR'): CostEstimate {
    const model = request.model || this.config.defaultModel || 'claude-3-5-haiku-20241022';

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

  async isAvailable(): Promise<boolean> {
    try {
      // Send a minimal request to check availability
      await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch (error: any) {
      // If it's an auth error, the service is available but credentials are wrong
      if (error.status === 401 || error.status === 403) {
        return true;
      }
      return false;
    }
  }

  supportedModels(): Model[] {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Most capable model for complex tasks',
        contextWindow: 200000,
        costPerMillionInputTokens: 3.00,
        costPerMillionOutputTokens: 15.00,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        description: 'Fast and cost-effective model',
        contextWindow: 200000,
        costPerMillionInputTokens: 0.80,
        costPerMillionOutputTokens: 4.00,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Previous flagship model (deprecated)',
        contextWindow: 200000,
        costPerMillionInputTokens: 15.00,
        costPerMillionOutputTokens: 75.00,
        deprecated: true,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        description: 'Previous mid-tier model (deprecated)',
        contextWindow: 200000,
        costPerMillionInputTokens: 3.00,
        costPerMillionOutputTokens: 15.00,
        deprecated: true,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Previous fast model (deprecated)',
        contextWindow: 200000,
        costPerMillionInputTokens: 0.25,
        costPerMillionOutputTokens: 1.25,
        deprecated: true,
      },
    ];
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const inputCost = this.calculateInputCost(model, inputTokens);
    const outputCost = this.calculateOutputCost(model, outputTokens);
    return inputCost + outputCost;
  }

  private calculateInputCost(model: string, tokens: number): number {
    const pricing = AnthropicProvider.PRICING[model];
    if (!pricing) {
      // Default to Haiku pricing if model unknown
      return (tokens / 1_000_000) * 0.80;
    }
    return (tokens / 1_000_000) * pricing.input;
  }

  private calculateOutputCost(model: string, tokens: number): number {
    const pricing = AnthropicProvider.PRICING[model];
    if (!pricing) {
      // Default to Haiku pricing if model unknown
      return (tokens / 1_000_000) * 4.00;
    }
    return (tokens / 1_000_000) * pricing.output;
  }
}
