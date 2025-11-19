/**
 * Ollama local model provider implementation
 *
 * Supports running local models like Llama 3.2, Mistral, Qwen, etc.
 * Uses Ollama's OpenAI-compatible API endpoint.
 */

import {
  AIRequest,
  AIResponse,
  Model,
  OllamaConfig,
  ProviderError,
  ProviderUnavailableError,
} from './base';
import { BaseLocalProvider } from './base-provider';

/**
 * Response format from Ollama's OpenAI-compatible chat completion endpoint
 */
interface OllamaChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Response format from Ollama's tags endpoint (list models)
 */
interface OllamaTagsResponse {
  models: Array<{
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
      parent_model?: string;
      format?: string;
      family?: string;
      families?: string[];
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
}

/**
 * Ollama local provider adapter
 */
export class OllamaProvider extends BaseLocalProvider {
  readonly name = 'ollama';

  private endpoint: string;

  protected getDefaultModel(): string {
    return 'llama3.2:latest';
  }

  constructor(config: OllamaConfig) {
    super(config);
    this.endpoint = config.endpoint || 'http://localhost:11434';
  }

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.defaultModel || this.getDefaultModel();

    try {
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}: ${response.statusText}`);
      }

      const data: OllamaChatCompletionResponse = await response.json();
      const duration = Date.now() - startTime;

      // Extract content from first choice
      const content = data.choices[0]?.message?.content || '';

      // Extract usage
      const usage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      };

      // Local models are free
      const cost = 0;

      return {
        content,
        usage,
        provider: this.name,
        model,
        cost,
        duration,
        rawResponse: data,
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ProviderUnavailableError(
          this.name,
          new Error(`Ollama is not running at ${this.endpoint}. Start it with: ollama serve`)
        );
      }

      throw new ProviderError(`Ollama API error: ${error.message}`, this.name, error);
    }
  }

  // estimateCost is inherited from BaseLocalProvider (always returns 0 cost)

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  supportedModels(): Model[] {
    // These are common Ollama models, but we'll also fetch installed models dynamically
    return [
      {
        id: 'llama3.2:latest',
        name: 'Llama 3.2 Latest',
        description: 'Latest Llama 3.2 model from Meta',
        contextWindow: 128000,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
      {
        id: 'llama3.1:latest',
        name: 'Llama 3.1 Latest',
        description: 'Llama 3.1 model from Meta',
        contextWindow: 128000,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
      {
        id: 'mistral:latest',
        name: 'Mistral Latest',
        description: 'Mistral 7B model',
        contextWindow: 32000,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
      {
        id: 'mixtral:latest',
        name: 'Mixtral Latest',
        description: 'Mixtral 8x7B mixture of experts',
        contextWindow: 32000,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
      {
        id: 'qwen2.5:latest',
        name: 'Qwen 2.5 Latest',
        description: 'Alibaba Qwen 2.5 model',
        contextWindow: 128000,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
      {
        id: 'phi3:latest',
        name: 'Phi-3 Latest',
        description: 'Microsoft Phi-3 small model',
        contextWindow: 128000,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
      {
        id: 'gemma2:latest',
        name: 'Gemma 2 Latest',
        description: 'Google Gemma 2 model',
        contextWindow: 8192,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
      {
        id: 'deepseek-coder:latest',
        name: 'DeepSeek Coder Latest',
        description: 'Code-specialized model',
        contextWindow: 16000,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
      {
        id: 'codellama:latest',
        name: 'Code Llama Latest',
        description: 'Meta Code Llama for coding tasks',
        contextWindow: 16000,
        costPerMillionInputTokens: 0,
        costPerMillionOutputTokens: 0,
      },
    ];
  }

  /**
   * Get list of models actually installed in Ollama
   * @returns Promise resolving to array of installed model names
   */
  async getInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        return [];
      }

      const data: OllamaTagsResponse = await response.json();
      return data.models.map((model) => model.name);
    } catch {
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   * @param modelName Name of the model to pull (e.g., 'llama3.2:latest')
   * @returns Promise that resolves when pull is complete
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      // Ollama returns streaming JSON responses during pull
      // For now, we'll just wait for the request to complete
      // In production, you might want to stream progress updates
      await response.text();
    } catch (error: any) {
      throw new ProviderError(
        `Failed to pull Ollama model ${modelName}: ${error.message}`,
        this.name,
        error
      );
    }
  }
}
