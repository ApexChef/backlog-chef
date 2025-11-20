# PACT Architect Phase: Multi-Agent AI System

## Overview

This document outlines the architecture for Backlog Chef's production implementation with support for multiple AI providers (online and local) with per-pipeline-step model selection and intelligent fallback strategies.

## Requirements Summary

Based on user selections from `tasks/fase-02.md`:

### Supported AI Providers

**Priority 1 - Must Have:**
- ✅ Anthropic Claude (3.5 Sonnet, 3.5 Haiku)
- ✅ OpenAI GPT-4/GPT-3.5
- ✅ Ollama (local models)
- ✅ Azure OpenAI

**Priority 2 - Should Have:**
- ✅ Google Gemini

**Future Considerations:**
- Mistral API
- Cohere
- LM Studio
- LocalAI
- vLLM/TGI

### Key Architectural Requirements

1. **Per-Step Model Selection**: Each pipeline step can use a different model
2. **Default Configuration**: Pipeline-level defaults with step-level overrides
3. **Fallback Strategy**: Automatic fallback to alternative models on failure
4. **Local-First Option**: Support for fully offline mode using local models
5. **Cost Optimization**: Model selection based on task complexity (via config)

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Backlog Chef Pipeline                    │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Step 1  │→ │  Step 2  │→ │  Step 3  │→ │  Step N  │    │
│  │ Detection│  │ Extract  │  │  Score   │  │  Output  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │            │
│       └─────────────┴─────────────┴─────────────┘            │
│                         │                                     │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Provider Abstraction Layer                   │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │           Model Router & Selector                  │     │
│  │  • Per-step model configuration                    │     │
│  │  • Fallback strategy management                    │     │
│  │  • Cost tracking & optimization                    │     │
│  │  • Request/response transformation                 │     │
│  └────────────┬───────────────────────────────────────┘     │
│               │                                              │
│       ┌───────┴────────┬─────────┬─────────┬─────────┐     │
│       │                │         │         │         │      │
│       ▼                ▼         ▼         ▼         ▼      │
│  ┌─────────┐    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────┐│
│  │Anthropic│    │ OpenAI  │ │  Azure  │ │ Gemini  │ │... ││
│  │Adapter  │    │ Adapter │ │ Adapter │ │ Adapter │ │    ││
│  └────┬────┘    └────┬────┘ └────┬────┘ └────┬────┘ └──┬─┘│
│       │              │           │           │          │   │
└───────┼──────────────┼───────────┼───────────┼──────────┼───┘
        │              │           │           │          │
        ▼              ▼           ▼           ▼          ▼
┌──────────┐    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐
│ Claude   │    │ OpenAI   │ │  Azure   │ │  Gemini  │ │ Ollama │
│   API    │    │   API    │ │ OpenAI   │ │   API    │ │ Local  │
└──────────┘    └──────────┘ └──────────┘ └──────────┘ └────────┘
```

---

## Core Components

### 1. AI Provider Abstraction Layer

**Purpose**: Unified interface for all AI providers, abstracting provider-specific details.

**Key Classes**:

```typescript
// Base interface all providers must implement
interface AIProvider {
  name: string;
  type: 'online' | 'local';
  sendMessage(request: AIRequest): Promise<AIResponse>;
  estimateCost(request: AIRequest): CostEstimate;
  isAvailable(): Promise<boolean>;
  supportedModels(): Model[];
}

// Request/Response types
interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, any>;
}

interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
  cost: number;
  duration: number;
}
```

**Implementations**:
- `AnthropicProvider` - Claude API integration
- `OpenAIProvider` - OpenAI API integration
- `AzureOpenAIProvider` - Azure OpenAI Service
- `GeminiProvider` - Google Gemini API
- `OllamaProvider` - Local Ollama models

---

### 2. Model Router & Selector

**Purpose**: Intelligent routing of requests to appropriate models based on configuration and availability.

**Responsibilities**:
1. Load pipeline configuration (default + per-step overrides)
2. Select appropriate model for each step
3. Handle fallback when primary model fails
4. Track costs and usage
5. Transform requests/responses between formats

**Configuration Schema**:

```yaml
# config/model-config.yaml

# Global defaults
defaults:
  provider: anthropic
  model: claude-3-5-haiku-20241022
  temperature: 0.7
  maxTokens: 4096

# Fallback strategy
fallback:
  enabled: true
  strategy: cascade  # cascade | round-robin | cheapest
  providers:
    - provider: anthropic
      model: claude-3-5-haiku-20241022
    - provider: openai
      model: gpt-4o-mini
    - provider: ollama
      model: llama3.2:latest

# Per-step overrides
steps:
  extract_candidates:
    provider: anthropic
    model: claude-3-5-haiku-20241022
    reason: "Fast extraction, cost-effective"

  score_confidence:
    provider: anthropic
    model: claude-3-5-sonnet-20241022
    reason: "Complex analysis requires more capable model"

  enrich_with_context:
    provider: openai
    model: gpt-4o
    reason: "Good at semantic search and context"

  check_risks:
    provider: anthropic
    model: claude-3-5-sonnet-20241022
    reason: "Critical analysis step"

  generate_proposals:
    provider: anthropic
    model: claude-3-5-sonnet-20241022
    reason: "Creative proposal generation"

  readiness_checker:
    provider: anthropic
    model: claude-3-5-haiku-20241022
    reason: "Checklist evaluation, fast and efficient"

  final_output:
    provider: local  # No AI needed, just formatting
    model: none

# Local-first mode (offline)
offline_mode:
  enabled: false
  default_provider: ollama
  default_model: llama3.2:latest

# Cost limits
cost_management:
  daily_limit_usd: 10.00
  per_run_limit_usd: 1.00
  alert_threshold_usd: 0.50
```

---

### 3. Provider Adapters

Each provider has a dedicated adapter that implements the `AIProvider` interface.

#### AnthropicAdapter

```typescript
class AnthropicAdapter implements AIProvider {
  name = 'anthropic';
  type = 'online';

  constructor(private config: AnthropicConfig) {}

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    const client = new Anthropic({ apiKey: this.config.apiKey });

    const response = await client.messages.create({
      model: request.model || 'claude-3-5-haiku-20241022',
      max_tokens: request.maxTokens || 4096,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.userPrompt }]
    });

    return this.transformResponse(response);
  }

  estimateCost(request: AIRequest): CostEstimate {
    // Claude pricing logic
  }

  async isAvailable(): Promise<boolean> {
    // Health check
  }

  supportedModels(): Model[] {
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
    ];
  }
}
```

#### OllamaAdapter (Local)

```typescript
class OllamaAdapter implements AIProvider {
  name = 'ollama';
  type = 'local';

  async sendMessage(request: AIRequest): Promise<AIResponse> {
    // Use Ollama's OpenAI-compatible API
    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'llama3.2:latest',
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt }
        ]
      })
    });

    return this.transformResponse(await response.json());
  }

  estimateCost(): CostEstimate {
    return { cost: 0, currency: 'USD' }; // Local is free
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

### 4. Model Router Implementation

```typescript
class ModelRouter {
  private providers: Map<string, AIProvider>;
  private config: ModelConfig;
  private costTracker: CostTracker;

  constructor(config: ModelConfig) {
    this.config = config;
    this.providers = this.initializeProviders();
    this.costTracker = new CostTracker(config.cost_management);
  }

  async route(step: string, request: AIRequest): Promise<AIResponse> {
    // Get step configuration
    const stepConfig = this.config.steps[step] || this.config.defaults;

    // Select provider
    const provider = this.getProvider(stepConfig.provider);

    // Check availability
    if (!await provider.isAvailable()) {
      return this.handleFallback(step, request);
    }

    // Check cost limits
    const estimatedCost = provider.estimateCost(request);
    if (!this.costTracker.canAfford(estimatedCost)) {
      throw new Error('Cost limit exceeded');
    }

    // Send request
    try {
      const response = await provider.sendMessage({
        ...request,
        model: stepConfig.model
      });

      // Track cost
      this.costTracker.record(response);

      return response;
    } catch (error) {
      return this.handleFallback(step, request, error);
    }
  }

  private async handleFallback(
    step: string,
    request: AIRequest,
    error?: Error
  ): Promise<AIResponse> {
    if (!this.config.fallback.enabled) {
      throw error || new Error('Provider unavailable and fallback disabled');
    }

    for (const fallbackOption of this.config.fallback.providers) {
      const provider = this.getProvider(fallbackOption.provider);

      if (await provider.isAvailable()) {
        logInfo(`Falling back to ${fallbackOption.provider}/${fallbackOption.model}`);

        return provider.sendMessage({
          ...request,
          model: fallbackOption.model
        });
      }
    }

    throw new Error('All fallback providers unavailable');
  }
}
```

---

## Fallback Strategies

### 1. Cascade Strategy (Default)

Try providers in order until one succeeds:
```
Primary → Secondary → Tertiary → Local
```

**Example**:
```
Claude Haiku → GPT-4o-mini → Ollama Llama3.2
```

### 2. Round-Robin Strategy

Distribute load across providers:
```
Request 1 → Provider A
Request 2 → Provider B
Request 3 → Provider C
Request 4 → Provider A
```

### 3. Cheapest-First Strategy

Always try cheapest provider first:
```
Local (Ollama) → Haiku → GPT-4o-mini → Sonnet
```

---

## Configuration Examples

### Example 1: Cost-Optimized (Default)

```yaml
defaults:
  provider: anthropic
  model: claude-3-5-haiku-20241022

fallback:
  enabled: true
  strategy: cascade
  providers:
    - { provider: anthropic, model: claude-3-5-haiku-20241022 }
    - { provider: openai, model: gpt-4o-mini }
    - { provider: ollama, model: llama3.2:latest }
```

**Cost**: ~$0.01 per PBI
**Speed**: Fast (Haiku)
**Reliability**: High (3 fallbacks)

### Example 2: Quality-First

```yaml
defaults:
  provider: anthropic
  model: claude-3-5-sonnet-20241022

steps:
  score_confidence:
    provider: openai
    model: gpt-4o

  generate_proposals:
    provider: anthropic
    model: claude-3-5-sonnet-20241022
```

**Cost**: ~$0.05 per PBI
**Speed**: Medium
**Quality**: Highest

### Example 3: Fully Offline

```yaml
offline_mode:
  enabled: true
  default_provider: ollama
  default_model: llama3.2:latest

fallback:
  enabled: true
  providers:
    - { provider: ollama, model: llama3.2:latest }
    - { provider: ollama, model: llama3.1:8b }
```

**Cost**: $0 (free)
**Speed**: Depends on hardware
**Privacy**: Complete (no data leaves machine)

---

## Provider Matrix

| Provider | Type | Cost/1M Tokens | Speed | Context | Best For |
|----------|------|----------------|-------|---------|----------|
| **Claude 3.5 Haiku** | Online | $1-5 | ⚡⚡⚡ | 200K | Extraction, simple analysis |
| **Claude 3.5 Sonnet** | Online | $15 | ⚡⚡ | 200K | Complex analysis, proposals |
| **GPT-4o** | Online | $15 | ⚡⚡ | 128K | Creative tasks, variety |
| **GPT-4o-mini** | Online | $0.60 | ⚡⚡⚡ | 128K | Cost-effective fallback |
| **Gemini 1.5 Flash** | Online | $0.35 | ⚡⚡⚡ | 1M | Long documents |
| **Gemini 1.5 Pro** | Online | $7 | ⚡ | 1M | Massive context needs |
| **Ollama Llama3.2** | Local | $0 | ⚡ | 128K | Offline, privacy |
| **Azure OpenAI** | Online | Variable | ⚡⚡ | 128K | Enterprise, compliance |

---

## Next Steps

1. **Implement base abstraction layer** (`src/ai/providers/base.ts`)
2. **Create provider adapters** (one per supported provider)
3. **Implement ModelRouter** with fallback logic
4. **Create configuration schema** with validation
5. **Add cost tracking** and limits
6. **Integration testing** across all providers
7. **Documentation** for each provider setup

---

## Files to Create

```
src/
├── ai/
│   ├── providers/
│   │   ├── base.ts              # AIProvider interface
│   │   ├── anthropic.ts         # Claude adapter
│   │   ├── openai.ts            # OpenAI adapter
│   │   ├── azure-openai.ts      # Azure adapter
│   │   ├── gemini.ts            # Google Gemini adapter
│   │   ├── ollama.ts            # Ollama local adapter
│   │   └── index.ts             # Export all providers
│   ├── router/
│   │   ├── model-router.ts      # Main routing logic
│   │   ├── fallback-handler.ts  # Fallback strategies
│   │   └── cost-tracker.ts      # Cost management
│   └── config/
│       ├── model-config.ts      # Configuration types
│       └── validator.ts         # Config validation
config/
└── model-config.yaml            # User configuration
```

This architecture provides:
✅ Multi-provider support
✅ Per-step model selection
✅ Intelligent fallback
✅ Cost optimization
✅ Local-first option
✅ Extensible design

Ready to proceed with implementation? 🚀
