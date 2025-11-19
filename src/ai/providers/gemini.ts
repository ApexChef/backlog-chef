/**
 * Google Gemini provider implementation
 *
 * Supports Gemini 1.5 Pro (1M token context) and Gemini 1.5 Flash models.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  AIRequest,
  AIResponse,
  CostEstimate,
  Model,
  Currency,
  GeminiConfig,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
} from './base';
import { convertFromUSD, getExchangeRate } from '../utils/currency-converter';

/**
 * Google Gemini provider adapter
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly type = 'online' as const;

  private client: GoogleGenerativeAI;
  private config: GeminiConfig;

  // Pricing per million tokens (as of January 2025)
  private static readonly PRICING: Record<string, { input: number; output: number }> = {
    'gemini-1.5-pro': { input: 3.50, output: 10.50 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.0-pro': { input: 0.50, output: 1.50 },
  };

  constructor(config: GeminiConfig) {
    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const modelName = request.model || this.config.defaultModel || 'gemini-1.5-flash';

    try {
      const model = this.client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: request.maxTokens || 4096,
          temperature: request.temperature ?? 0.7,
        },
      });

      // Gemini uses a different prompt format - combine system and user prompts
      const combinedPrompt = `${request.systemPrompt}\n\n${request.userPrompt}`;

      const result = await model.generateContent(combinedPrompt);
      const duration = Date.now() - startTime;

      // Extract response
      const response = result.response;
      const content = response.text();

      // Extract usage metrics (if available)
      const usageMetadata = response.usageMetadata;
      const usage = {
        inputTokens: usageMetadata?.promptTokenCount || 0,
        outputTokens: usageMetadata?.candidatesTokenCount || 0,
        totalTokens: usageMetadata?.totalTokenCount || 0,
      };

      const cost = this.calculateCost(modelName, usage.inputTokens, usage.outputTokens);

      return {
        content,
        usage,
        provider: this.name,
        model: modelName,
        cost,
        duration,
        rawResponse: response,
      };
    } catch (error: any) {
      // Handle Gemini-specific errors
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        throw new RateLimitError(this.name);
      }

      if (error.message?.includes('401') || error.message?.includes('API key')) {
        throw new ProviderError(
          'Authentication failed. Check your Google API key.',
          this.name,
          error
        );
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ProviderUnavailableError(this.name, error);
      }

      throw new ProviderError(`Gemini API error: ${error.message}`, this.name, error);
    }
  }

  estimateCost(request: AIRequest, currency: Currency = 'EUR'): CostEstimate {
    const model = request.model || this.config.defaultModel || 'gemini-1.5-flash';

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
      // Make a minimal request to check availability
      const model = this.client.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });

      await model.generateContent('ping');
      return true;
    } catch (error: any) {
      // If it's an auth error, the service is available but credentials are wrong
      if (error.message?.includes('401') || error.message?.includes('API key')) {
        return true;
      }
      return false;
    }
  }

  supportedModels(): Model[] {
    return [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable model with 1M token context window',
        contextWindow: 1000000,
        costPerMillionInputTokens: 3.50,
        costPerMillionOutputTokens: 10.50,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model with large context',
        contextWindow: 1000000,
        costPerMillionInputTokens: 0.075,
        costPerMillionOutputTokens: 0.30,
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        description: 'Legacy Gemini model',
        contextWindow: 32000,
        costPerMillionInputTokens: 0.50,
        costPerMillionOutputTokens: 1.50,
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
    const pricing = GeminiProvider.PRICING[model];
    if (!pricing) {
      // Default to Flash pricing if model unknown
      return (tokens / 1_000_000) * 0.075;
    }
    return (tokens / 1_000_000) * pricing.input;
  }

  private calculateOutputCost(model: string, tokens: number): number {
    const pricing = GeminiProvider.PRICING[model];
    if (!pricing) {
      // Default to Flash pricing if model unknown
      return (tokens / 1_000_000) * 0.30;
    }
    return (tokens / 1_000_000) * pricing.output;
  }
}
