/**
 * OpenAI GPT provider implementation
 *
 * Supports GPT-4o, GPT-4o-mini, GPT-4 Turbo, and GPT-3.5 Turbo models.
 */

import OpenAI from 'openai';
import {
  AIProvider,
  AIRequest,
  AIResponse,
  CostEstimate,
  Model,
  Currency,
  OpenAIConfig,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
} from './base';
import { convertFromUSD, getExchangeRate } from '../utils/currency-converter';

/**
 * OpenAI GPT provider adapter
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly type = 'online' as const;

  private client: OpenAI;
  private config: OpenAIConfig;

  // Pricing per million tokens (as of January 2025)
  private static readonly PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
  };

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 2,
    });
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.defaultModel || 'gpt-4o-mini';

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        messages: [
          {
            role: 'system',
            content: request.systemPrompt,
          },
          {
            role: 'user',
            content: request.userPrompt,
          },
        ],
      });

      const duration = Date.now() - startTime;

      // Extract content from first choice
      const content = response.choices[0]?.message?.content || '';

      // Calculate usage and cost
      const usage = {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
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
      // Handle OpenAI-specific errors
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after-ms']
          ? parseInt(error.headers['retry-after-ms'], 10) / 1000
          : undefined;
        throw new RateLimitError(this.name, retryAfter);
      }

      if (error.status === 401 || error.status === 403) {
        throw new ProviderError(
          'Authentication failed. Check your OpenAI API key.',
          this.name,
          error
        );
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ProviderUnavailableError(this.name, error);
      }

      throw new ProviderError(`OpenAI API error: ${error.message}`, this.name, error);
    }
  }

  estimateCost(request: AIRequest, currency: Currency = 'EUR'): CostEstimate {
    const model = request.model || this.config.defaultModel || 'gpt-4o-mini';

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
      // List models to check if API is accessible
      await this.client.models.list();
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
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Latest multimodal flagship model',
        contextWindow: 128000,
        costPerMillionInputTokens: 2.50,
        costPerMillionOutputTokens: 10.00,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable model',
        contextWindow: 128000,
        costPerMillionInputTokens: 0.15,
        costPerMillionOutputTokens: 0.60,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'High-capability model with large context',
        contextWindow: 128000,
        costPerMillionInputTokens: 10.00,
        costPerMillionOutputTokens: 30.00,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Original GPT-4 model',
        contextWindow: 8192,
        costPerMillionInputTokens: 30.00,
        costPerMillionOutputTokens: 60.00,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective legacy model',
        contextWindow: 16385,
        costPerMillionInputTokens: 0.50,
        costPerMillionOutputTokens: 1.50,
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
    const pricing = OpenAIProvider.PRICING[model];
    if (!pricing) {
      // Default to GPT-4o-mini pricing if model unknown
      return (tokens / 1_000_000) * 0.15;
    }
    return (tokens / 1_000_000) * pricing.input;
  }

  private calculateOutputCost(model: string, tokens: number): number {
    const pricing = OpenAIProvider.PRICING[model];
    if (!pricing) {
      // Default to GPT-4o-mini pricing if model unknown
      return (tokens / 1_000_000) * 0.60;
    }
    return (tokens / 1_000_000) * pricing.output;
  }
}
