/**
 * Base interfaces and types for AI provider abstraction layer
 *
 * This module defines the core contracts that all AI providers must implement,
 * enabling the system to work with multiple LLM providers (Anthropic, OpenAI,
 * Google Gemini, Azure OpenAI, Ollama) through a unified interface.
 */

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Standard request format sent to any AI provider
 */
export interface AIRequest {
  /** System prompt that defines the AI's role and context */
  systemPrompt: string;

  /** User prompt with the actual task/question */
  userPrompt: string;

  /** Optional model override (uses provider default if not specified) */
  model?: string;

  /** Maximum tokens to generate in response */
  maxTokens?: number;

  /** Temperature for response randomness (0.0 = deterministic, 1.0 = creative) */
  temperature?: number;

  /** Additional provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Standard response format returned by any AI provider
 */
export interface AIResponse {
  /** The generated text content */
  content: string;

  /** Token usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /** Provider that generated this response */
  provider: string;

  /** Model that generated this response */
  model: string;

  /** Cost in USD for this request */
  cost: number;

  /** Duration in milliseconds */
  duration: number;

  /** Optional raw response from provider (for debugging) */
  rawResponse?: any;
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

/**
 * Base interface that all AI providers must implement
 */
export interface AIProvider {
  /** Provider name (e.g., 'anthropic', 'openai', 'ollama') */
  readonly name: string;

  /** Provider type: online (API) or local (self-hosted) */
  readonly type: 'online' | 'local';

  /**
   * Send a message to the AI provider and get a response
   * @param request The AI request to send
   * @returns Promise resolving to the AI response
   * @throws Error if the request fails
   */
  sendMessage(request: AIRequest): Promise<AIResponse>;

  /**
   * Estimate the cost of a request before sending it
   * @param request The AI request to estimate
   * @param currency The currency to return costs in (default: EUR)
   * @returns Cost estimate with breakdown
   */
  estimateCost(request: AIRequest, currency?: Currency): CostEstimate;

  /**
   * Check if this provider is currently available
   * @returns Promise resolving to true if provider is reachable
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get list of models supported by this provider
   * @returns Array of supported models
   */
  supportedModels(): Model[];
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Information about a specific AI model
 */
export interface Model {
  /** Model identifier (e.g., 'claude-3-5-sonnet-20241022') */
  id: string;

  /** Human-readable model name */
  name: string;

  /** Model description */
  description?: string;

  /** Maximum context window in tokens */
  contextWindow?: number;

  /** Cost per million input tokens in USD */
  costPerMillionInputTokens?: number;

  /** Cost per million output tokens in USD */
  costPerMillionOutputTokens?: number;

  /** Whether this model is deprecated */
  deprecated?: boolean;
}

/**
 * Supported currencies for cost estimation
 */
export type Currency = 'USD' | 'EUR' | 'GBP';

/**
 * Cost estimate for an AI request
 */
export interface CostEstimate {
  /** Estimated cost in USD (base currency for all providers) */
  costUSD: number;

  /** Estimated cost in requested currency */
  cost: number;

  /** Currency for the cost field */
  currency: Currency;

  /** Exchange rate used for conversion (1 USD = X currency) */
  exchangeRate: number;

  /** Breakdown of cost calculation */
  breakdown?: {
    inputTokens: number;
    outputTokens: number;
    inputCostUSD: number;
    outputCostUSD: number;
    inputCost: number;
    outputCost: number;
  };
}

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

/**
 * Base configuration for any provider
 */
export interface ProviderConfig {
  /** Whether this provider is enabled */
  enabled: boolean;

  /** API key (for online providers) */
  apiKey?: string;

  /** API endpoint (for custom/local deployments) */
  endpoint?: string;

  /** Default model to use */
  defaultModel?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum retries on failure */
  maxRetries?: number;

  /** Additional provider-specific config */
  [key: string]: any;
}

/**
 * Configuration for Anthropic Claude provider
 */
export interface AnthropicConfig extends ProviderConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Default Claude model */
  defaultModel?: 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022' | 'claude-3-opus-20240229';

  /** API version */
  apiVersion?: string;
}

/**
 * Configuration for OpenAI provider
 */
export interface OpenAIConfig extends ProviderConfig {
  /** OpenAI API key */
  apiKey: string;

  /** Default GPT model */
  defaultModel?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

  /** Organization ID (optional) */
  organization?: string;
}

/**
 * Configuration for Azure OpenAI provider
 */
export interface AzureOpenAIConfig extends ProviderConfig {
  /** Azure OpenAI API key */
  apiKey: string;

  /** Azure endpoint URL */
  endpoint: string;

  /** Deployment name */
  deployment: string;

  /** API version */
  apiVersion?: string;
}

/**
 * Configuration for Google Gemini provider
 */
export interface GeminiConfig extends ProviderConfig {
  /** Google API key */
  apiKey: string;

  /** Default Gemini model */
  defaultModel?: 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-1.0-pro';
}

/**
 * Configuration for Ollama local provider
 */
export interface OllamaConfig extends ProviderConfig {
  /** Ollama endpoint (default: http://localhost:11434) */
  endpoint?: string;

  /** Default local model */
  defaultModel?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Base error class for provider-related errors
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Error thrown when provider is unavailable
 */
export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, originalError?: Error) {
    super(`Provider ${provider} is unavailable`, provider, originalError);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Error thrown when API rate limit is exceeded
 */
export class RateLimitError extends ProviderError {
  constructor(
    provider: string,
    public readonly retryAfter?: number
  ) {
    super(`Rate limit exceeded for provider ${provider}`, provider);
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when request fails validation
 */
export class ValidationError extends ProviderError {
  constructor(
    provider: string,
    public readonly field: string,
    message: string
  ) {
    super(`Validation error in ${field}: ${message}`, provider);
    this.name = 'ValidationError';
  }
}
