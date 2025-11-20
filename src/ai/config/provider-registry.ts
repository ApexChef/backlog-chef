/**
 * Provider Registry - Factory for initializing AI providers
 *
 * Creates and manages AI provider instances based on environment configuration
 */

import {
  AIProvider,
  AnthropicProvider,
  OpenAIProvider,
  AzureOpenAIProvider,
  GeminiProvider,
  OllamaProvider,
  AnthropicConfig,
  OpenAIConfig,
  AzureOpenAIConfig,
  GeminiConfig,
  OllamaConfig,
} from '../providers';

/**
 * Provider registry configuration
 */
export interface ProviderRegistryConfig {
  anthropic?: Partial<AnthropicConfig>;
  openai?: Partial<OpenAIConfig>;
  azureOpenai?: Partial<AzureOpenAIConfig>;
  gemini?: Partial<GeminiConfig>;
  ollama?: Partial<OllamaConfig>;
}

/**
 * Provider registry class
 */
export class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  /**
   * Initialize providers from environment variables and config
   * @param config Optional provider configuration overrides
   */
  initialize(config: ProviderRegistryConfig = {}): Map<string, AIProvider> {
    // Initialize Anthropic (Claude)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropicProvider = new AnthropicProvider({
          enabled: true,
          apiKey: process.env.ANTHROPIC_API_KEY,
          defaultModel: 'claude-3-5-haiku-20241022',
          ...config.anthropic,
        });
        this.providers.set('anthropic', anthropicProvider);
        console.log('[ProviderRegistry] ✓ Initialized: Anthropic Claude');
      } catch (error) {
        console.warn('[ProviderRegistry] ⚠ Failed to initialize Anthropic:', (error as Error).message);
      }
    }

    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiProvider = new OpenAIProvider({
          enabled: true,
          apiKey: process.env.OPENAI_API_KEY,
          defaultModel: 'gpt-4o-mini',
          ...config.openai,
        });
        this.providers.set('openai', openaiProvider);
        console.log('[ProviderRegistry] ✓ Initialized: OpenAI');
      } catch (error) {
        console.warn('[ProviderRegistry] ⚠ Failed to initialize OpenAI:', (error as Error).message);
      }
    }

    // Initialize Azure OpenAI
    if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
      try {
        const azureProvider = new AzureOpenAIProvider({
          enabled: true,
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
          defaultModel: 'gpt-4o-mini',
          ...config.azureOpenai,
        });
        this.providers.set('azure-openai', azureProvider);
        console.log('[ProviderRegistry] ✓ Initialized: Azure OpenAI');
      } catch (error) {
        console.warn('[ProviderRegistry] ⚠ Failed to initialize Azure OpenAI:', (error as Error).message);
      }
    }

    // Initialize Google Gemini
    if (process.env.GOOGLE_API_KEY) {
      try {
        const geminiProvider = new GeminiProvider({
          enabled: true,
          apiKey: process.env.GOOGLE_API_KEY,
          defaultModel: 'gemini-1.5-flash',
          ...config.gemini,
        });
        this.providers.set('gemini', geminiProvider);
        console.log('[ProviderRegistry] ✓ Initialized: Google Gemini');
      } catch (error) {
        console.warn('[ProviderRegistry] ⚠ Failed to initialize Gemini:', (error as Error).message);
      }
    }

    // Initialize Ollama (always available, assumes local server)
    try {
      const ollamaProvider = new OllamaProvider({
        enabled: true,
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        defaultModel: 'llama3.2:latest',
        ...config.ollama,
      });
      this.providers.set('ollama', ollamaProvider);
      console.log('[ProviderRegistry] ✓ Initialized: Ollama (local)');
    } catch (error) {
      console.warn('[ProviderRegistry] ⚠ Failed to initialize Ollama:', (error as Error).message);
    }

    // Summary
    console.log(`[ProviderRegistry] Total providers initialized: ${this.providers.size}`);

    if (this.providers.size === 0) {
      throw new Error(
        'No AI providers initialized! Set at least one API key:\n' +
          '  - ANTHROPIC_API_KEY for Claude\n' +
          '  - OPENAI_API_KEY for OpenAI\n' +
          '  - GOOGLE_API_KEY for Gemini\n' +
          '  - Or ensure Ollama is running locally'
      );
    }

    return this.providers;
  }

  /**
   * Get a specific provider by name
   * @param name Provider name
   * @returns Provider instance or undefined
   */
  get(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all initialized providers
   * @returns Map of provider name to provider instance
   */
  getAll(): Map<string, AIProvider> {
    return this.providers;
  }

  /**
   * Get list of available provider names
   * @returns Array of provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a specific provider is available
   * @param name Provider name
   * @returns true if provider is initialized
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Test availability of all providers
   * @returns Map of provider name to availability status
   */
  async testAvailability(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        const available = await provider.isAvailable();
        results.set(name, available);
        console.log(`[ProviderRegistry] ${name}: ${available ? '✓ Available' : '✗ Unavailable'}`);
      } catch (error) {
        results.set(name, false);
        console.log(`[ProviderRegistry] ${name}: ✗ Error - ${(error as Error).message}`);
      }
    }

    return results;
  }
}

/**
 * Create and initialize provider registry
 * @param config Optional provider configuration
 * @returns Initialized provider registry
 */
export function createProviderRegistry(config?: ProviderRegistryConfig): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.initialize(config);
  return registry;
}
