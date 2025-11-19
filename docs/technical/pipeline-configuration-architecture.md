# Pipeline Configuration Architecture

## Overview

The Backlog Chef system uses a **fully configurable YAML-based pipeline** where:
1. Each step can be enabled/disabled
2. Each step's subtasks can be reordered, removed, or customized
3. Step implementations are dynamically loaded based on configuration
4. The system remains modular and maintainable

## Configuration Hierarchy

```
config/
├── workflows/
│   ├── refinement.yaml          # Refinement meeting pipeline
│   ├── planning.yaml             # Sprint planning pipeline
│   ├── retrospective.yaml        # Retrospective pipeline
│   └── custom-workflow.yaml      # Custom workflow example
├── steps/
│   ├── step-01-event-detection.yaml
│   ├── step-02-extract-candidates.yaml
│   ├── step-03-score-confidence.yaml
│   ├── step-04-enrich-context.yaml
│   ├── step-05-check-risks.yaml
│   ├── step-06-generate-questions.yaml
│   ├── step-07-readiness-checker.yaml
│   └── step-08-final-output.yaml
└── definition-of-ready.yaml
```

## File-to-Code Mapping Convention

**Convention**: Each subtask maps to a TypeScript module using the pattern:

```
config/steps/step-{XX}-{name}.yaml
  └─> src/pipeline/steps/{XX}-{name}/
      ├── index.ts                    # Main orchestrator
      ├── subtasks/
      │   ├── {subtask-name}.ts       # Individual subtask implementation
      │   └── {another-subtask}.ts
      ├── types.ts                    # Step-specific types
      └── README.md                   # Step documentation
```

## Complete Configuration Examples

### 1. Full Refinement Pipeline (All Features Enabled)

**File**: `config/workflows/refinement-full.yaml`

```yaml
name: "Refinement Meeting - Full Pipeline"
description: "Complete 8-step pipeline with all quality checks"
version: "1.0.0"

pipeline:
  steps:

    # Step 1: Event Detection
    - step_id: "01-event-detection"
      enabled: true
      config_file: "config/steps/step-01-event-detection.yaml"
      subtasks:
        - name: "detect_meeting_type"
          enabled: true
          implementation: "src/pipeline/steps/01-event-detection/subtasks/detect-meeting-type.ts"
          config:
            confidence_threshold: 0.85
            fallback_to_manual: true

        - name: "validate_transcript_quality"
          enabled: true
          implementation: "src/pipeline/steps/01-event-detection/subtasks/validate-transcript-quality.ts"
          config:
            min_duration_minutes: 15
            min_speaker_count: 2
            min_word_count: 500

    # Step 2: Extract Candidate PBIs
    - step_id: "02-extract-candidates"
      enabled: true
      config_file: "config/steps/step-02-extract-candidates.yaml"
      subtasks:
        - name: "identify_pbi_discussions"
          enabled: true
          implementation: "src/pipeline/steps/02-extract-candidates/subtasks/identify-pbi-discussions.ts"

        - name: "extract_business_value"
          enabled: true
          implementation: "src/pipeline/steps/02-extract-candidates/subtasks/extract-business-value.ts"

        - name: "extract_acceptance_criteria"
          enabled: true
          implementation: "src/pipeline/steps/02-extract-candidates/subtasks/extract-acceptance-criteria.ts"

        - name: "identify_scope_boundaries"
          enabled: true
          implementation: "src/pipeline/steps/02-extract-candidates/subtasks/identify-scope-boundaries.ts"

    # Step 3: Score Confidence
    - step_id: "03-score-confidence"
      enabled: true
      config_file: "config/steps/step-03-score-confidence.yaml"
      subtasks:
        - name: "evaluate_completeness"
          enabled: true
          implementation: "src/pipeline/steps/03-score-confidence/subtasks/evaluate-completeness.ts"
          config:
            scoring_rubric: "config/scoring-rubric.yaml"

        - name: "calculate_confidence_score"
          enabled: true
          implementation: "src/pipeline/steps/03-score-confidence/subtasks/calculate-confidence-score.ts"
          config:
            weights:
              business_value: 0.25
              acceptance_criteria: 0.20
              technical_approach: 0.20
              scope_clarity: 0.20
              estimability: 0.15

        - name: "identify_missing_elements"
          enabled: true
          implementation: "src/pipeline/steps/03-score-confidence/subtasks/identify-missing-elements.ts"

    # Step 4: Enrich with Context
    - step_id: "04-enrich-context"
      enabled: true
      config_file: "config/steps/step-04-enrich-context.yaml"
      subtasks:
        - name: "search_similar_pbis"
          enabled: true
          implementation: "src/pipeline/steps/04-enrich-context/subtasks/search-similar-pbis.ts"
          config:
            similarity_threshold: 0.75
            max_results: 5
            sources:
              - "azure_devops"
              - "jira"

        - name: "retrieve_past_estimates"
          enabled: true
          implementation: "src/pipeline/steps/04-enrich-context/subtasks/retrieve-past-estimates.ts"

        - name: "search_technical_docs"
          enabled: true
          implementation: "src/pipeline/steps/04-enrich-context/subtasks/search-technical-docs.ts"
          config:
            sources:
              - type: "confluence"
                spaces: ["DEV", "ARCH", "GDPR"]
              - type: "sharepoint"
                sites: ["technical-docs"]
              - type: "github"
                repos: ["internal/knowledge-base"]

        - name: "retrieve_team_history"
          enabled: true
          implementation: "src/pipeline/steps/04-enrich-context/subtasks/retrieve-team-history.ts"

    # Step 5: Check Risks & Conflicts
    - step_id: "05-check-risks"
      enabled: true
      config_file: "config/steps/step-05-check-risks.yaml"
      subtasks:
        - name: "detect_dependencies"
          enabled: true
          implementation: "src/pipeline/steps/05-check-risks/subtasks/detect-dependencies.ts"

        - name: "identify_scope_creep"
          enabled: true
          implementation: "src/pipeline/steps/05-check-risks/subtasks/identify-scope-creep.ts"
          config:
            complexity_threshold: 8.0
            warn_on_multi_domain: true

        - name: "check_technical_blockers"
          enabled: true
          implementation: "src/pipeline/steps/05-check-risks/subtasks/check-technical-blockers.ts"

        - name: "validate_resource_availability"
          enabled: true
          implementation: "src/pipeline/steps/05-check-risks/subtasks/validate-resource-availability.ts"
          config:
            check_license_capacity: true
            check_api_limits: true

    # Step 6: Generate Questions & Proposals
    - step_id: "06-generate-questions"
      enabled: true
      config_file: "config/steps/step-06-generate-questions.yaml"
      subtasks:
        - name: "identify_unanswered_questions"
          enabled: true
          implementation: "src/pipeline/steps/06-generate-questions/subtasks/identify-unanswered-questions.ts"

        - name: "classify_by_domain"
          enabled: true
          implementation: "src/pipeline/steps/06-generate-questions/subtasks/classify-by-domain.ts"
          config:
            domains:
              - "business"
              - "technical"
              - "ux"
              - "security"
              - "compliance"

        - name: "route_to_stakeholders"
          enabled: true
          implementation: "src/pipeline/steps/06-generate-questions/subtasks/route-to-stakeholders.ts"
          config:
            stakeholder_registry: "config/stakeholders.yaml"

        - name: "generate_proposed_answers"
          enabled: true
          implementation: "src/pipeline/steps/06-generate-questions/subtasks/generate-proposed-answers.ts"
          config:
            confidence_threshold_to_propose: 0.6
            max_alternatives: 3

        - name: "search_documentation"
          enabled: true
          implementation: "src/pipeline/steps/06-generate-questions/subtasks/search-documentation.ts"
          config:
            confluence_enabled: true
            sharepoint_enabled: true
            timeout_seconds: 30

    # Step 7: Run Readiness Checker
    - step_id: "07-readiness-checker"
      enabled: true
      config_file: "config/steps/step-07-readiness-checker.yaml"
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
            categories:
              - severity: "blocking"
                fails_readiness: true
              - severity: "warning"
                fails_readiness: false
              - severity: "suggestion"
                fails_readiness: false

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
            include_time_estimates: true

    # Step 8: Final Output
    - step_id: "08-final-output"
      enabled: true
      config_file: "config/steps/step-08-final-output.yaml"
      subtasks:
        - name: "format_for_devops"
          enabled: true
          implementation: "src/pipeline/steps/08-final-output/subtasks/format-for-devops.ts"
          config:
            adapter: "config/adapters/azure-devops.yaml"

        - name: "format_for_obsidian"
          enabled: true
          implementation: "src/pipeline/steps/08-final-output/subtasks/format-for-obsidian.ts"
          config:
            adapter: "config/adapters/obsidian.yaml"

        - name: "format_for_confluence"
          enabled: true
          implementation: "src/pipeline/steps/08-final-output/subtasks/format-for-confluence.ts"
          config:
            adapter: "config/adapters/confluence.yaml"

        - name: "generate_summary_email"
          enabled: true
          implementation: "src/pipeline/steps/08-final-output/subtasks/generate-summary-email.ts"

# Global Configuration
global:
  llm:
    provider: "anthropic"
    model: "claude-3-5-sonnet-20241022"
    temperature: 0.3
    max_tokens: 8000

  logging:
    level: "info"
    output_dir: "logs/pipeline"

  error_handling:
    retry_count: 3
    retry_delay_ms: 1000
    fail_on_step_error: false
    continue_on_subtask_error: true
```

---

### 2. Minimal Pipeline (Fast Processing)

**File**: `config/workflows/refinement-minimal.yaml`

```yaml
name: "Refinement Meeting - Minimal Pipeline"
description: "Fast processing: extract + questions only, no enrichment or readiness checks"
version: "1.0.0"

pipeline:
  steps:

    # Step 1: Event Detection (required)
    - step_id: "01-event-detection"
      enabled: true
      config_file: "config/steps/step-01-event-detection.yaml"
      subtasks:
        - name: "detect_meeting_type"
          enabled: true
          implementation: "src/pipeline/steps/01-event-detection/subtasks/detect-meeting-type.ts"

    # Step 2: Extract Candidates (simplified)
    - step_id: "02-extract-candidates"
      enabled: true
      config_file: "config/steps/step-02-extract-candidates.yaml"
      subtasks:
        - name: "identify_pbi_discussions"
          enabled: true
          implementation: "src/pipeline/steps/02-extract-candidates/subtasks/identify-pbi-discussions.ts"

        - name: "extract_business_value"
          enabled: true
          implementation: "src/pipeline/steps/02-extract-candidates/subtasks/extract-business-value.ts"

        # DISABLED: Skip acceptance criteria extraction for speed
        - name: "extract_acceptance_criteria"
          enabled: false

        # DISABLED: Skip scope boundaries for speed
        - name: "identify_scope_boundaries"
          enabled: false

    # Step 3: DISABLED - No confidence scoring
    - step_id: "03-score-confidence"
      enabled: false

    # Step 4: DISABLED - No context enrichment
    - step_id: "04-enrich-context"
      enabled: false

    # Step 5: DISABLED - No risk checking
    - step_id: "05-check-risks"
      enabled: false

    # Step 6: Generate Questions (simplified)
    - step_id: "06-generate-questions"
      enabled: true
      config_file: "config/steps/step-06-generate-questions.yaml"
      subtasks:
        - name: "identify_unanswered_questions"
          enabled: true
          implementation: "src/pipeline/steps/06-generate-questions/subtasks/identify-unanswered-questions.ts"

        - name: "route_to_stakeholders"
          enabled: true
          implementation: "src/pipeline/steps/06-generate-questions/subtasks/route-to-stakeholders.ts"
          config:
            stakeholder_registry: "config/stakeholders.yaml"

        # DISABLED: No proposed answers generation
        - name: "generate_proposed_answers"
          enabled: false

        # DISABLED: No documentation search
        - name: "search_documentation"
          enabled: false

    # Step 7: DISABLED - No readiness checking
    - step_id: "07-readiness-checker"
      enabled: false

    # Step 8: Output (basic format only)
    - step_id: "08-final-output"
      enabled: true
      config_file: "config/steps/step-08-final-output.yaml"
      subtasks:
        - name: "format_for_devops"
          enabled: true
          implementation: "src/pipeline/steps/08-final-output/subtasks/format-for-devops.ts"

        # DISABLED: No Obsidian format
        - name: "format_for_obsidian"
          enabled: false

        # DISABLED: No Confluence format
        - name: "format_for_confluence"
          enabled: false

global:
  llm:
    provider: "anthropic"
    model: "claude-3-5-haiku-20241022"  # Faster, cheaper model
    temperature: 0.3
    max_tokens: 4000
```

---

### 3. Custom Step 7 Configuration (Without Readiness Score)

**File**: `config/steps/step-07-readiness-checker-custom.yaml`

```yaml
step_id: "07-readiness-checker"
name: "Readiness Checker (Custom - No Scoring)"
description: "Evaluate readiness and categorize gaps, but don't calculate numeric scores"
version: "1.0.0"

subtasks:

  # Evaluate against Definition of Ready
  - name: "evaluate_readiness_criteria"
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/evaluate-readiness-criteria.ts"
    order: 1
    config:
      definition_of_ready: "config/definition-of-ready.yaml"
      parallel_evaluation: true
      cache_results: true

  # Categorize gaps by severity
  - name: "categorize_gaps"
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/categorize-gaps.ts"
    order: 2
    config:
      categories:
        - severity: "blocking"
          fails_readiness: true
          emoji: "❌"
        - severity: "warning"
          fails_readiness: false
          emoji: "⚠️"
        - severity: "suggestion"
          fails_readiness: false
          emoji: "💡"

      # Custom categorization rules
      rules:
        blocking_if:
          - "dependencies_unresolved"
          - "critical_questions_unanswered"
          - "not_estimable"
        warning_if:
          - "missing_design"
          - "performance_concerns"
          - "complexity_high"

  # DISABLED: Skip readiness score calculation
  - name: "calculate_readiness_score"
    enabled: false
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/calculate-readiness-score.ts"
    reason: "Team prefers binary ready/not-ready over numeric scores"

  # Recommend actions
  - name: "recommend_next_actions"
    enabled: true
    implementation: "src/pipeline/steps/07-readiness-checker/subtasks/recommend-next-actions.ts"
    order: 3
    config:
      prioritization_strategy: "severity_first"  # blocking > warning > suggestion
      include_time_estimates: true
      include_owner_suggestions: true
      max_actions_per_priority: 5

      action_categories:
        - category: "immediate"
          description: "Must do before sprint commitment"
          filter: "blocking"
        - category: "before_sprint"
          description: "Should complete before starting work"
          filter: "warning"
        - category: "nice_to_have"
          description: "Improves quality but not required"
          filter: "suggestion"

# Output schema
output:
  readiness_status:
    type: "enum"
    values:
      - "🔴 NOT READY"
      - "🟢 READY"
      # No numeric score, just binary status

  include_fields:
    - "definition_of_ready_checklist"
    - "recommended_next_actions"
    - "sprint_readiness_eta"

  exclude_fields:
    - "readiness_score"  # Explicitly excluded
```

---

### 4. Step 7 with Reordered Subtasks

**File**: `config/workflows/refinement-reordered-step7.yaml`

```yaml
name: "Refinement - Custom Step 7 Order"
description: "Example showing subtask reordering in Step 7"

pipeline:
  steps:
    # ... Steps 1-6 (abbreviated for clarity)

    # Step 7: Readiness Checker (Custom Order)
    - step_id: "07-readiness-checker"
      enabled: true
      config_file: "config/steps/step-07-readiness-checker.yaml"
      subtasks:

        # REORDERED: Calculate score FIRST (for early exit)
        - name: "calculate_readiness_score"
          enabled: true
          implementation: "src/pipeline/steps/07-readiness-checker/subtasks/calculate-readiness-score.ts"
          order: 1
          config:
            pass_threshold: 80
            early_exit_if_pass: true  # Skip detailed analysis if score > 80

        # Run detailed evaluation only if score < 80
        - name: "evaluate_readiness_criteria"
          enabled: true
          implementation: "src/pipeline/steps/07-readiness-checker/subtasks/evaluate-readiness-criteria.ts"
          order: 2
          conditional:
            run_if: "readiness_score < 80"

        # Categorize gaps
        - name: "categorize_gaps"
          enabled: true
          implementation: "src/pipeline/steps/07-readiness-checker/subtasks/categorize-gaps.ts"
          order: 3
          conditional:
            run_if: "readiness_score < 80"

        # Recommend actions
        - name: "recommend_next_actions"
          enabled: true
          implementation: "src/pipeline/steps/07-readiness-checker/subtasks/recommend-next-actions.ts"
          order: 4
          conditional:
            run_if: "readiness_score < 80"
```

---

## Implementation Architecture

### Pipeline Executor

**File**: `src/pipeline/executor.ts`

```typescript
import { WorkflowConfig, StepConfig, SubtaskConfig } from './types'
import { loadYamlConfig } from './utils/config-loader'
import { PipelineContext } from './context'

export class PipelineExecutor {
  private workflowConfig: WorkflowConfig
  private context: PipelineContext

  constructor(workflowPath: string) {
    this.workflowConfig = loadYamlConfig(workflowPath)
    this.context = new PipelineContext()
  }

  async execute(input: any): Promise<any> {
    console.log(`Executing workflow: ${this.workflowConfig.name}`)

    for (const step of this.workflowConfig.pipeline.steps) {
      if (!step.enabled) {
        console.log(`⏭️  Skipping disabled step: ${step.step_id}`)
        continue
      }

      await this.executeStep(step)
    }

    return this.context.getOutput()
  }

  private async executeStep(stepConfig: StepConfig): Promise<void> {
    console.log(`▶️  Executing step: ${stepConfig.step_id}`)

    // Load step-specific configuration if specified
    const stepDetails = stepConfig.config_file
      ? loadYamlConfig(stepConfig.config_file)
      : stepConfig

    // Execute each enabled subtask in order
    for (const subtask of stepConfig.subtasks || []) {
      if (!subtask.enabled) {
        console.log(`  ⏭️  Skipping disabled subtask: ${subtask.name}`)
        continue
      }

      // Check conditional execution
      if (subtask.conditional && !this.evaluateCondition(subtask.conditional)) {
        console.log(`  ⏭️  Skipping conditional subtask: ${subtask.name}`)
        continue
      }

      await this.executeSubtask(subtask, stepConfig.step_id)
    }
  }

  private async executeSubtask(
    subtaskConfig: SubtaskConfig,
    stepId: string
  ): Promise<void> {
    console.log(`    🔹 Running subtask: ${subtaskConfig.name}`)

    // Dynamically load the implementation module
    const module = await import(subtaskConfig.implementation)
    const subtaskFunction = module.default || module[this.toCamelCase(subtaskConfig.name)]

    if (!subtaskFunction) {
      throw new Error(
        `Subtask implementation not found: ${subtaskConfig.implementation}`
      )
    }

    // Execute the subtask with context and config
    const result = await subtaskFunction(
      this.context,
      subtaskConfig.config || {}
    )

    // Store result in context for next subtasks
    this.context.setSubtaskResult(stepId, subtaskConfig.name, result)
  }

  private evaluateCondition(conditional: any): boolean {
    // Simple condition evaluation (can be enhanced)
    const condition = conditional.run_if
    // Example: "readiness_score < 80"
    // Parse and evaluate against context
    return eval(this.replaceVariables(condition))
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
  }

  private replaceVariables(expr: string): string {
    // Replace context variables with actual values
    // Example: "readiness_score" → this.context.get("readiness_score")
    return expr.replace(/\b[a-z_]+\b/g, (match) => {
      return `this.context.get("${match}")`
    })
  }
}
```

### Example Subtask Implementation

**File**: `src/pipeline/steps/07-readiness-checker/subtasks/calculate-readiness-score.ts`

```typescript
import { PipelineContext } from '../../../context'
import { ReadinessScoreConfig, ReadinessScoreResult } from '../types'

/**
 * Calculate numeric readiness score based on Definition of Ready criteria
 *
 * Configuration in YAML:
 * config:
 *   scoring_algorithm: "weighted" | "binary" | "percentage"
 *   pass_threshold: 80
 *   early_exit_if_pass: true
 */
export default async function calculateReadinessScore(
  context: PipelineContext,
  config: ReadinessScoreConfig
): Promise<ReadinessScoreResult> {

  // Get evaluation results from previous subtask
  const evaluation = context.getSubtaskResult(
    '07-readiness-checker',
    'evaluate_readiness_criteria'
  )

  // Get scoring algorithm from config (default: "weighted")
  const algorithm = config.scoring_algorithm || 'weighted'

  let score: number

  switch (algorithm) {
    case 'weighted':
      score = calculateWeightedScore(evaluation, config.weights)
      break
    case 'binary':
      score = calculateBinaryScore(evaluation)
      break
    case 'percentage':
      score = calculatePercentageScore(evaluation)
      break
    default:
      throw new Error(`Unknown scoring algorithm: ${algorithm}`)
  }

  const result: ReadinessScoreResult = {
    score,
    passed: score >= config.pass_threshold,
    algorithm: algorithm,
    breakdown: evaluation.criteria_results
  }

  // Store in context for other subtasks to use
  context.set('readiness_score', score)
  context.set('readiness_passed', result.passed)

  // Early exit if configured and passed
  if (config.early_exit_if_pass && result.passed) {
    context.set('skip_remaining_subtasks', true)
  }

  return result
}

function calculateWeightedScore(evaluation: any, weights?: any): number {
  // Implementation...
  return 75
}

function calculateBinaryScore(evaluation: any): number {
  // All pass = 100, any fail = 0
  return evaluation.all_passed ? 100 : 0
}

function calculatePercentageScore(evaluation: any): number {
  // (passed / total) * 100
  const passed = evaluation.criteria_results.filter((c: any) => c.passed).length
  const total = evaluation.criteria_results.length
  return (passed / total) * 100
}
```

---

## Usage Examples

### Running Different Workflows

```bash
# Full pipeline (all quality checks)
npm run process -- \
  --transcript meeting-2024-01-15.json \
  --workflow config/workflows/refinement-full.yaml

# Minimal pipeline (fast, basic output)
npm run process -- \
  --transcript meeting-2024-01-15.json \
  --workflow config/workflows/refinement-minimal.yaml

# Custom workflow (no Step 7)
npm run process -- \
  --transcript meeting-2024-01-15.json \
  --workflow config/workflows/refinement-no-readiness.yaml
```

### Programmatic API

```typescript
import { PipelineExecutor } from './pipeline/executor'

// Use full pipeline
const executor = new PipelineExecutor('config/workflows/refinement-full.yaml')
const result = await executor.execute({
  transcript: transcriptData,
  meeting_id: 'MTG-2024-001'
})

// Use minimal pipeline
const minimalExecutor = new PipelineExecutor('config/workflows/refinement-minimal.yaml')
const quickResult = await minimalExecutor.execute(transcriptData)
```

---

## Benefits of This Architecture

### 1. Full Configurability
- ✅ Enable/disable entire steps
- ✅ Enable/disable individual subtasks
- ✅ Reorder subtasks within a step
- ✅ Replace subtask implementations without code changes

### 2. Clear File-to-Code Mapping
- ✅ YAML config → TypeScript module path is explicit
- ✅ Each subtask = one function in one file
- ✅ Easy to find and modify implementations

### 3. Maintainability
- ✅ Add new subtasks by editing YAML + adding one file
- ✅ Remove subtasks by setting `enabled: false`
- ✅ No hardcoded pipeline logic

### 4. Testing
- ✅ Test individual subtasks in isolation
- ✅ Test different workflow configurations
- ✅ Mock context for unit tests

### 5. Multiple Deployment Scenarios
- ✅ Full pipeline for production
- ✅ Minimal pipeline for demos
- ✅ Custom pipelines for specific teams
- ✅ A/B test different configurations

---

## Migration Strategy

1. **Phase 1**: Implement core pipeline executor with YAML loading
2. **Phase 2**: Implement Steps 1-3 with subtasks
3. **Phase 3**: Implement Steps 4-6 with subtasks
4. **Phase 4**: Implement Steps 7-8 with subtasks
5. **Phase 5**: Add conditional execution and early exit logic
6. **Phase 6**: Add configuration validation and error handling

Each step can be developed independently because the configuration contract is defined upfront.
