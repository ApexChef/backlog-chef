# YAML Configuration to Code Implementation Mapping

## Overview

This document explains the exact relationship between YAML configuration files and TypeScript implementation files in the Backlog Chef pipeline.

## Directory Structure

```
backlog-chef/
├── config/
│   ├── workflows/                           # Pipeline definitions
│   │   ├── refinement-full.yaml
│   │   ├── refinement-minimal.yaml
│   │   └── refinement-no-step7.yaml
│   │
│   ├── steps/                               # Step configurations
│   │   ├── step-01-event-detection.yaml
│   │   ├── step-02-extract-candidates.yaml
│   │   ├── step-03-score-confidence.yaml
│   │   ├── step-04-enrich-context.yaml
│   │   ├── step-05-check-risks.yaml
│   │   ├── step-06-generate-questions.yaml
│   │   ├── step-07-readiness-checker.yaml
│   │   └── step-08-final-output.yaml
│   │
│   └── definition-of-ready.yaml
│
└── src/
    └── pipeline/
        ├── executor.ts                      # Main pipeline executor
        ├── context.ts                       # Shared pipeline context
        ├── types.ts                         # Type definitions
        │
        └── steps/                           # Step implementations
            ├── 01-event-detection/
            │   ├── index.ts
            │   ├── types.ts
            │   └── subtasks/
            │       ├── detect-meeting-type.ts
            │       └── validate-transcript-quality.ts
            │
            ├── 02-extract-candidates/
            │   ├── index.ts
            │   └── subtasks/
            │       ├── identify-pbi-discussions.ts
            │       ├── extract-business-value.ts
            │       ├── extract-acceptance-criteria.ts
            │       └── identify-scope-boundaries.ts
            │
            ├── 07-readiness-checker/
            │   ├── index.ts
            │   ├── types.ts
            │   └── subtasks/
            │       ├── evaluate-readiness-criteria.ts
            │       ├── categorize-gaps.ts
            │       ├── calculate-readiness-score.ts
            │       └── recommend-next-actions.ts
            │
            └── 08-final-output/
                └── ...
```

---

## Mapping Rules

### Rule 1: Workflow YAML → Pipeline Executor

**YAML File**: `config/workflows/refinement-full.yaml`

```yaml
name: "Refinement Meeting - Full Pipeline"
pipeline:
  steps:
    - step_id: "07-readiness-checker"
      enabled: true
      config_file: "config/steps/step-07-readiness-checker.yaml"
```

**Maps To**: The `PipelineExecutor` loads this config and executes each enabled step.

**Code**: `src/pipeline/executor.ts`

```typescript
const executor = new PipelineExecutor('config/workflows/refinement-full.yaml')
await executor.execute(input)
```

---

### Rule 2: Step Config → Step Implementation Directory

**YAML File**: `config/steps/step-07-readiness-checker.yaml`

```yaml
step_id: "07-readiness-checker"
```

**Maps To**: Implementation directory

**Directory**: `src/pipeline/steps/07-readiness-checker/`

**Convention**: `step-{XX}-{name}.yaml` → `{XX}-{name}/`

---

### Rule 3: Subtask Config → Subtask Implementation File

**YAML Config**:

```yaml
subtasks:
  - name: "evaluate_readiness_criteria"
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/evaluate-readiness-criteria.ts"
    config:
      definition_of_ready: "config/definition-of-ready.yaml"
```

**Maps To**:

**File**: `src/pipeline/steps/07-readiness-checker/subtasks/evaluate-readiness-criteria.ts`

**Function Signature**:

```typescript
export default async function evaluateReadinessCriteria(
  context: PipelineContext,
  config: EvaluateReadinessConfig
): Promise<EvaluateReadinessResult> {
  // Implementation
}
```

**Convention**:
- YAML `name: "evaluate_readiness_criteria"` (snake_case)
- File: `evaluate-readiness-criteria.ts` (kebab-case)
- Function: `evaluateReadinessCriteria` (camelCase)

---

## Step 7 Complete Mapping Example

### YAML Configuration

**File**: `config/steps/step-07-readiness-checker.yaml`

```yaml
step_id: "07-readiness-checker"
subtasks:

  - name: "evaluate_readiness_criteria"
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/evaluate-readiness-criteria.ts"
    config:
      definition_of_ready: "config/definition-of-ready.yaml"

  - name: "categorize_gaps"
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/categorize-gaps.ts"
    config:
      categories: [blocking, warning, suggestion]

  - name: "calculate_readiness_score"
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/calculate-readiness-score.ts"
    config:
      scoring_algorithm: "weighted"
      pass_threshold: 80

  - name: "recommend_next_actions"
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/recommend-next-actions.ts"
    config:
      prioritization_strategy: "critical_path"
```

### Implementation Files

#### File 1: `evaluate-readiness-criteria.ts`

```typescript
// src/pipeline/steps/07-readiness-checker/subtasks/evaluate-readiness-criteria.ts

import { PipelineContext } from '../../../context'
import { EvaluateReadinessConfig, EvaluateReadinessResult } from '../types'
import { loadDefinitionOfReady } from '../utils'

export default async function evaluateReadinessCriteria(
  context: PipelineContext,
  config: EvaluateReadinessConfig
): Promise<EvaluateReadinessResult> {

  // Load Definition of Ready from config path
  const dor = await loadDefinitionOfReady(config.definition_of_ready)

  // Get PBIs from context (set by previous steps)
  const pbis = context.get('candidates')

  // Evaluate each PBI against each criterion
  const results = await Promise.all(
    pbis.map(async (pbi) => {
      const criteriaResults = await Promise.all(
        dor.criteria.map((criterion) => evaluateCriterion(pbi, criterion))
      )

      return {
        pbi_id: pbi.id,
        criteria_results: criteriaResults,
        all_passed: criteriaResults.every((r) => r.passed)
      }
    })
  )

  // Store results in context for next subtasks
  context.setSubtaskResult('07-readiness-checker', 'evaluate_readiness_criteria', results)

  return { evaluations: results }
}

async function evaluateCriterion(pbi: any, criterion: any): Promise<any> {
  // Evaluation logic
  return {
    criterion_id: criterion.id,
    passed: true,
    evidence: "..."
  }
}
```

#### File 2: `categorize-gaps.ts`

```typescript
// src/pipeline/steps/07-readiness-checker/subtasks/categorize-gaps.ts

import { PipelineContext } from '../../../context'
import { CategorizeGapsConfig, CategorizeGapsResult } from '../types'

export default async function categorizeGaps(
  context: PipelineContext,
  config: CategorizeGapsConfig
): Promise<CategorizeGapsResult> {

  // Get evaluation results from previous subtask
  const evaluations = context.getSubtaskResult(
    '07-readiness-checker',
    'evaluate_readiness_criteria'
  )

  const categorizedResults = evaluations.evaluations.map((evaluation) => {
    const gaps = evaluation.criteria_results.filter((r) => !r.passed)

    const categorized = {
      blocking: [],
      warning: [],
      suggestion: []
    }

    // Categorize each gap based on config rules
    for (const gap of gaps) {
      const severity = determineSeverity(gap, config)
      categorized[severity].push(gap)
    }

    return {
      pbi_id: evaluation.pbi_id,
      gaps: categorized,
      fails_readiness: categorized.blocking.length > 0
    }
  })

  context.setSubtaskResult('07-readiness-checker', 'categorize_gaps', categorizedResults)

  return { categorized_gaps: categorizedResults }
}

function determineSeverity(gap: any, config: CategorizeGapsConfig): string {
  // Use config.rules to determine severity
  if (config.rules.blocking_criteria.includes(gap.criterion_id)) {
    return 'blocking'
  }
  // ... more logic
  return 'suggestion'
}
```

#### File 3: `calculate-readiness-score.ts`

```typescript
// src/pipeline/steps/07-readiness-checker/subtasks/calculate-readiness-score.ts

import { PipelineContext } from '../../../context'
import { CalculateScoreConfig, CalculateScoreResult } from '../types'

export default async function calculateReadinessScore(
  context: PipelineContext,
  config: CalculateScoreConfig
): Promise<CalculateScoreResult> {

  const evaluations = context.getSubtaskResult(
    '07-readiness-checker',
    'evaluate_readiness_criteria'
  )

  const scores = evaluations.evaluations.map((evaluation) => {
    let score: number

    switch (config.scoring_algorithm) {
      case 'weighted':
        score = calculateWeightedScore(evaluation, config.weights)
        break
      case 'binary':
        score = evaluation.all_passed ? 100 : 0
        break
      case 'percentage':
        const passed = evaluation.criteria_results.filter(r => r.passed).length
        score = (passed / evaluation.criteria_results.length) * 100
        break
    }

    return {
      pbi_id: evaluation.pbi_id,
      score,
      passed: score >= config.pass_threshold
    }
  })

  context.setSubtaskResult('07-readiness-checker', 'calculate_readiness_score', scores)

  return { scores }
}

function calculateWeightedScore(evaluation: any, weights: any): number {
  // Weighted scoring logic
  return 75
}
```

#### File 4: `recommend-next-actions.ts`

```typescript
// src/pipeline/steps/07-readiness-checker/subtasks/recommend-next-actions.ts

import { PipelineContext } from '../../../context'
import { RecommendActionsConfig, RecommendActionsResult } from '../types'

export default async function recommendNextActions(
  context: PipelineContext,
  config: RecommendActionsConfig
): Promise<RecommendActionsResult> {

  const categorizedGaps = context.getSubtaskResult(
    '07-readiness-checker',
    'categorize_gaps'
  )

  const recommendations = categorizedGaps.categorized_gaps.map((pbiGaps) => {
    const actions = {
      immediate: generateActionsForGaps(pbiGaps.gaps.blocking, config),
      before_sprint: generateActionsForGaps(pbiGaps.gaps.warning, config),
      nice_to_have: generateActionsForGaps(pbiGaps.gaps.suggestion, config)
    }

    return {
      pbi_id: pbiGaps.pbi_id,
      recommended_next_actions: actions
    }
  })

  context.setSubtaskResult('07-readiness-checker', 'recommend_next_actions', recommendations)

  return { recommendations }
}

function generateActionsForGaps(gaps: any[], config: RecommendActionsConfig): any[] {
  // Action generation logic
  return gaps.map(gap => ({
    action: `Resolve: ${gap.criterion_id}`,
    priority: "HIGH",
    owner: "TBD",
    estimated_time: "2 hours"
  }))
}
```

---

## How Disabling Works

### Disable Entire Step (Step 7)

**YAML**: `config/workflows/refinement-no-step7.yaml`

```yaml
pipeline:
  steps:
    - step_id: "07-readiness-checker"
      enabled: false  # Step completely skipped
```

**Result**:
- Pipeline executor skips this step entirely
- No subtasks are executed
- Files in `src/pipeline/steps/07-readiness-checker/` are not loaded

---

### Disable Single Subtask (calculate_readiness_score)

**YAML**: `config/steps/step-07-readiness-checker-no-scoring.yaml`

```yaml
subtasks:
  - name: "evaluate_readiness_criteria"
    enabled: true

  - name: "categorize_gaps"
    enabled: true

  - name: "calculate_readiness_score"
    enabled: false  # This subtask is skipped

  - name: "recommend_next_actions"
    enabled: true
```

**Result**:
- `evaluate-readiness-criteria.ts` executes
- `categorize-gaps.ts` executes
- `calculate-readiness-score.ts` is NOT loaded or executed
- `recommend-next-actions.ts` executes (but without score data)

---

## Adding New Subtasks

### Step 1: Add to YAML Config

**File**: `config/steps/step-07-readiness-checker.yaml`

```yaml
subtasks:
  # ... existing subtasks

  - name: "generate_readiness_report"  # NEW SUBTASK
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/generate-readiness-report.ts"
    order: 5
    config:
      template: "config/templates/readiness-report.md"
      format: "markdown"
```

### Step 2: Create Implementation File

**File**: `src/pipeline/steps/07-readiness-checker/subtasks/generate-readiness-report.ts`

```typescript
import { PipelineContext } from '../../../context'
import { GenerateReportConfig, GenerateReportResult } from '../types'

export default async function generateReadinessReport(
  context: PipelineContext,
  config: GenerateReportConfig
): Promise<GenerateReportResult> {

  // Get all previous results from context
  const evaluations = context.getSubtaskResult('07-readiness-checker', 'evaluate_readiness_criteria')
  const gaps = context.getSubtaskResult('07-readiness-checker', 'categorize_gaps')
  const scores = context.getSubtaskResult('07-readiness-checker', 'calculate_readiness_score')
  const actions = context.getSubtaskResult('07-readiness-checker', 'recommend_next_actions')

  // Generate report
  const report = formatReport(evaluations, gaps, scores, actions, config)

  return { report }
}

function formatReport(...args: any[]): string {
  // Report generation logic
  return "# Readiness Report\n\n..."
}
```

### Step 3: Use It

The subtask is automatically included when the workflow runs!

---

## Configuration Variants Summary

| Variant | Use Case | Step 7 Enabled? | Subtasks |
|---------|----------|-----------------|----------|
| **Full Pipeline** | Production, complete analysis | ✅ Yes | All 4 subtasks enabled |
| **No Scoring** | Binary ready/not-ready | ✅ Yes | 3 subtasks (scoring disabled) |
| **Actions Only** | Generate action items from existing gaps | ✅ Yes | 2 subtasks (evaluation disabled) |
| **No Step 7** | Quick summary without readiness check | ❌ No | N/A (step skipped) |

---

## Validation

The system validates configurations at runtime:

```typescript
// src/pipeline/utils/config-validator.ts

export function validateWorkflowConfig(config: WorkflowConfig): ValidationResult {
  // Check all step IDs are valid
  // Check all subtask implementations exist
  // Check all config files are present
  // Check for circular dependencies

  return { valid: true, errors: [] }
}
```

**Usage**:

```bash
npm run validate-config -- config/workflows/refinement-full.yaml
```

---

## Summary

✅ **YAML config files** define WHAT to run and HOW to configure it
✅ **TypeScript implementation files** define the actual logic
✅ **Mapping is explicit** via `implementation` paths in YAML
✅ **Enable/disable** at workflow level (entire steps) or step level (individual subtasks)
✅ **Reordering** is supported via `order` property
✅ **Adding new subtasks** only requires YAML config + one TypeScript file
