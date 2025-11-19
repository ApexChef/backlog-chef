# Technical Stack

## MVP (CLI)
- **Language**: TypeScript/Node.js
- **AI/LLM**: Multi-provider support (Anthropic, OpenAI, Google, DeepSeek, Mistral, xAI)
  - Provider-agnostic abstraction layer
  - Per-step provider selection
  - Automatic fallback and retry logic
  - See [multi-ai-architecture.md](./multi-ai-architecture.md) for details
- **Integrations**: Fireflies, Azure DevOps, Confluence APIs
- **Storage**: Local JSON storage

## V1 (Web App)
- **Frontend**: Next.js, shadcn/ui, Vercel
- **Backend**: Node.js, PostgreSQL, Redis
- **Real-time**: WebSockets
- **Infrastructure**: Vercel + Railway
- **AI Layer**: Provider registry, quota management, A/B testing

## Architecture Principles
1. **Modular Pipeline** - Isolated, testable steps
2. **Event-Driven** - Asynchronous processing
3. **API-First** - External integrations and extensibility
4. **Provider-Agnostic** - No vendor lock-in for AI services
5. **Horizontally Scalable** - Distributed processing capability

## AI Provider Architecture

### Supported Providers (MVP)
| Provider | Models | Strengths | Use Cases |
|----------|--------|-----------|-----------|
| **Anthropic** | Claude 3.5 Sonnet/Haiku | Long context (200K), reasoning | Extraction, risk analysis |
| **OpenAI** | GPT-4o, GPT-o1, GPT-4o-mini | Advanced reasoning, reliability | Complex analysis, structured output |
| **Google** | Gemini 1.5 Pro, 2.0 Flash | Ultra-long context (2M), cost-effective | Large transcripts, enrichment |
| **DeepSeek** | DeepSeek Chat, R1 | Cost-effective, reasoning | Budget-friendly, experimentation |
| **Mistral** | Mistral Large/Small | EU sovereignty, privacy | Compliance, European deployments |
| **xAI** | Grok Beta | Real-time knowledge | Experimental features |

### Configuration Layers
1. **Global Defaults** (`config/ai-providers.yaml`) - System-wide provider preferences
2. **Workflow Strategy** (`config/workflows/*.yaml`) - Per-event-type optimization
3. **Step Override** - Individual step provider selection
4. **Runtime Override** - CLI/API parameter override

### Cost Optimization Strategies
- **Quality First**: Best models regardless of cost (~$300-500/month for 200 meetings)
- **Cost Optimized**: Prefer DeepSeek/Gemini Flash (~$50-100/month)
- **Balanced** (Recommended): Mix based on task complexity (~$150-250/month)
- **Speed First**: Fastest response times (Gemini Flash, Haiku)

See [multi-ai-architecture.md](./multi-ai-architecture.md) for complete provider details and configuration examples.
