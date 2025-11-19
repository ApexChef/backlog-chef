/**
 * Google Gemini provider implementation
 *
 * Supports Gemini 1.5 Pro (1M token context) and Gemini 1.5 Flash models.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIRequest,
  AIResponse,
  Model,
  GeminiConfig,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
} from './base';
import { BaseAIProvider, ModelPricing } from './base-provider';

/**
 * Google Gemini provider adapter
 */
export class GeminiProvider extends BaseAIProvider {
  readonly name = 'gemini';
  readonly type = 'online' as const;

  private client: GoogleGenerativeAI;

  protected getPricing(): Record<string, ModelPricing> {
    return {
      'gemini-1.5-pro': { input: 3.5, output: 10.5 },
      'gemini-1.5-flash': { input: 0.075, output: 0.3 },
      'gemini-1.0-pro': { input: 0.5, output: 1.5 },
    };
  }

  protected getDefaultModel(): string {
    return 'gemini-1.5-flash';
  }

  constructor(config: GeminiConfig) {
    super(config);
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const modelName = request.model || this.config.defaultModel || this.getDefaultModel();

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
        costPerMillionInputTokens: 3.5,
        costPerMillionOutputTokens: 10.5,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model with large context',
        contextWindow: 1000000,
        costPerMillionInputTokens: 0.075,
        costPerMillionOutputTokens: 0.3,
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        description: 'Legacy Gemini model',
        contextWindow: 32000,
        costPerMillionInputTokens: 0.5,
        costPerMillionOutputTokens: 1.5,
        deprecated: true,
      },
    ];
  }
}
