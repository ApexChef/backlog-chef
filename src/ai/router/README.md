

# Model Router

Intelligent request routing system with automatic fallback, cost tracking, and per-step model selection.

## Overview

The Model Router handles all AI request routing in Backlog Chef, providing:

- **Per-Step Configuration** - Different models for different pipeline steps
- **Automatic Fallback** - Graceful degradation when providers fail
- **Cost Tracking** - Monitor and enforce spending limits
- **Multiple Strategies** - Cascade, round-robin, or cheapest-first routing
- **Offline Mode** - Fully local operation with Ollama

## Architecture

```
Request (step + prompt)
        │
        ▼
  ┌─────────────┐
  │ModelRouter  │ ← Configuration
  └──────┬──────┘
         │
         ├─→ Primary Provider (from step config)
         │   ├─ Check availability
         │   ├─ Estimate cost
         │   ├─ Enforce limits
         │   └─ Send request
         │
         └─→ Fallback Providers (if primary fails)
             ├─ Strategy: cascade / round-robin / cheapest-first
             └─ Try until success or all fail
```

## Usage

### Basic Setup

```typescript
import {
  createProviderRegistry,
  loadRouterConfig,
  ModelRouter
} from './ai';

// 1. Initialize providers from environment
const registry = createProviderRegistry();
const providers = registry.getAll();

// 2. Load configuration
const config = loadRouterConfig('./config/model-config.yaml');

// 3. Create router
const router = new ModelRouter(providers, config);

// 4. Route requests
const response = await router.route('score_confidence', {
  systemPrompt: 'You are a PBI quality evaluator.',
  userPrompt: 'Analyze this PBI...',
  maxTokens: 2000,
  temperature: 0.7
});

console.log(response.content);
console.log(`Cost: $${response.cost.toFixed(6)}`);
console.log(`Used fallback: ${response.fallbackUsed}`);
```

### Configuration File

Create `config/model-config.yaml`:

```yaml
defaults:
  provider: anthropic
  model: claude-3-5-haiku-20241022
  currency: EUR

fallback:
  enabled: true
  strategy: cascade
  providers:
    - { provider: anthropic, model: claude-3-5-haiku-20241022 }
    - { provider: openai, model: gpt-4o-mini }
    - { provider: ollama, model: llama3.2:latest }

steps:
  score_confidence:
    provider: anthropic
    model: claude-3-5-sonnet-20241022
    reason: "Complex analysis requires more capable model"

  extract_candidates:
    provider: anthropic
    model: claude-3-5-haiku-20241022
    reason: "Fast extraction, cost-effective"

cost_management:
  daily_limit_usd: 10.00
  per_run_limit_usd: 1.00
  alert_threshold_usd: 0.50
```

### Environment Variables

Set API keys for desired providers:

```bash
# Required for Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-..."

# Required for OpenAI
export OPENAI_API_KEY="sk-proj-..."

# Required for Azure OpenAI
export AZURE_OPENAI_API_KEY="..."
export AZURE_OPENAI_ENDPOINT="https://..."
export AZURE_OPENAI_DEPLOYMENT="gpt-4o"

# Required for Google Gemini
export GOOGLE_API_KEY="AIza..."

# Optional: Ollama endpoint (defaults to localhost:11434)
export OLLAMA_ENDPOINT="http://localhost:11434"
```

## Fallback Strategies

### 1. Cascade (Default)

Try providers in order until one succeeds:

```yaml
fallback:
  strategy: cascade
  providers:
    - { provider: anthropic, model: claude-3-5-haiku-20241022 }
    - { provider: openai, model: gpt-4o-mini }
    - { provider: ollama, model: llama3.2:latest }
```

**Use case:** Reliability - always prefer the best provider, fall back gracefully

### 2. Round-Robin

Distribute load evenly across providers:

```yaml
fallback:
  strategy: round-robin
  providers:
    - { provider: anthropic, model: claude-3-5-haiku-20241022 }
    - { provider: openai, model: gpt-4o-mini }
    - { provider: gemini, model: gemini-1.5-flash }
```

**Use case:** Load balancing - avoid hitting rate limits on single provider

### 3. Cheapest-First

Always try cheapest option first:

```yaml
fallback:
  strategy: cheapest-first
  providers:
    - { provider: ollama, model: llama3.2:latest }        # $0
    - { provider: openai, model: gpt-4o-mini }            # $0.15/$0.60
    - { provider: anthropic, model: claude-3-5-haiku-20241022 }  # $0.80/$4.00
```

**Use case:** Cost optimization - minimize spending, fallback to paid if needed

## Cost Management

### Tracking

```typescript
// Get real-time statistics
const stats = router.getCostStatistics();
console.log(`Total cost: $${stats.total_cost_usd.toFixed(4)}`);
console.log(`Requests: ${stats.total_requests}`);
console.log(`Avg per request: $${stats.average_cost_per_request.toFixed(6)}`);

// Cost by provider
for (const [provider, cost] of Object.entries(stats.cost_by_provider)) {
  console.log(`  ${provider}: $${cost.toFixed(6)}`);
}
```

### Limits

Set spending limits in configuration:

```yaml
cost_management:
  daily_limit_usd: 10.00          # Stop after $10/day
  per_run_limit_usd: 1.00         # Stop after $1/run
  alert_threshold_usd: 0.50       # Alert at $0.50
```

Router will throw error if limit would be exceeded:

```typescript
try {
  await router.route('step', request);
} catch (error) {
  if (error.message.includes('Cost limit')) {
    console.error('Budget exceeded! Consider:');
    console.error('1. Using cheaper models');
    console.error('2. Reducing maxTokens');
    console.error('3. Enabling local fallback');
  }
}
```

## Offline Mode

Run entirely offline using local models:

```yaml
offline_mode:
  enabled: true
  default_provider: ollama
  default_model: llama3.2:latest
```

Start Ollama:

```bash
ollama serve
ollama pull llama3.2
```

All requests will use local models (zero API cost).

## Per-Step Configuration

Optimize model selection for each pipeline step:

```yaml
steps:
  # Simple extraction - use fast, cheap model
  extract_candidates:
    provider: anthropic
    model: claude-3-5-haiku-20241022

  # Complex analysis - use powerful model
  score_confidence:
    provider: anthropic
    model: claude-3-5-sonnet-20241022

  # Creative task - use GPT-4o
  generate_proposals:
    provider: openai
    model: gpt-4o

  # Offline fallback - use local model
  readiness_checker:
    provider: ollama
    model: llama3.2:latest
```

## Error Handling

Router provides detailed error information:

```typescript
try {
  const response = await router.route('step', request);
} catch (error) {
  if (error instanceof ProviderUnavailableError) {
    console.error(`Provider ${error.provider} is down`);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limit hit. Retry after ${error.retryAfter}s`);
  } else if (error instanceof ProviderError) {
    console.error(`Provider error: ${error.message}`);
    console.error(`Attempted providers: ${error.provider}`);
  }
}
```

## Monitoring

### Request Metadata

Every response includes routing metadata:

```typescript
const response = await router.route('step', request);

console.log(`Provider used: ${response.provider}`);
console.log(`Model used: ${response.model}`);
console.log(`Fallback used: ${response.fallbackUsed}`);
console.log(`Attempted providers: ${response.attemptedProviders.join(', ')}`);
console.log(`Cost: €${response.cost.toFixed(6)}`);
console.log(`Duration: ${response.duration}ms`);
console.log(`Tokens: ${response.usage.totalTokens}`);
```

### Cost Summary

Print detailed cost summary:

```typescript
// At end of run
const tracker = router['costTracker']; // Access via router
tracker.printSummary();
```

Output:

```
================================================================================
AI API COST SUMMARY
================================================================================
Total Cost:           $0.023456
Total Requests:       15
Average Cost/Request: $0.001564
Total Tokens:         12,345
  Input:              8,234
  Output:             4,111
Duration:             23.45s

Cost by Provider:
  anthropic       $0.018234 (12 requests)
  openai          $0.005222 (3 requests)

Per-Run Limit:        $1.00 (2.3% used)
Daily Limit:          $10.00 (0.2% used)
================================================================================
```

## Best Practices

### 1. Start with Defaults

Use the default configuration and tune based on results:

```typescript
import { createDefaultRouterConfig } from './ai/config';

const config = createDefaultRouterConfig();
// Customize as needed
config.defaults.currency = 'EUR';
```

### 2. Enable Fallback

Always enable fallback for production:

```yaml
fallback:
  enabled: true
  strategy: cascade
```

### 3. Set Cost Limits

Protect against unexpected spending:

```yaml
cost_management:
  per_run_limit_usd: 1.00
  alert_threshold_usd: 0.50
```

### 4. Use Local Fallback

Add Ollama as final fallback:

```yaml
fallback:
  providers:
    - { provider: anthropic, model: claude-3-5-haiku-20241022 }
    - { provider: ollama, model: llama3.2:latest }
```

### 5. Monitor Costs

Track spending regularly:

```typescript
setInterval(() => {
  const stats = router.getCostStatistics();
  console.log(`Current spend: $${stats.total_cost_usd.toFixed(4)}`);
}, 60000); // Every minute
```

## Troubleshooting

### "No AI providers initialized"

**Problem:** No API keys found

**Solution:** Set at least one API key or ensure Ollama is running

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# or
ollama serve
```

### "Provider unavailable"

**Problem:** Provider is down or unreachable

**Solution:** Enable fallback or check provider status

```typescript
const available = await router.isProviderAvailable('anthropic');
console.log(`Anthropic available: ${available}`);
```

### "Cost limit exceeded"

**Problem:** Reached spending limit

**Solution:** Increase limit, use cheaper models, or reset tracking

```yaml
cost_management:
  per_run_limit_usd: 5.00  # Increase limit
```

```typescript
router.resetCostTracking();  // Reset for new run
```

## Examples

See `examples/` directory for complete examples:

- `basic-routing.ts` - Simple routing setup
- `with-fallback.ts` - Fallback strategy examples
- `cost-tracking.ts` - Cost monitoring
- `offline-mode.ts` - Local-only operation

## API Reference

See TypeScript definitions in `model-router.ts` for complete API documentation.
