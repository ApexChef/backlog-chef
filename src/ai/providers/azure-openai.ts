/**
 * Azure OpenAI Service provider implementation
 *
 * Enterprise-grade OpenAI models hosted on Azure with enhanced security,
 * compliance, and VNet support.
 */

import { AzureOpenAI } from 'openai';
import {
  AIRequest,
  AIResponse,
  Model,
  AzureOpenAIConfig,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
} from './base';
import { BaseAIProvider, ModelPricing } from './base-provider';

/**
 * Azure OpenAI provider adapter
 */
export class AzureOpenAIProvider extends BaseAIProvider {
  readonly name = 'azure-openai';
  readonly type = 'online' as const;

  private client: AzureOpenAI;

  // Pricing is similar to OpenAI but may vary by Azure region
  // These are approximate US East prices
  protected getPricing(): Record<string, ModelPricing> {
    return {
      'gpt-4o': { input: 2.5, output: 10.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      'gpt-4': { input: 30.0, output: 60.0 },
      'gpt-35-turbo': { input: 0.5, output: 1.5 }, // Azure uses gpt-35-turbo instead of gpt-3.5-turbo
    };
  }

  protected getDefaultModel(): string {
    return 'gpt-4o-mini';
  }

  constructor(config: AzureOpenAIConfig) {
    super(config);
    this.client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion || '2024-08-01-preview',
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 2,
    });
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    // Azure uses deployment name instead of model name
    const deployment = (this.config as AzureOpenAIConfig).deployment;

    try {
      const response = await this.client.chat.completions.create({
        model: deployment, // In Azure, this is the deployment name
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

      // Use the model from request or config for pricing
      const model = request.model || this.config.defaultModel || this.getDefaultModel();
      const cost = this.calculateCost(model, usage.inputTokens, usage.outputTokens);

      return {
        content,
        usage,
        provider: this.name,
        model: `${deployment} (${model})`,
        cost,
        duration,
        rawResponse: response,
      };
    } catch (error: any) {
      // Handle Azure-specific errors
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after']
          ? parseInt(error.headers['retry-after'], 10)
          : undefined;
        throw new RateLimitError(this.name, retryAfter);
      }

      if (error.status === 401 || error.status === 403) {
        throw new ProviderError(
          'Authentication failed. Check your Azure OpenAI API key and endpoint.',
          this.name,
          error
        );
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ProviderUnavailableError(this.name, error);
      }

      throw new ProviderError(
        `Azure OpenAI API error: ${error.message}`,
        this.name,
        error
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Make a minimal request to check availability
      const deployment = (this.config as AzureOpenAIConfig).deployment;
      await this.client.chat.completions.create({
        model: deployment,
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
    // Note: Azure requires deploying models before use
    // These are the available base models
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Azure)',
        description: 'Latest multimodal flagship model on Azure',
        contextWindow: 128000,
        costPerMillionInputTokens: 2.5,
        costPerMillionOutputTokens: 10.0,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini (Azure)',
        description: 'Fast and affordable model on Azure',
        contextWindow: 128000,
        costPerMillionInputTokens: 0.15,
        costPerMillionOutputTokens: 0.6,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo (Azure)',
        description: 'High-capability model with large context',
        contextWindow: 128000,
        costPerMillionInputTokens: 10.0,
        costPerMillionOutputTokens: 30.0,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4 (Azure)',
        description: 'Original GPT-4 model on Azure',
        contextWindow: 8192,
        costPerMillionInputTokens: 30.0,
        costPerMillionOutputTokens: 60.0,
      },
      {
        id: 'gpt-35-turbo',
        name: 'GPT-3.5 Turbo (Azure)',
        description: 'Fast and cost-effective legacy model',
        contextWindow: 16385,
        costPerMillionInputTokens: 0.5,
        costPerMillionOutputTokens: 1.5,
      },
    ];
  }
}
