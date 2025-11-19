# Workflow Configurations

This directory contains YAML workflow configurations for the Backlog Chef pipeline. Each workflow represents a different processing strategy optimized for specific use cases.

## Available Workflows

### 1. `refinement-full.yaml` - Complete Pipeline ⭐
**Use for**: Production processing, comprehensive analysis

**Enabled Steps**: All 8 steps with all subtasks
- ✅ Event Detection
- ✅ Extract Candidates
- ✅ Score Confidence
- ✅ Enrich with Context
- ✅ Check Risks & Conflicts
- ✅ Generate Questions & Proposals
- ✅ Run Readiness Checker (with scoring)
- ✅ Final Output (all formats)

**Processing Time**: ~2-3 minutes per meeting
**LLM Model**: Claude 3.5 Sonnet
**Best for**: Production deployments, complete quality analysis

---

### 2. `refinement-minimal.yaml` - Fast Processing ⚡
**Use for**: Quick meeting summaries, demo environments, testing

**Enabled Steps**: Steps 1, 2, 6, 8 (basic extraction and questions only)
- ✅ Event Detection (basic)
- ✅ Extract Candidates (basic)
- ❌ Score Confidence
- ❌ Enrich with Context
- ❌ Check Risks
- ✅ Generate Questions (basic routing only)
- ❌ Readiness Checker
- ✅ Final Output (DevOps only)

**Processing Time**: ~30-45 seconds per meeting
**LLM Model**: Claude 3.5 Haiku (faster, cheaper)
**Best for**: Quick turnarounds, low-budget scenarios, demos

---

### 3. `refinement-no-step7.yaml` - No Readiness Check 🔍
**Use for**: Teams doing manual readiness assessment

**Enabled Steps**: Steps 1-6, 8 (skip readiness checker)
- ✅ Event Detection
- ✅ Extract Candidates
- ✅ Score Confidence
- ✅ Enrich with Context
- ✅ Check Risks & Conflicts
- ✅ Generate Questions & Proposals
- ❌ Readiness Checker
- ✅ Final Output

**Processing Time**: ~1.5-2 minutes per meeting
**LLM Model**: Claude 3.5 Sonnet
**Best for**: Teams with manual Definition of Ready process

---

### 4. `refinement-binary-readiness.yaml` - Simple Ready/Not Ready ✅❌
**Use for**: Teams who prefer binary decisions without numeric scores

**Enabled Steps**: All 8 steps, but Step 7 uses binary variant
- ✅ All steps 1-6
- ✅ Readiness Checker (binary mode - no numeric scores)
- ✅ Final Output

**Processing Time**: ~2-3 minutes per meeting
**LLM Model**: Claude 3.5 Sonnet
**Best for**: Teams who dislike debating readiness scores

---

### 5. `refinement-with-enrichment-only.yaml` - Context Focus 📚
**Use for**: Learning from past work, identifying patterns, estimation help

**Enabled Steps**: Focus on historical context and similar work
- ✅ Event Detection
- ✅ Extract Candidates
- ✅ Score Confidence
- ✅ **Enrich with Context** (expanded - more results, more sources)
- ✅ Check Risks (basic dependencies only)
- ✅ Generate Questions
- ❌ Readiness Checker
- ✅ Final Output (Obsidian + DevOps + Email)

**Processing Time**: ~2-2.5 minutes per meeting
**LLM Model**: Claude 3.5 Sonnet
**Best for**: Teams who want to learn from history, improve estimates

---

### 6. `refinement-questions-only.yaml` - Question Generator 💬
**Use for**: Pre-refinement prep, distributed refinement, async follow-up

**Enabled Steps**: Extract + comprehensive question generation only
- ✅ Event Detection
- ✅ Extract Candidates
- ❌ Score Confidence
- ❌ Enrich with Context
- ❌ Check Risks
- ✅ **Generate Questions** (all subtasks, more proposals)
- ❌ Readiness Checker
- ✅ Final Output (with question focus)

**Processing Time**: ~1-1.5 minutes per meeting
**LLM Model**: Claude 3.5 Sonnet (higher temperature for creativity)
**Best for**: Generating follow-up questions for async refinement

---

### 7. `refinement-risk-focused.yaml` - Deep Risk Analysis ⚠️
**Use for**: Complex projects, high-risk features, architectural changes

**Enabled Steps**: Enhanced risk detection and dependency analysis
- ✅ Event Detection
- ✅ Extract Candidates
- ✅ Score Confidence
- ✅ Enrich with Context (focus on past failures)
- ✅ **Check Risks** (ALL subtasks, enhanced configuration)
- ✅ Generate Questions
- ✅ Readiness Checker (higher thresholds, risk-weighted scoring)
- ✅ Final Output

**Processing Time**: ~3-4 minutes per meeting
**LLM Model**: Claude 3.5 Sonnet (lower temperature for conservative assessment)
**Best for**: Large features, architectural changes, compliance-heavy work

---

## Usage Examples

### Running a workflow

```bash
# Full pipeline
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-full.yaml

# Minimal pipeline (fast)
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-minimal.yaml

# Binary readiness (no scores)
npm run process -- \
  --transcript transcripts/refinement-2024-01-15.json \
  --workflow config/workflows/refinement-binary-readiness.yaml
```

### Overriding configurations

```bash
# Use full pipeline but disable Step 7
npm run process -- \
  --transcript input.json \
  --workflow config/workflows/refinement-full.yaml \
  --disable-step 07-readiness-checker

# Use full pipeline but disable specific subtask
npm run process -- \
  --transcript input.json \
  --workflow config/workflows/refinement-full.yaml \
  --disable-subtask 07-readiness-checker.calculate_readiness_score
```

---

## Workflow Selection Guide

| Scenario | Recommended Workflow |
|----------|---------------------|
| **Production processing** | `refinement-full.yaml` |
| **Quick demo** | `refinement-minimal.yaml` |
| **Testing new features** | `refinement-minimal.yaml` |
| **Learning from history** | `refinement-with-enrichment-only.yaml` |
| **Pre-refinement prep** | `refinement-questions-only.yaml` |
| **High-risk feature** | `refinement-risk-focused.yaml` |
| **Team does manual readiness** | `refinement-no-step7.yaml` |
| **Avoid score debates** | `refinement-binary-readiness.yaml` |

---

## Configuration Structure

All workflows follow this structure:

```yaml
name: "Workflow Name"
description: "What this workflow does"
version: "1.0.0"

pipeline:
  steps:
    - step_id: "XX-step-name"
      enabled: true/false
      config_file: "config/steps/step-XX-step-name.yaml"
      subtasks:  # Optional: override specific subtasks
        - name: "subtask_name"
          enabled: true/false
          implementation: "path/to/file.ts"
          config: { ... }

global:
  llm:
    provider: "anthropic"
    model: "claude-3-5-sonnet-20241022"
    temperature: 0.3
  logging:
    level: "info"
  error_handling:
    retry_count: 3
```

---

## Creating Custom Workflows

1. Copy an existing workflow as a starting point
2. Modify which steps are enabled/disabled
3. Override step configurations as needed
4. Test with validation tool:
   ```bash
   npm run validate-config -- config/workflows/my-custom-workflow.yaml
   ```
5. Run your workflow:
   ```bash
   npm run process -- --workflow config/workflows/my-custom-workflow.yaml --transcript input.json
   ```

---

## Step Configuration Files

Each step has its own configuration file in `config/steps/`:
- `step-01-event-detection.yaml`
- `step-02-extract-candidates.yaml`
- `step-03-score-confidence.yaml`
- `step-04-enrich-context.yaml`
- `step-05-check-risks.yaml`
- `step-06-generate-questions.yaml`
- `step-07-readiness-checker.yaml` (default with scoring)
- `step-07-readiness-checker-no-scoring.yaml` (binary variant)
- `step-07-readiness-checker-actions-only.yaml` (actions only)
- `step-08-final-output.yaml`

See the `config/steps/` directory for detailed configuration options.

---

## Questions?

See the full documentation:
- **Architecture**: `docs/technical/pipeline-configuration-architecture.md`
- **YAML-to-Code Mapping**: `docs/technical/yaml-to-code-mapping.md`
- **Configuration Examples**: `docs/technical/configuration-examples-summary.md`
