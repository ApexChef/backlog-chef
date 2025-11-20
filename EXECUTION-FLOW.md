# Backlog Chef - Execution Flow Documentation

Complete step-by-step guide showing which files are executed when you run `npm start`.

## Entry Point

### 1. `npm start` Command

**File:** `package.json:11`
```json
"start": "npm run build && node dist/index.js"
```

**What happens:**
1. Runs `npm run build` (compiles TypeScript to JavaScript)
2. Runs `node dist/index.js` (executes compiled code)

---

## Build Phase

### 2. TypeScript Compilation

**File:** `tsconfig.json`
```typescript
{
  "compilerOptions": {
    "outDir": "./dist",  // Output compiled JS here
    "rootDir": "./src"   // Compile from src/
  }
}
```

**What happens:**
- All `.ts` files in `src/` are compiled to `.js` files in `dist/`
- Type checking is performed
- Source maps and declarations are generated

---

## Runtime Execution

### 3. Main Entry Point

**File:** `src/index.ts:1-111` → Compiled to `dist/index.ts`

**Execution order:**

#### Step 3.1: Load Environment Variables
```typescript
// src/index.ts:8-9
import dotenv from 'dotenv';
dotenv.config();
```
- Loads `.env` file from project root
- Sets environment variables (`ANTHROPIC_API_KEY`, etc.)

#### Step 3.2: Import Dependencies
```typescript
// src/index.ts:11-15
import fs from 'fs';
import path from 'path';
import { createProviderRegistry, loadRouterConfig } from './ai/config';
import { ModelRouter } from './ai/router';
import { PipelineOrchestrator } from './pipeline';
```

**Files loaded:**
- `src/ai/config/index.ts` - Exports registry and config loader
- `src/ai/router/index.ts` - Exports ModelRouter
- `src/pipeline/index.ts` - Exports PipelineOrchestrator

#### Step 3.3: Execute main() Function
```typescript
// src/index.ts:20
async function main() {
```

---

## Step-by-Step Execution Flow

### 4. Initialize AI Providers

**File:** `src/index.ts:23`
```typescript
const registry = createProviderRegistry();
```

**↓ Calls:** `src/ai/config/provider-registry.ts:200-210`
```typescript
export function createProviderRegistry(config?: ProviderRegistryConfig) {
  const registry = new ProviderRegistry();
  return registry.initialize(config);
}
```

**↓ Calls:** `src/ai/config/provider-registry.ts:42-125` - `initialize()`

**Checks environment variables and initializes providers:**

1. **Check ANTHROPIC_API_KEY** (line 44)
   - **↓ If set:** `src/ai/providers/anthropic.ts:19-99` - `new AnthropicProvider()`
   - **↓ Calls:** `src/ai/providers/base-provider.ts:11-98` - `BaseAIProvider` constructor
   - **↓ Initializes:** `@anthropic-ai/sdk` client

2. **Check OPENAI_API_KEY** (line 60)
   - **↓ If set:** `src/ai/providers/openai.ts` - `new OpenAIProvider()`

3. **Check GOOGLE_API_KEY** (line 94)
   - **↓ If set:** `src/ai/providers/gemini.ts` - `new GeminiProvider()`

4. **Check AZURE_OPENAI_API_KEY** (line 76)
   - **↓ If set:** `src/ai/providers/azure-openai.ts` - `new AzureOpenAIProvider()`

5. **Always initialize Ollama** (line 110)
   - **↓ Calls:** `src/ai/providers/ollama.ts` - `new OllamaProvider()`
   - Uses `http://localhost:11434` by default

**Console output:**
```
[ProviderRegistry] ✓ Initialized: Anthropic Claude
[ProviderRegistry] ✓ Initialized: Ollama (local)
[ProviderRegistry] Total providers initialized: 2
```

---

### 5. Load Router Configuration

**File:** `src/index.ts:32-42`
```typescript
const configPath = path.join(__dirname, '../config/model-config.yaml');
if (fs.existsSync(configPath)) {
  config = loadRouterConfig(configPath);
} else {
  console.warn('No config file found, using defaults');
  const { createDefaultRouterConfig } = await import('./ai/config/config-loader');
  config = createDefaultRouterConfig();
}
```

**↓ Calls:** `src/ai/config/config-loader.ts:15-82` - `loadRouterConfig()` or `createDefaultRouterConfig()`

**Default config created:**
```typescript
// src/ai/config/config-loader.ts:84-124
{
  defaults: {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    currency: 'EUR'
  },
  fallback: {
    enabled: true,
    strategy: 'cascade',
    providers: [
      { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
      { provider: 'openai', model: 'gpt-4o-mini' },
      { provider: 'ollama', model: 'llama3.2:latest' }
    ]
  },
  steps: {},
  cost_management: {
    daily_limit_usd: 10,
    per_run_limit_usd: 1,
    alert_threshold_usd: 0.5
  }
}
```

---

### 6. Create Model Router

**File:** `src/index.ts:46`
```typescript
const router = new ModelRouter(providers, config);
```

**↓ Calls:** `src/ai/router/model-router.ts:33-54` - Constructor

**Initializes:**
1. `src/ai/router/cost-tracker.ts:26-40` - `new CostTracker(config.cost_management)`
2. Stores providers Map
3. Stores router config

**Console output:**
```
[INFO] [CostTracker] Initialized with config: { daily_limit_usd: 10, per_run_limit_usd: 1, alert_threshold_usd: 0.5 }
```

---

### 7. Create Pipeline Orchestrator

**File:** `src/index.ts:47`
```typescript
const orchestrator = new PipelineOrchestrator(router);
```

**↓ Calls:** `src/pipeline/orchestrator/pipeline-orchestrator.ts:26-30` - Constructor

**↓ Calls:** `src/pipeline/orchestrator/pipeline-orchestrator.ts:36-48` - `initializeSteps()`

**Initializes all step instances:**

1. `src/pipeline/steps/step1-event-detection.ts:24` - `new EventDetectionStep()`
2. `src/pipeline/steps/step2-extract-candidates.ts:19` - `new ExtractCandidatesStep()`
3. `src/pipeline/steps/step3-score-confidence.ts:26` - `new ScoreConfidenceStep()`
4. `src/pipeline/steps/step4-enrich-context.ts:84` - `new EnrichContextStep()`
5. `src/pipeline/steps/step5-check-risks.ts:31` - `new CheckRisksStep()`
6. `src/pipeline/steps/step6-generate-proposals.ts:79` - `new GenerateProposalsStep()`
   - **↓ Calls:** `initializeStakeholderRegistry()` at line 85-111
7. `src/pipeline/steps/step7-readiness-checker.ts:28` - `new ReadinessCheckerStep()`

---

### 8. Load Transcript

**File:** `src/index.ts:50-59`
```typescript
const transcriptPath = process.argv[2] || path.join(__dirname, '../examples/sample-transcript.txt');
const transcript = fs.readFileSync(transcriptPath, 'utf-8');
```

**Reads:** `examples/sample-transcript.txt` (3799 characters)

---

### 9. Execute Pipeline

**File:** `src/index.ts:62-80`
```typescript
const output = await orchestrator.execute(
  { transcript, metadata: { source: transcriptPath } },
  { ai: { temperature: 0.7, maxTokens: 4096 }, costLimits: { ... } }
);
```

**↓ Calls:** `src/pipeline/orchestrator/pipeline-orchestrator.ts:52-97` - `execute()`

**Pipeline execution begins:**

#### Step 9.1: Initialize Context
```typescript
// src/pipeline/orchestrator/pipeline-orchestrator.ts:57-64
const context: PipelineContext = {
  input,
  options,
  startTime: Date.now(),
  stepTimings: {},
  totalCost: 0,
  modelsUsed: new Set(),
};
```

**Context type defined in:** `src/pipeline/types/pipeline-types.ts:271-289`

#### Step 9.2: Execute Each Step in Sequence

**Loop:** `src/pipeline/orchestrator/pipeline-orchestrator.ts:70-79`

---

## Pipeline Step Execution (Detailed)

### 10. STEP 1: Event Detection

**File:** `src/pipeline/steps/step1-event-detection.ts`

**↓ Calls:** `src/pipeline/steps/base-step.ts:47-72` - `execute()`

**Execution flow:**

1. **Check prerequisites** (base-step.ts:54-56)
   ```typescript
   if (!this.canExecute(context)) {
     throw new Error(`${this.name}: Prerequisites not met`);
   }
   ```
   - **↓ Calls:** `step1-event-detection.ts:28-30` - `canExecute()` → Returns `true`

2. **Execute step logic** (base-step.ts:59)
   ```typescript
   const updatedContext = await this.executeStep(context, router);
   ```
   - **↓ Calls:** `step1-event-detection.ts:32-72` - `executeStep()`

3. **Build AI prompts** (step1-event-detection.ts:33-52)
   - System prompt: Instructions for Claude
   - User prompt: Includes transcript text

4. **Make AI request** (step1-event-detection.ts:54-61)
   ```typescript
   const responseContent = await this.makeAIRequest(router, this.name, systemPrompt, userPrompt, context);
   ```
   - **↓ Calls:** `base-step.ts:94-113` - `makeAIRequest()`

5. **Route request through ModelRouter** (base-step.ts:101-106)
   ```typescript
   const response = await router.route(stepName, { systemPrompt, userPrompt, temperature, maxTokens });
   ```
   - **↓ Calls:** `src/ai/router/model-router.ts:64-123` - `route()`

6. **ModelRouter selects provider** (model-router.ts:65-73)
   ```typescript
   const stepConfig = this.config.steps[step] || this.config.defaults;
   const providerName = stepConfig?.provider || this.config.defaults.provider;
   const model = stepConfig?.model || this.config.defaults.model;
   ```
   - Provider: `anthropic`
   - Model: `claude-3-5-haiku-20241022`

7. **Check cost limits** (model-router.ts:76-85)
   ```typescript
   const estimate = await this.estimateCost(providerName, model, request);
   if (!this.costTracker.canAfford(estimate.costUSD)) {
     throw new CostLimitError(...);
   }
   ```
   - **↓ Calls:** `src/ai/router/cost-tracker.ts:48-73` - `canAfford()`

8. **Send request to provider** (model-router.ts:88)
   ```typescript
   const response = await this.sendRequest(providerName, model, request);
   ```
   - **↓ Calls:** `model-router.ts:232-272` - `sendRequest()`
   - **↓ Calls:** `src/ai/providers/anthropic.ts:72-99` - `sendMessage()`
   - **↓ Calls:** Anthropic SDK: `this.client.messages.create()`

9. **Record cost** (model-router.ts:111-112)
   ```typescript
   this.costTracker.record(response);
   ```
   - **↓ Calls:** `src/ai/router/cost-tracker.ts:78-101` - `record()`

10. **Parse JSON response** (step1-event-detection.ts:63-67)
    ```typescript
    const result = this.parseJSONResponse<EventDetectionResult>(responseContent, 'Event Detection');
    ```
    - **↓ Calls:** `base-step.ts:118-147` - `parseJSONResponse()`
    - Tries direct parse, markdown extraction, regex extraction

11. **Update context** (step1-event-detection.ts:69-70)
    ```typescript
    context.eventDetection = result;
    return context;
    ```

12. **Record timing** (base-step.ts:62-63)
    ```typescript
    updatedContext.stepTimings[this.name] = duration;
    ```

**Console output:**
```
[detect_event_type] Starting...
[INFO] [Router] Step: detect_event_type → Provider: anthropic, Model: claude-3-5-haiku-20241022
[INFO] [CostTracker] Request recorded: anthropic - $0.001278 (1103 in + 99 out tokens)
[detect_event_type] Detected: refinement (confidence: 99.0%)
[detect_event_type] ✓ Completed in 3.55s
```

---

### 11. STEP 2: Extract Candidates

**File:** `src/pipeline/steps/step2-extract-candidates.ts`

**Same execution pattern as Step 1:**

1. **↓ Calls:** `base-step.ts:execute()` → Wrapper
2. **↓ Calls:** `step2-extract-candidates.ts:executeStep()` → Step logic
3. **↓ Calls:** `base-step.ts:makeAIRequest()` → AI request
4. **↓ Calls:** `model-router.ts:route()` → Provider routing
5. **↓ Calls:** `anthropic.ts:sendMessage()` → Claude API
6. **↓ Calls:** `base-step.ts:parseJSONResponse()` → Parse result
7. **Updates:** `context.extractedCandidates`

**Console output:**
```
[extract_candidates] Starting...
[INFO] [Router] Step: extract_candidates → Provider: anthropic, Model: claude-3-5-haiku-20241022
[INFO] [CostTracker] Request recorded: anthropic - $0.003668 (1240 in + 669 out tokens)
[extract_candidates] Extracted 3 candidate PBIs:
  - PBI-001: As a user, I want to log in with Google or Microsoft account
  - PBI-002: As a user, I want to export dashboard data to Excel
  - PBI-003: As a user, I want faster search results
[extract_candidates] ✓ Completed in 9.63s
```

---

### 12. STEP 3: Score Confidence

**File:** `src/pipeline/steps/step3-score-confidence.ts`

**Special note:** This step processes **each PBI individually** in a loop.

**Loop:** `step3-score-confidence.ts:39-71` - For each `scoredPBI` in `context.extractedCandidates.candidates`

**For PBI-001:**
1. **↓ Calls:** `base-step.ts:makeAIRequest()` → Claude evaluates PBI quality
2. **↓ Calls:** `model-router.ts:route()` → Routes to Anthropic
3. **↓ Calls:** `anthropic.ts:sendMessage()` → API call
4. **↓ Calls:** `base-step.ts:parseJSONResponse()` → Parse scores

**Repeats for PBI-002 and PBI-003**

**Updates:** `context.scoredPBIs`

**Console output:**
```
[score_confidence] Starting...
[score_confidence] Scoring PBI-001...
[INFO] [Router] Step: score_confidence → Provider: anthropic, Model: claude-3-5-haiku-20241022
[INFO] [CostTracker] Request recorded: anthropic - $0.001017 (461 in + 162 out tokens)
[score_confidence]   Score: 88/100 (Good)
[score_confidence] Scoring PBI-002...
... (repeats for each PBI)
[score_confidence] Average score: 88.0/100
[score_confidence] ✓ Completed in 12.18s
```

---

### 13. STEP 4: Enrich Context

**File:** `src/pipeline/steps/step4-enrich-context.ts`

**Special note:** This step makes **4 AI requests per PBI**:

**For each PBI in `context.scoredPBIs.scored_pbis`:**

1. **Generate search queries** (step4-enrich-context.ts:150-196)
   - **↓ Calls:** `makeAIRequest()` → "Extract search queries"
   - Returns: `{ keywords, concepts, technologies }`

2. **Search for context** (step4-enrich-context.ts:205-291)
   - **↓ Calls:** `makeAIRequest()` → "Find similar work, decisions, docs"
   - Returns: `{ similar_work[], past_decisions[], technical_docs[] }`

3. **Analyze risks** (step4-enrich-context.ts:300-381)
   - **↓ Calls:** `makeAIRequest()` → "Identify risks from context"
   - Returns: `{ risk_flags[] }`

4. **Generate suggestions** (step4-enrich-context.ts:390-455)
   - **↓ Calls:** `makeAIRequest()` → "Generate actionable suggestions"
   - Returns: `{ suggestions[] }`

**Total AI calls:** 3 PBIs × 4 requests = **12 AI calls**

**Updates:** `context.enrichedPBIs`

**Console output:**
```
[enrich_context] Starting...
  Enriching PBI: PBI-001 - As a user, I want to log in with Google or Microsoft account
[INFO] [Router] Step: enrich_context → Provider: anthropic, Model: claude-3-5-haiku-20241022
[INFO] [CostTracker] Request recorded: anthropic - $0.000865 (286 in + 159 out tokens)
[INFO] [Router] Step: enrich_context → Provider: anthropic, Model: claude-3-5-haiku-20241022
[INFO] [CostTracker] Request recorded: anthropic - $0.003311 (579 in + 712 out tokens)
... (4 requests per PBI, 3 PBIs = 12 total requests)
    Found: 2 similar work, 2 decisions, 2 docs, 4 risk flags
  Total: 3 PBIs enriched
[enrich_context] ✓ Completed in 74.83s
```

---

### 14. STEP 5: Check Risks

**File:** `src/pipeline/steps/step5-check-risks.ts`

**For each PBI in `context.enrichedPBIs.enriched_pbis`:**

1. **Analyze risks** (step5-check-risks.ts:73-144)
   - **↓ Calls:** `makeAIRequest()` → Claude analyzes all context
   - Input includes: scores, context, risk flags, suggestions
   - Returns: `{ risks[], overall_risk_level, complexity_score }`

**Updates:** `context.risksAssessed`

**Console output:**
```
[check_risks] Starting...
  Analyzing risks for: PBI-001 - As a user, I want to log in with Google or Microsoft account
[INFO] [Router] Step: check_risks → Provider: anthropic, Model: claude-3-5-haiku-20241022
[INFO] [CostTracker] Request recorded: anthropic - $0.002197 (876 in + 374 out tokens)
    Risk Level: HIGH (4 risks identified)
... (repeats for each PBI)
  Total: 3 PBIs analyzed for risks
[check_risks] ✓ Completed in 21.40s
```

---

### 15. STEP 6: Generate Proposals

**File:** `src/pipeline/steps/step6-generate-proposals.ts`

**For each PBI:**

1. **Identify questions** (step6-generate-proposals.ts:195-263)
   - **↓ Calls:** `makeAIRequest()` → "Find unanswered questions"

2. **For each question:**

   a. **Generate proposal** (step6-generate-proposals.ts:296-363)
      - **↓ Calls:** `makeAIRequest()` → "Create proposed answer"

   b. **Search documentation** (step6-generate-proposals.ts:372-424)
      - **↓ Calls:** `makeAIRequest()` → "Find relevant docs"

   c. **Route to stakeholders** (step6-generate-proposals.ts:433-453)
      - Uses local stakeholder registry (no AI call)

**Updates:** `context.questionsGenerated`

**Console output:**
```
[generate_proposals] Starting...
  Processing PBI: PBI-001 - As a user, I want to log in with Google or Microsoft account
[INFO] [Router] Step: generate_proposals → Provider: anthropic, Model: claude-3-5-haiku-20241022
[INFO] [CostTracker] Request recorded: anthropic - $0.003268 (625 in + 692 out tokens)
[INFO] [Router] Step: generate_proposals → Provider: anthropic, Model: claude-3-5-haiku-20241022
[INFO] [CostTracker] Request recorded: anthropic - $0.002026 (403 in + 426 out tokens)
[generate_proposals] ✗ Failed: Proposal Generation: Failed to parse JSON response. Content: {
  "confidence": "HIGH",
  "suggestion": "Implement a robust OAuth token validation...
```

**Note:** Step 6 failed due to JSON parsing (response truncated)

---

### 16. STEP 7: Readiness Checker

**File:** `src/pipeline/steps/step7-readiness-checker.ts`

**(Not reached in test due to Step 6 failure)**

**Would execute:**

1. **For each PBI in `context.risksAssessed`:**
   - **↓ Calls:** `checkReadiness()` (line 100-182)
   - **↓ Calls:** `makeAIRequest()` → Evaluate against Definition of Ready
   - Returns: `{ readiness_status, readiness_score, blocking_issues[], warnings[], recommendations[] }`

**Would update:** `context.readinessAssessed`

---

## Error Handling

### 17. Pipeline Failure

**File:** `src/pipeline/orchestrator/pipeline-orchestrator.ts:88-96`

```typescript
} catch (error) {
  console.error('\n' + '='.repeat(80));
  console.error('PIPELINE FAILED');
  console.error('='.repeat(80));
  console.error('Error:', (error as Error).message);
  console.error('='.repeat(80) + '\n');
  throw error;
}
```

**↓ Throws error to:** `src/index.ts:95-98`

```typescript
} catch (error) {
  console.error('\n❌ Pipeline execution failed:', (error as Error).message);
  process.exit(1);
}
```

---

## Summary of File Execution Order

### Initialization (Files 1-7):
1. `package.json` → npm scripts
2. `tsconfig.json` → TypeScript compiler
3. `.env` → Environment variables
4. `src/index.ts` → Main entry point
5. `src/ai/config/provider-registry.ts` → Initialize providers
6. `src/ai/router/model-router.ts` → Create router
7. `src/pipeline/orchestrator/pipeline-orchestrator.ts` → Create orchestrator

### Pipeline Execution (Files 8-14):
8. `src/pipeline/steps/step1-event-detection.ts` → Detect meeting type
9. `src/pipeline/steps/step2-extract-candidates.ts` → Extract PBIs
10. `src/pipeline/steps/step3-score-confidence.ts` → Score quality
11. `src/pipeline/steps/step4-enrich-context.ts` → Add context
12. `src/pipeline/steps/step5-check-risks.ts` → Analyze risks
13. `src/pipeline/steps/step6-generate-proposals.ts` → Create Q&A (FAILED)
14. `src/pipeline/steps/step7-readiness-checker.ts` → Check readiness (NOT REACHED)

### Shared Utilities (Used by all steps):
- `src/pipeline/steps/base-step.ts` → Common step functionality
- `src/ai/router/model-router.ts` → Route AI requests
- `src/ai/router/cost-tracker.ts` → Track costs
- `src/ai/providers/anthropic.ts` → Claude API calls
- `src/ai/providers/base-provider.ts` → Provider base class
- `src/pipeline/types/pipeline-types.ts` → Type definitions

### Total Files Involved: **~25 TypeScript files**

### Total AI API Calls in Test:
- Step 1: 1 call
- Step 2: 1 call
- Step 3: 3 calls (1 per PBI)
- Step 4: 12 calls (4 per PBI × 3 PBIs)
- Step 5: 3 calls (1 per PBI)
- Step 6: 2 calls before failure
- **Total: ~22 Claude API calls**
- **Total cost: ~$0.036 USD**
