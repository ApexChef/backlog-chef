# Configuration Examples Summary

## Quick Reference: All Configuration Variants

### Available Workflow Configurations

| Configuration File | Description | Steps Enabled | Use Case |
|-------------------|-------------|---------------|----------|
| `refinement-full.yaml` | Complete 8-step pipeline with all features | 1-8 (all) | Production use, comprehensive analysis |
| `refinement-minimal.yaml` | Fast processing, basic output | 1-2, 6, 8 | Quick meeting summaries |
| `refinement-no-step7.yaml` | Everything except readiness checking | 1-6, 8 | Teams doing manual readiness checks |

### Available Step 7 Configurations

| Configuration File | Description | Subtasks | Output |
|-------------------|-------------|----------|--------|
| `step-07-readiness-checker.yaml` | Full readiness evaluation (default) | All 4 subtasks | Status + Score + Actions |
| `step-07-readiness-checker-no-scoring.yaml` | Binary ready/not-ready | 3 subtasks (no scoring) | Status + Actions |
| `step-07-readiness-checker-actions-only.yaml` | Action generation from existing gaps | 2 subtasks | Actions only |

---

## Configuration Usage Examples

### Example 1: Run Full Pipeline

```bash
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-full.yaml \
  --output output/
```

**What happens:**
1. All 8 steps execute
2. All subtasks in each step execute
3. Complete analysis with readiness scores, questions, and recommendations
4. Output in all formats (DevOps, Obsidian, Confluence)

---

### Example 2: Skip Readiness Checker Entirely

```bash
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-no-step7.yaml \
  --output output/
```

**What happens:**
1. Steps 1-6 execute (event detection through question generation)
2. **Step 7 is completely skipped**
3. Step 8 outputs results without readiness assessment
4. Faster execution, suitable for quick summaries

---

### Example 3: Binary Ready/Not-Ready (No Numeric Scores)

**Option A: Override at workflow level**

```bash
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-full.yaml \
  --override-step-config 07-readiness-checker=config/steps/step-07-readiness-checker-no-scoring.yaml \
  --output output/
```

**Option B: Create custom workflow**

Create `config/workflows/refinement-binary-readiness.yaml`:

```yaml
name: "Refinement - Binary Readiness"
pipeline:
  steps:
    # ... Steps 1-6 normal

    - step_id: "07-readiness-checker"
      enabled: true
      config_file: "config/steps/step-07-readiness-checker-no-scoring.yaml"  # Use variant config

    # ... Step 8 normal
```

Then run:

```bash
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-binary-readiness.yaml \
  --output output/
```

**What happens:**
1. Steps 1-6 execute normally
2. Step 7 executes with only 3 subtasks:
   - ✅ `evaluate_readiness_criteria`
   - ✅ `categorize_gaps`
   - ❌ `calculate_readiness_score` (disabled)
   - ✅ `recommend_next_actions`
3. Output shows "READY" or "NOT READY" without numeric scores

---

### Example 4: Disable Specific Subtask via CLI

```bash
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-full.yaml \
  --disable-subtask 07-readiness-checker.calculate_readiness_score \
  --output output/
```

**What happens:**
1. Full pipeline runs
2. Step 7 executes all subtasks EXCEPT `calculate_readiness_score`
3. Same result as using `step-07-readiness-checker-no-scoring.yaml`

---

### Example 5: Enable Experimental Subtask

```bash
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-full.yaml \
  --enable-subtask 07-readiness-checker.generate_readiness_report \
  --output output/
```

**What happens:**
1. Full pipeline runs
2. Step 7 includes an additional experimental subtask if defined in config

---

## Step 7 Subtask Behavior Matrix

| Subtask | Default | No Scoring | Actions Only | Purpose |
|---------|---------|------------|--------------|---------|
| `evaluate_readiness_criteria` | ✅ | ✅ | ❌ | Check against Definition of Ready |
| `categorize_gaps` | ✅ | ✅ | ✅ | Classify gaps by severity |
| `calculate_readiness_score` | ✅ | ❌ | ❌ | Calculate 0-100 score |
| `recommend_next_actions` | ✅ | ✅ | ✅ | Generate action items |

---

## Configuration Inheritance

Configurations can reference and extend other configurations:

```yaml
# config/workflows/refinement-custom.yaml
name: "My Custom Workflow"

# Inherit from full pipeline
extends: "config/workflows/refinement-full.yaml"

# Override specific step configurations
overrides:
  steps:
    - step_id: "07-readiness-checker"
      config_file: "config/steps/step-07-readiness-checker-no-scoring.yaml"

    - step_id: "08-final-output"
      subtasks:
        - name: "format_for_confluence"
          enabled: false  # Disable Confluence output
```

---

## Dynamic Configuration via Environment Variables

```bash
# Production: Full pipeline with all features
export WORKFLOW_CONFIG=refinement-full

# Development: Fast pipeline for testing
export WORKFLOW_CONFIG=refinement-minimal

# CI/CD: Skip expensive operations
export WORKFLOW_CONFIG=refinement-no-enrichment

npm run process -- --transcript input.json
```

---

## Configuration Validation

Validate configurations before running:

```bash
# Validate workflow
npm run validate-config -- config/workflows/refinement-full.yaml

# Validate step configuration
npm run validate-config -- config/steps/step-07-readiness-checker.yaml

# Validate all configurations
npm run validate-config -- config/**/*.yaml
```

**Output:**

```
✅ config/workflows/refinement-full.yaml - Valid
✅ config/workflows/refinement-minimal.yaml - Valid
❌ config/workflows/refinement-custom.yaml - Invalid
   - Error: Step implementation not found: src/pipeline/steps/99-invalid/subtasks/missing.ts
   - Warning: Deprecated config key: scoring_method (use scoring_algorithm)

Summary: 2 valid, 1 invalid
```

---

## Programmatic Usage

```typescript
import { PipelineExecutor } from './pipeline/executor'

// Use predefined workflow
const executor = new PipelineExecutor('config/workflows/refinement-full.yaml')
const result = await executor.execute(transcriptData)

// Use custom inline configuration
const customExecutor = new PipelineExecutor({
  name: "Custom Pipeline",
  pipeline: {
    steps: [
      { step_id: "01-event-detection", enabled: true },
      { step_id: "02-extract-candidates", enabled: true },
      // ... customize as needed
      { step_id: "07-readiness-checker", enabled: false }, // Disable Step 7
      { step_id: "08-final-output", enabled: true }
    ]
  }
})
const customResult = await customExecutor.execute(transcriptData)

// Override specific step configuration
const overrideExecutor = new PipelineExecutor('config/workflows/refinement-full.yaml')
overrideExecutor.overrideStepConfig('07-readiness-checker', {
  subtasks: [
    { name: "evaluate_readiness_criteria", enabled: true },
    { name: "categorize_gaps", enabled: true },
    { name: "calculate_readiness_score", enabled: false }, // Disable scoring
    { name: "recommend_next_actions", enabled: true }
  ]
})
const overrideResult = await overrideExecutor.execute(transcriptData)
```

---

## Migration Strategy

### Phase 1: Core Pipeline Executor
- Implement YAML loading
- Implement dynamic module loading
- Implement context passing between subtasks

### Phase 2: Basic Steps (1-3)
- Implement Steps 1-3 with subtasks
- Test with minimal workflow

### Phase 3: Advanced Steps (4-6)
- Implement Steps 4-6 with external API calls
- Test with full workflow

### Phase 4: Quality Steps (7-8)
- Implement Steps 7-8
- Test all configuration variants

### Phase 5: Configuration Enhancements
- Add conditional execution
- Add configuration inheritance
- Add CLI overrides

---

## Best Practices

### 1. Start with Full Pipeline
Use `refinement-full.yaml` as the baseline, then create variants as needed.

### 2. Document Configuration Variants
Create a README in `config/workflows/` explaining when to use each variant.

### 3. Version Your Configurations
Include version numbers in config files:

```yaml
name: "Refinement Pipeline"
version: "2.1.0"
```

### 4. Test Configuration Changes
Always validate configurations before deploying:

```bash
npm run test:config -- config/workflows/new-workflow.yaml
```

### 5. Use Environment-Specific Configs

```
config/
├── workflows/
│   ├── production/
│   │   └── refinement-full.yaml
│   ├── staging/
│   │   └── refinement-full.yaml  (with test data sources)
│   └── development/
│       └── refinement-minimal.yaml  (fast iteration)
```

---

## Troubleshooting

### Problem: Step 7 not running

**Check:**
1. Is `enabled: true` in workflow config?
2. Is the step_id correct (`07-readiness-checker`)?
3. Does `config_file` path exist?

### Problem: Subtask not executing

**Check:**
1. Is `enabled: true` in step config?
2. Does `implementation` file path exist?
3. Is function exported correctly?

### Problem: Configuration not loading

**Check:**
1. YAML syntax valid?
2. File paths absolute or relative to project root?
3. Run `npm run validate-config`

---

## Summary

✅ **Multiple workflow variants** for different use cases
✅ **Flexible step configuration** via separate config files
✅ **Subtask-level control** - enable/disable/reorder individual subtasks
✅ **CLI overrides** for one-off customizations
✅ **Programmatic API** for dynamic configuration
✅ **Validation tools** to catch errors early

The configuration system is **fully dynamic** - you can disable Step 7 entirely, run it without scoring, or customize any subtask without changing implementation code.
