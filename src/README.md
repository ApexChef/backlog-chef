# Backlog Chef - Production Implementation

Production-ready AI-powered system for transforming meeting transcripts into high-quality Product Backlog Items.

## Overview

This is the **production implementation** of Backlog Chef, separate from the POC proof-of-concept implementations. It uses the multi-agent AI system with intelligent routing, cost tracking, and per-step model selection.

## Architecture

```
┌─────────────────┐
│   Input         │
│  (Transcript)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Pipeline Orchestrator            │
│                                         │
│  Step 1: Event Detection                │
│    └─→ Identify meeting type           │
│                                         │
│  Step 2: Extract Candidates             │
│    └─→ Parse PBIs from transcript      │
│                                         │
│  Step 3: Score Confidence               │
│    └─→ Evaluate PBI quality            │
│                                         │
│  Step 4: Enrich Context (TODO)          │
│    └─→ Add historical context          │
│                                         │
│  Step 5: Check Risks (TODO)             │
│    └─→ Identify blockers/dependencies  │
│                                         │
│  Step 6: Generate Proposals (TODO)      │
│    └─→ Create questions + answers      │
│                                         │
│  Step 7: Readiness Checker (TODO)       │
│    └─→ Definition of Ready evaluation  │
│                                         │
│  Step 8: Final Output (TODO)            │
│    └─→ Format for multiple destinations│
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Model Router  │
         │  (AI Gateway)  │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│Anthropic│  │ OpenAI │  │ Ollama │
│ Claude  │  │  GPT   │  │ Local  │
└────────┘  └────────┘  └────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set API Keys

```bash
# Required: At least one provider
export ANTHROPIC_API_KEY="sk-ant-..."    # Claude (recommended)
export OPENAI_API_KEY="sk-proj-..."     # OpenAI (alternative)
export GOOGLE_API_KEY="AIza..."          # Gemini (alternative)

# Optional: Azure OpenAI
export AZURE_OPENAI_API_KEY="..."
export AZURE_OPENAI_ENDPOINT="https://..."
export AZURE_OPENAI_DEPLOYMENT="gpt-4o"

# Optional: Local models (no API key needed)
ollama serve  # Start Ollama
ollama pull llama3.2
```

### 3. Run Pipeline

```bash
# Using example transcript
npm start

# Using your own transcript
npm start path/to/your/transcript.txt
```

### 4. View Results

Output is saved to `output/pipeline-output-[timestamp].json`

## Configuration

### Router Configuration

Create or edit `config/model-config.yaml`:

```yaml
# Default model for all steps
defaults:
  provider: anthropic
  model: claude-3-5-haiku-20241022
  currency: EUR

# Fallback strategy
fallback:
  enabled: true
  strategy: cascade
  providers:
    - { provider: anthropic, model: claude-3-5-haiku-20241022 }
    - { provider: openai, model: gpt-4o-mini }
    - { provider: ollama, model: llama3.2:latest }

# Per-step overrides
steps:
  detect_event_type:
    provider: anthropic
    model: claude-3-5-haiku-20241022
    reason: "Fast classification"

  score_confidence:
    provider: anthropic
    model: claude-3-5-sonnet-20241022
    reason: "Complex analysis requires more powerful model"

# Cost limits
cost_management:
  per_run_limit_usd: 1.00
  alert_threshold_usd: 0.50
```

## Project Structure

```
src/
├── index.ts                    # Main entry point
├── ai/                         # AI Provider System
│   ├── providers/              # Provider implementations
│   │   ├── base.ts            # Core interfaces
│   │   ├── base-provider.ts   # Base classes
│   │   ├── anthropic.ts       # Claude provider
│   │   ├── openai.ts          # OpenAI provider
│   │   ├── azure-openai.ts    # Azure provider
│   │   ├── gemini.ts          # Gemini provider
│   │   └── ollama.ts          # Local provider
│   ├── router/                 # Model Router
│   │   ├── model-router.ts    # Routing logic
│   │   ├── cost-tracker.ts    # Cost management
│   │   └── README.md          # Router documentation
│   ├── config/                 # Configuration
│   │   ├── config-loader.ts   # YAML loader
│   │   └── provider-registry.ts # Provider factory
│   └── utils/                  # Utilities
│       └── currency-converter.ts
├── pipeline/                   # Processing Pipeline
│   ├── orchestrator/           # Pipeline coordinator
│   │   └── pipeline-orchestrator.ts
│   ├── steps/                  # Individual steps
│   │   ├── base-step.ts       # Base step class
│   │   ├── step1-event-detection.ts
│   │   ├── step2-extract-candidates.ts
│   │   └── step3-score-confidence.ts
│   └── types/                  # Type definitions
│       └── pipeline-types.ts
└── utils/                      # Shared utilities
    └── logger.ts
```

## Implemented Steps

### ✅ Step 1: Event Detection
- **Purpose**: Identify meeting type (refinement, planning, retrospective, etc.)
- **Model**: Claude 3.5 Haiku (fast, cheap)
- **Output**: Event type with confidence score

### ✅ Step 2: Extract Candidates
- **Purpose**: Parse transcript to extract PBIs
- **Model**: Claude 3.5 Haiku (efficient extraction)
- **Output**: List of candidate PBIs with descriptions

### ✅ Step 3: Score Confidence
- **Purpose**: Evaluate PBI quality and completeness
- **Model**: Claude 3.5 Sonnet (complex analysis)
- **Output**: Quality scores across multiple dimensions

### 🚧 Steps 4-8 (TODO)
- Step 4: Enrich with Context
- Step 5: Check Risks & Conflicts
- Step 6: Generate Questions + Proposals
- Step 7: Run Readiness Checker
- Step 8: Final Output (multi-format)

## Programmatic Usage

```typescript
import {
  PipelineOrchestrator,
  createProviderRegistry,
  loadRouterConfig,
  ModelRouter,
} from './src';

async function processMeeting(transcript: string) {
  // Initialize
  const registry = createProviderRegistry();
  const config = loadRouterConfig('./config/model-config.yaml');
  const router = new ModelRouter(registry.getAll(), config);
  const orchestrator = new PipelineOrchestrator(router);

  // Execute
  const output = await orchestrator.execute({
    transcript,
    metadata: {
      meeting_date: '2025-01-19',
      source: 'Zoom Recording',
    },
  });

  // Access results
  console.log(`Found ${output.metadata.total_pbis} PBIs`);
  console.log(`Cost: $${output.metadata.total_cost_usd.toFixed(4)}`);

  for (const pbi of output.pbis) {
    console.log(`- ${pbi.pbi.id}: ${pbi.pbi.title}`);
    console.log(`  Score: ${pbi.scores.overall_score}/100`);
  }

  return output;
}
```

## Pipeline Options

```typescript
await orchestrator.execute(input, {
  // Skip specific steps
  steps: {
    skip: ['enrich_with_context'],
  },

  // Or only run specific steps
  steps: {
    only: ['detect_event_type', 'extract_candidates'],
  },

  // AI configuration
  ai: {
    temperature: 0.7,
    maxTokens: 4096,
  },

  // Output configuration
  output: {
    formats: ['markdown', 'devops'],
    directory: './custom-output',
  },

  // Cost limits
  costLimits: {
    per_run_limit_usd: 2.0,
    alert_threshold_usd: 1.0,
  },
});
```

## Cost Management

The system tracks costs in real-time:

```typescript
// Get cost statistics
const stats = orchestrator.getRouter().getCostStatistics();
console.log(`Total: $${stats.total_cost_usd.toFixed(6)}`);
console.log(`Avg per request: $${stats.average_cost_per_request.toFixed(6)}`);

// Cost by provider
for (const [provider, cost] of Object.entries(stats.cost_by_provider)) {
  console.log(`${provider}: $${cost.toFixed(6)}`);
}
```

Estimated costs per PBI (with default config):
- **Step 1-2** (Haiku): ~$0.002-0.005
- **Step 3** (Sonnet): ~$0.01-0.02
- **Total (Steps 1-3)**: ~$0.015-0.025
- **Full Pipeline (Steps 1-8)**: ~$0.05-0.10 (estimated)

## Multi-Currency Support

All costs are tracked in USD but can be displayed in EUR or GBP:

```yaml
defaults:
  currency: EUR  # or USD, GBP
```

Exchange rates (as of January 2025):
- 1 USD ≈ 0.92 EUR
- 1 USD ≈ 0.79 GBP

## Error Handling

The pipeline provides detailed error information:

```typescript
try {
  const output = await orchestrator.execute(input);
} catch (error) {
  if (error.message.includes('Cost limit')) {
    console.error('Budget exceeded! Consider:');
    console.error('1. Using cheaper models (Haiku instead of Sonnet)');
    console.error('2. Enabling local fallback (Ollama)');
    console.error('3. Increasing cost limits');
  } else if (error.message.includes('Provider unavailable')) {
    console.error('AI provider is down. Check fallback configuration.');
  }
}
```

## Development

### Adding New Steps

1. Create step class extending `BaseStep`:

```typescript
import { BaseStep } from './base-step';

export class MyNewStep extends BaseStep {
  readonly name = 'my_new_step';
  readonly description = 'What this step does';

  protected async executeStep(context, router) {
    // Your step logic here
    const response = await this.makeAIRequest(
      router,
      this.name,
      systemPrompt,
      userPrompt,
      context
    );

    // Update context
    context.myResults = this.parseJSONResponse(response, 'My Step');
    return context;
  }

  canExecute(context) {
    return !!context.previousStepResults;
  }
}
```

2. Add to orchestrator:

```typescript
// In pipeline-orchestrator.ts
private initializeSteps(): PipelineStep[] {
  return [
    // ... existing steps
    new MyNewStep(),
  ];
}
```

3. Add step configuration:

```yaml
# In model-config.yaml
steps:
  my_new_step:
    provider: anthropic
    model: claude-3-5-haiku-20241022
    reason: "Why this model"
```

## Testing

```bash
# Run with example transcript
npm start

# Run with custom transcript
npm start examples/my-transcript.txt

# Check output
cat output/pipeline-output-*.json | jq .
```

## Differences from POC

| Aspect | POC (`poc-step*`) | Production (`src/`) |
|--------|-------------------|---------------------|
| **Purpose** | Learning & validation | Production use |
| **AI System** | Hardcoded Claude API | Multi-provider router |
| **Configuration** | Inline code | YAML configuration |
| **Cost Tracking** | Basic | Comprehensive |
| **Fallback** | None | Automatic |
| **Error Handling** | Basic | Comprehensive |
| **Extensibility** | Limited | Highly modular |
| **Testing** | Manual | Integration tests |

## Next Steps

1. **Complete remaining steps** (4-8)
2. **Add integration tests**
3. **Implement output formatters** (Markdown, DevOps, Confluence)
4. **Add CLI interface** with better UX
5. **Performance optimization** for large transcripts
6. **Add caching** for repeated requests

## Troubleshooting

### "No AI providers initialized"

Set at least one API key:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### "Cost limit exceeded"

Increase limits in config:
```yaml
cost_management:
  per_run_limit_usd: 2.00
```

### "Failed to parse JSON"

The system has 4-tier fallback parsing. If it still fails, check AI response in logs.

## Documentation

- **AI Router**: See `src/ai/router/README.md`
- **Providers**: See `src/ai/README.md`
- **Architecture**: See `docs/architecture/pact-phases/01-architect-multi-agent-system.md`
- **POC Reference**: See `poc-step*/README.md` (isolated from production)

## License

Proprietary - Backlog Chef
