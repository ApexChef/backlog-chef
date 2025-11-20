# AI Provider Abstraction Layer

Multi-provider AI system with intelligent routing, fallback strategies, and cost tracking.

## Overview

This module provides a unified interface for working with multiple AI providers (Anthropic Claude, OpenAI, Azure OpenAI, Google Gemini, and local Ollama models). It enables per-pipeline-step model selection, automatic fallback, and comprehensive cost tracking in multiple currencies.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Backlog Chef Pipeline                     │
│                  (Step 1...Step 8)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Model Router                                │
│  • Per-step model configuration                             │
│  • Fallback strategy management                             │
│  • Cost tracking & limits                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│Anthropic │    │ OpenAI   │    │  Ollama  │
│ Provider │    │ Provider │    │ Provider │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Claude   │    │ OpenAI   │    │  Local   │
│   API    │    │   API    │    │  Models  │
└──────────┘    └──────────┘    └──────────┘
```

## Implemented Providers

### 1. **Anthropic Claude** (`anthropic.ts`)
- ✅ Claude 3.5 Sonnet (most capable)
- ✅ Claude 3.5 Haiku (fast, cost-effective) - **DEFAULT**
- ✅ Claude 3 Opus (deprecated)
- **Default for:** Complex analysis, proposals, risk checking

### 2. **OpenAI** (`openai.ts`)
- ✅ GPT-4o (multimodal flagship)
- ✅ GPT-4o-mini (fast & affordable)
- ✅ GPT-4 Turbo (large context)
- ✅ GPT-3.5 Turbo (legacy)
- **Default for:** Creative tasks, variety

### 3. **Azure OpenAI** (`azure-openai.ts`)
- ✅ Same models as OpenAI
- ✅ Enterprise security & compliance
- ✅ VNet support
- **Default for:** Enterprise deployments

### 4. **Google Gemini** (`gemini.ts`)
- ✅ Gemini 1.5 Pro (1M token context!)
- ✅ Gemini 1.5 Flash (fast & efficient)
- ✅ Gemini 1.0 Pro (deprecated)
- **Default for:** Long documents, massive context

### 5. **Ollama** (`ollama.ts`)
- ✅ Llama 3.2 (Meta)
- ✅ Mistral, Mixtral
- ✅ Qwen 2.5 (Alibaba)
- ✅ Phi-3 (Microsoft)
- ✅ Gemma 2 (Google)
- ✅ DeepSeek-Coder, Code Llama
- **Default for:** Offline mode, privacy, $0 cost

## Key Features

### ✅ Multi-Currency Support

All cost estimates support EUR (default), USD, and GBP:

```typescript
const estimate = provider.estimateCost(request, 'EUR');
// Returns: { costUSD: 0.0012, cost: 0.0011, currency: 'EUR', exchangeRate: 0.92 }
```

**Supported Currencies:**
- `EUR` - Euro (default for European users) - 1 USD ≈ 0.92 EUR
- `USD` - US Dollar (base currency for all providers)
- `GBP` - British Pound - 1 USD ≈ 0.79 GBP

### ✅ Unified Interface

All providers implement the same `AIProvider` interface:

```typescript
interface AIProvider {
  sendMessage(request: AIRequest): Promise<AIResponse>;
  estimateCost(request: AIRequest, currency?: Currency): CostEstimate;
  isAvailable(): Promise<boolean>;
  supportedModels(): Model[];
}
```

### ✅ Error Handling

Specialized error types for different failure scenarios:

- `ProviderUnavailableError` - Service is down
- `RateLimitError` - API rate limit exceeded
- `ValidationError` - Request validation failed
- `ProviderError` - General provider error

### ✅ Cost Tracking

Every API call returns detailed cost information:

```typescript
{
  costUSD: 0.0012,           // Cost in USD
  cost: 0.0011,              // Cost in requested currency
  currency: 'EUR',           // Currency used
  exchangeRate: 0.92,        // Exchange rate applied
  breakdown: {
    inputTokens: 150,
    outputTokens: 400,
    inputCostUSD: 0.0003,
    outputCostUSD: 0.0009,
    inputCost: 0.00028,      // In EUR
    outputCost: 0.00083      // In EUR
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { AnthropicProvider } from './providers';

const provider = new AnthropicProvider({
  enabled: true,
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultModel: 'claude-3-5-haiku-20241022'
});

const response = await provider.sendMessage({
  systemPrompt: 'You are a helpful assistant.',
  userPrompt: 'Explain quantum computing',
  maxTokens: 1000,
  temperature: 0.7
});

console.log(`Response: ${response.content}`);
console.log(`Cost: €${response.cost.toFixed(6)}`);
```

### Cost Estimation (Before Sending)

```typescript
const estimate = provider.estimateCost({
  systemPrompt: 'System prompt...',
  userPrompt: 'User prompt...',
  maxTokens: 2000
}, 'EUR');

console.log(`Estimated cost: €${estimate.cost.toFixed(6)}`);
console.log(`Exchange rate: 1 USD = ${estimate.exchangeRate} EUR`);
```

### Checking Availability

```typescript
if (await provider.isAvailable()) {
  // Provider is reachable
  const response = await provider.sendMessage(request);
} else {
  // Use fallback provider
}
```

### Local Models (Ollama)

```typescript
import { OllamaProvider } from './providers';

const localProvider = new OllamaProvider({
  enabled: true,
  endpoint: 'http://localhost:11434',
  defaultModel: 'llama3.2:latest'
});

// Check installed models
const installedModels = await localProvider.getInstalledModels();
console.log('Installed:', installedModels);

// Pull a new model
await localProvider.pullModel('mistral:latest');

// Use it (completely free!)
const response = await localProvider.sendMessage(request);
console.log(`Cost: €${response.cost} (always 0 for local)`);
```

## Configuration Files

Configuration will be defined in YAML (see router README for details):

```yaml
# config/model-config.yaml
defaults:
  provider: anthropic
  model: claude-3-5-haiku-20241022
  currency: EUR  # Default currency for cost tracking

steps:
  score_confidence:
    provider: anthropic
    model: claude-3-5-sonnet-20241022

  enrich_with_context:
    provider: openai
    model: gpt-4o

fallback:
  enabled: true
  strategy: cascade
  providers:
    - { provider: anthropic, model: claude-3-5-haiku-20241022 }
    - { provider: openai, model: gpt-4o-mini }
    - { provider: ollama, model: llama3.2:latest }
```

## Future Improvements

### TODO (MVP Phase)
- [ ] Implement ModelRouter with fallback strategies
- [ ] Create configuration schema and validator
- [ ] Add cost tracking system with daily/per-run limits
- [ ] Create provider registry/factory

### TODO (Post-MVP)
- [ ] **Externalize pricing data** - Move hardcoded pricing to config files
- [ ] **Live exchange rates** - Integrate with exchangerate-api.com or ECB
- [ ] **Pricing versioning** - Track pricing changes over time
- [ ] **Regional pricing** - Support Azure regional price variations
- [ ] **Streaming responses** - Support streaming for real-time UX
- [ ] **Caching** - Cache responses for identical requests
- [ ] **Retry logic** - Exponential backoff for transient failures

## Provider Pricing (January 2025)

| Provider | Model | Input (per 1M tokens) | Output (per 1M tokens) |
|----------|-------|----------------------|----------------------|
| **Anthropic** | Claude 3.5 Haiku | $0.80 | $4.00 |
| **Anthropic** | Claude 3.5 Sonnet | $3.00 | $15.00 |
| **OpenAI** | GPT-4o-mini | $0.15 | $0.60 |
| **OpenAI** | GPT-4o | $2.50 | $10.00 |
| **Gemini** | 1.5 Flash | $0.075 | $0.30 |
| **Gemini** | 1.5 Pro | $3.50 | $10.50 |
| **Ollama** | All models | $0.00 | $0.00 |

**Note:** Pricing is hardcoded for MVP. Future versions will load from external config.

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.32.0",
  "openai": "^4.80.0",
  "@google/generative-ai": "^0.21.0"
}
```

## License

Proprietary - Backlog Chef
