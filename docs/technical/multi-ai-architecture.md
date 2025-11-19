# Multi-AI Platform Architecture

## Overview

Backlog Chef is designed as a **provider-agnostic AI system** that can leverage multiple LLM platforms (Anthropic, OpenAI, Google, DeepSeek, Mistral, xAI, etc.) based on task requirements, cost considerations, and availability.

## Design Principles

### 1. **Task-Based Provider Selection**
Different pipeline steps have different requirements:
- **Event Detection**: Fast, simple classification → Use lightweight models (Haiku, GPT-4o-mini, Gemini Flash)
- **Context Enrichment**: Long context, deep reasoning → Use premium models (Claude Sonnet, GPT-o1, Gemini Pro)
- **Risk Analysis**: Complex reasoning → Use specialized reasoning models (GPT-o1, DeepSeek R1, Claude Sonnet)
- **Output Formatting**: Structured output, speed → Use efficient models (Haiku, GPT-4o-mini)

### 2. **Provider-Agnostic Interface**
All AI interactions go through a unified abstraction layer:

```typescript
interface AIProvider {
  name: string;
  generateCompletion(prompt: string, options: CompletionOptions): Promise<AIResponse>;
  streamCompletion(prompt: string, options: CompletionOptions): AsyncIterator<AIChunk>;
  supportedCapabilities: Capability[];
}

interface CompletionOptions {
  model: string;
  maxTokens: number;
  temperature?: number;
  structuredOutput?: JSONSchema;
  stopSequences?: string[];
}
```

### 3. **Intelligent Fallback Strategy**
If a provider fails (rate limit, downtime, quota exceeded), the system automatically falls back to alternative providers:

```yaml
extract_candidates:
  primary: "anthropic:claude-3-5-sonnet-20241022"
  fallback:
    - "openai:gpt-4o"
    - "google:gemini-1.5-pro"
    - "deepseek:deepseek-chat"
```

### 4. **Cost Optimization**
Teams can choose optimization strategies:
- **Quality First**: Use best models regardless of cost (o1, Claude Sonnet)
- **Cost Optimized**: Prefer cost-effective options (DeepSeek, Gemini Flash)
- **Speed First**: Fastest response times (Gemini Flash, Haiku)
- **Balanced**: Mix of quality and cost based on task criticality

## Configuration Architecture

### Per-Step Provider Override

Teams can override AI providers at multiple levels:

#### 1. Global Defaults (`config/ai-providers.yaml`)
```yaml
defaults:
  extract_candidates:
    provider: "anthropic"
    model: "claude-3-5-sonnet-20241022"
```

#### 2. Workflow Level (`config/workflows/refinement.yaml`)
```yaml
event: refinement
ai_strategy: "cost_optimized"  # Apply cost-optimized strategy to all steps

pipeline:
  steps:
    - name: extract_candidates
      ai_provider: "google:gemini-1.5-pro"  # Override for this step

    - name: score_confidence
      # Uses default from ai_strategy
```

#### 3. Runtime Override (CLI/API)
```bash
# Use specific provider for entire pipeline
backlog-chef process transcript.txt --ai-provider openai:gpt-4o

# Per-step override
backlog-chef process transcript.txt \
  --extract-ai anthropic:claude-3-5-sonnet-20241022 \
  --score-ai deepseek:deepseek-chat
```

## Provider Capabilities

### Anthropic Claude
**Strengths**: Long context (200K), excellent reasoning, structured output
**Best For**: Complex extraction, risk analysis, question generation
**Models**: Claude 3.5 Sonnet (reasoning), Claude 3.5 Haiku (fast)

### OpenAI
**Strengths**: Advanced reasoning (o1), widespread adoption, reliable
**Best For**: Complex risk detection, structured output, general tasks
**Models**: GPT-o1 (reasoning), GPT-4o (balanced), GPT-4o-mini (fast)

### Google Gemini
**Strengths**: Ultra-long context (2M tokens), multimodal, cost-effective
**Best For**: Large transcripts, context enrichment, visual analysis
**Models**: Gemini 1.5 Pro (premium), Gemini 2.0 Flash (fast)

### DeepSeek
**Strengths**: Extremely cost-effective, strong reasoning (R1), open source friendly
**Best For**: Budget-conscious teams, reasoning tasks, experimentation
**Models**: DeepSeek Chat (general), DeepSeek R1 (reasoning)

### Mistral
**Strengths**: European data sovereignty, privacy-focused, competitive pricing
**Best For**: EU-based teams, privacy requirements, compliance
**Models**: Mistral Large (premium), Mistral Small (fast)

### xAI Grok
**Strengths**: Real-time knowledge, X platform integration
**Best For**: Real-time context, current events, experimental features
**Models**: Grok Beta (experimental)

## Use Cases

### Scenario 1: Cost-Conscious Startup
```yaml
# Use DeepSeek for most tasks, Gemini for long transcripts
ai_strategy: "cost_optimized"
overrides:
  enrich_context: "google:gemini-1.5-pro"  # Needs long context
```

**Monthly Cost**: ~$50-100 for 200 meetings

### Scenario 2: Enterprise Quality Focus
```yaml
# Use best-in-class models for critical steps
ai_strategy: "quality_optimized"
defaults:
  extract_candidates: "anthropic:claude-3-5-sonnet-20241022"
  check_risks: "openai:o1"
  generate_questions: "anthropic:claude-3-5-sonnet-20241022"
```

**Monthly Cost**: ~$300-500 for 200 meetings

### Scenario 3: EU Compliance Required
```yaml
# Use European providers only
allowed_providers: ["mistral", "anthropic"]  # Anthropic is SOC2/GDPR compliant
ai_strategy: "quality_optimized"
```

### Scenario 4: Hybrid Approach (Recommended)
```yaml
# Fast/cheap models for simple tasks, premium for complex
event_detection: "google:gemini-2.0-flash-exp"  # Fast classification
extract_candidates: "anthropic:claude-3-5-sonnet-20241022"  # Quality extraction
score_confidence: "deepseek:deepseek-chat"  # Cost-effective scoring
enrich_context: "google:gemini-1.5-pro"  # Long context needed
check_risks: "openai:o1"  # Best reasoning
generate_questions: "anthropic:claude-3-5-sonnet-20241022"  # Quality output
run_readiness_checker: "deepseek:deepseek-chat"  # Rule-based, simpler
format_output: "openai:gpt-4o-mini"  # Fast formatting
```

**Monthly Cost**: ~$150-250 for 200 meetings

## Implementation

### Provider Registry
```typescript
class AIProviderRegistry {
  private providers: Map<string, AIProvider>;

  register(name: string, provider: AIProvider): void;
  get(name: string): AIProvider;
  getForTask(step: PipelineStep, strategy: Strategy): AIProvider;
}
```

### Smart Provider Selection
```typescript
class AIProviderSelector {
  selectProvider(
    step: PipelineStep,
    strategy: Strategy,
    fallbackChain: string[]
  ): AIProvider {
    // 1. Check step-specific override
    // 2. Apply strategy preference
    // 3. Verify provider availability
    // 4. Check quota/rate limits
    // 5. Return best available or fallback
  }
}
```

### Retry Logic with Fallback
```typescript
async function executeWithFallback(
  step: PipelineStep,
  prompt: string,
  providers: string[]
): Promise<AIResponse> {
  for (const providerSpec of providers) {
    try {
      const provider = registry.get(providerSpec);
      return await provider.generateCompletion(prompt, options);
    } catch (error) {
      if (isLastProvider) throw error;
      logger.warn(`Provider ${providerSpec} failed, trying fallback...`);
      continue;
    }
  }
}
```

## Monitoring & Analytics

Track provider performance across dimensions:
- **Response Time**: Which provider is fastest for each step?
- **Cost Per Task**: Actual spend per pipeline step
- **Quality Metrics**: Compare output quality across providers
- **Failure Rate**: Track reliability and fallback frequency
- **Token Usage**: Monitor context size efficiency

**Dashboard Example:**
```
Step: Extract Candidates (Last 30 days)
├─ Primary: Claude 3.5 Sonnet
│  ├─ Success: 95% (190/200)
│  ├─ Avg Time: 4.2s
│  └─ Cost: $85.40
├─ Fallback: GPT-4o
│  ├─ Success: 4% (8/200)
│  ├─ Avg Time: 3.1s
│  └─ Cost: $6.20
└─ Fallback: Gemini 1.5 Pro
   ├─ Success: 1% (2/200)
   ├─ Avg Time: 5.8s
   └─ Cost: $1.80
```

## Future Enhancements

### 1. **Local/Open Source Models**
Support for self-hosted models:
- Llama 3.x via Ollama
- Mixtral local deployment
- On-premise fine-tuned models

### 2. **Model Router Services**
Integration with routing platforms:
- OpenRouter (unified API for 200+ models)
- LiteLLM (proxy layer)
- Portkey (observability + routing)

### 3. **A/B Testing Framework**
```yaml
experiment:
  name: "compare_extraction_quality"
  variants:
    - provider: "anthropic:claude-3-5-sonnet-20241022"
      weight: 50%
    - provider: "openai:gpt-4o"
      weight: 50%
  metrics: ["completeness", "accuracy", "cost"]
```

### 4. **Custom Fine-Tuned Models**
Train domain-specific models on historical PBI data:
```yaml
custom_models:
  - id: "backlog-chef-extractor-v1"
    base_model: "mistral-7b"
    training_data: "historical_refinements.jsonl"
    provider: "self_hosted"
```

## Configuration Migration

When switching providers, the system ensures compatibility:

```typescript
interface ProviderMigration {
  validateCapabilities(from: Provider, to: Provider): ValidationResult;
  translatePrompt(prompt: Prompt, fromFormat: string, toFormat: string): Prompt;
  adjustParameters(params: Params, provider: Provider): Params;
}
```

## Summary

**Key Benefits:**
1. ✅ **Flexibility**: Choose best tool for each job
2. ✅ **Resilience**: Automatic fallback prevents downtime
3. ✅ **Cost Control**: Optimize spending without sacrificing quality
4. ✅ **Future-Proof**: Easy to add new providers as they emerge
5. ✅ **Vendor Independence**: No lock-in to single platform
6. ✅ **Team Choice**: Different teams can use different strategies

**Trade-offs:**
1. ⚠️ Increased complexity in configuration
2. ⚠️ Need to manage multiple API keys
3. ⚠️ Prompt engineering may vary across providers
4. ⚠️ Quality consistency requires testing

The multi-AI architecture positions Backlog Chef as a **platform-agnostic refinement assistant** that adapts to team preferences, budget constraints, and evolving AI capabilities.
