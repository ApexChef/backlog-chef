# Logging and Analytics Requirements

## Overview

The Backlog Chef system must maintain comprehensive flat-file logs to enable:
- **Performance analysis** - Track processing times and bottlenecks
- **Cost monitoring** - Monitor API costs and optimize model usage
- **Quality metrics** - Measure PBI readiness trends over time
- **Audit trails** - Track all processing decisions
- **Team analytics** - Understand refinement patterns and effectiveness

---

## 1. Log File Structure

### Directory Layout

```
logs/
├── pipeline/                       # Pipeline execution logs
│   ├── 2024-01-15/
│   │   ├── run-20240115-143052.log
│   │   ├── run-20240115-150134.log
│   │   └── ...
│   └── 2024-01-16/
│       └── ...
│
├── analytics/                      # Aggregated analytics data
│   ├── daily/
│   │   ├── 2024-01-15.csv
│   │   ├── 2024-01-16.csv
│   │   └── ...
│   ├── weekly/
│   │   ├── 2024-W03.csv
│   │   └── ...
│   └── monthly/
│       ├── 2024-01.csv
│       └── ...
│
├── api-usage/                      # LLM API call logs
│   ├── 2024-01-15-api-calls.jsonl
│   ├── 2024-01-16-api-calls.jsonl
│   └── ...
│
├── processing-history/             # Complete processing records
│   ├── 2024-01-15-processing.jsonl
│   ├── 2024-01-16-processing.jsonl
│   └── ...
│
└── audit/                          # Audit trail logs
    ├── 2024-01-decisions.jsonl
    └── ...
```

---

## 2. Log Formats

### 2.1 Pipeline Execution Log

**Format**: Structured text log (newline-delimited JSON)
**File**: `logs/pipeline/YYYY-MM-DD/run-YYYYMMDD-HHMMSS.log`

```json
{"timestamp":"2024-01-15T14:30:52.123Z","level":"INFO","run_id":"run-20240115-143052","event":"pipeline_start","workflow":"refinement-full","meeting_id":"MTG-2024-001","transcript_file":"refinement-2024-01-15.json"}
{"timestamp":"2024-01-15T14:30:52.234Z","level":"INFO","run_id":"run-20240115-143052","event":"step_start","step_id":"01-event-detection","step_name":"Event Detection"}
{"timestamp":"2024-01-15T14:30:53.456Z","level":"INFO","run_id":"run-20240115-143052","event":"subtask_start","step_id":"01-event-detection","subtask":"detect_meeting_type"}
{"timestamp":"2024-01-15T14:30:54.789Z","level":"INFO","run_id":"run-20240115-143052","event":"subtask_complete","step_id":"01-event-detection","subtask":"detect_meeting_type","duration_ms":1333,"result":"refinement","confidence":0.95}
{"timestamp":"2024-01-15T14:30:55.012Z","level":"INFO","run_id":"run-20240115-143052","event":"step_complete","step_id":"01-event-detection","duration_ms":2778,"subtasks_executed":2,"subtasks_skipped":0}
{"timestamp":"2024-01-15T14:35:12.345Z","level":"INFO","run_id":"run-20240115-143052","event":"pipeline_complete","workflow":"refinement-full","total_duration_ms":260193,"steps_executed":8,"pbis_processed":3,"total_cost":0.079}
```

**Fields:**
- `timestamp` - ISO 8601 timestamp
- `level` - LOG | INFO | WARN | ERROR
- `run_id` - Unique pipeline run identifier
- `event` - Event type (pipeline_start, step_start, step_complete, etc.)
- `step_id` - Pipeline step identifier
- `subtask` - Subtask name (if applicable)
- `duration_ms` - Duration in milliseconds
- `result` - Result data (varies by event)
- Additional context-specific fields

---

### 2.2 API Usage Log

**Format**: JSON Lines (JSONL)
**File**: `logs/api-usage/YYYY-MM-DD-api-calls.jsonl`

```jsonl
{"timestamp":"2024-01-15T14:30:54.100Z","run_id":"run-20240115-143052","step_id":"01-event-detection","subtask":"detect_meeting_type","api":"anthropic","model":"claude-3-5-sonnet-20241022","operation":"messages.create","input_tokens":1234,"output_tokens":156,"cost_usd":0.00524,"duration_ms":1245,"cache_hit":false}
{"timestamp":"2024-01-15T14:31:12.456Z","run_id":"run-20240115-143052","step_id":"02-extract-candidates","subtask":"identify_pbi_discussions","api":"anthropic","model":"claude-3-5-sonnet-20241022","operation":"messages.create","input_tokens":4567,"output_tokens":2134,"cost_usd":0.02145,"duration_ms":3456,"cache_hit":false}
{"timestamp":"2024-01-15T14:32:05.789Z","run_id":"run-20240115-143052","step_id":"03-score-confidence","subtask":"calculate_confidence_score","api":"anthropic","model":"claude-3-5-sonnet-20241022","operation":"messages.create","input_tokens":2345,"output_tokens":890,"cost_usd":0.01123,"duration_ms":2345,"cache_hit":true,"cache_type":"prompt"}
```

**Fields:**
- `timestamp` - API call timestamp
- `run_id` - Pipeline run identifier
- `step_id` - Step that made the call
- `subtask` - Subtask that made the call
- `api` - API provider (anthropic, openai, etc.)
- `model` - Model used
- `operation` - API operation
- `input_tokens` - Input token count
- `output_tokens` - Output token count
- `cost_usd` - Estimated cost in USD
- `duration_ms` - API call duration
- `cache_hit` - Whether cache was used
- `cache_type` - Type of caching (if applicable)

---

### 2.3 Processing History Log

**Format**: JSON Lines (JSONL)
**File**: `logs/processing-history/YYYY-MM-DD-processing.jsonl`

Each line is a complete processing record for one PBI:

```jsonl
{"run_id":"run-20240115-143052","timestamp":"2024-01-15T14:35:12.345Z","meeting_id":"MTG-2024-001","meeting_date":"2024-01-15","meeting_type":"refinement","workflow":"refinement-full","pbi_id":"PBI-001","pbi_title":"Customer Self-Service Order Portal","initial_confidence_score":35,"final_readiness_score":27,"readiness_status":"NOT_READY","critical_questions_count":3,"high_questions_count":5,"blocking_issues_count":7,"warning_issues_count":3,"processing_duration_ms":86731,"api_cost_usd":0.026,"steps_executed":["01","02","03","04","05","06","07","08"],"similar_pbis_found":5,"risks_detected":["license_capacity","gdpr_approval","dependencies"],"actions_generated":11}
```

**Fields:**
- Basic metadata (run_id, timestamp, meeting details)
- PBI identification (pbi_id, title)
- Quality metrics (confidence scores, readiness)
- Question counts by priority
- Issue counts by severity
- Performance metrics (duration, cost)
- Processing details (steps executed, similar work found)
- Outcomes (risks detected, actions generated)

---

### 2.4 Daily Analytics CSV

**Format**: CSV
**File**: `logs/analytics/daily/YYYY-MM-DD.csv`

```csv
date,meetings_processed,pbis_processed,pbis_ready,pbis_not_ready,avg_readiness_score,total_questions,critical_questions,high_questions,total_risks,blocking_risks,total_actions,avg_processing_time_ms,total_api_cost_usd,avg_cost_per_pbi,model_primary,workflow_most_used
2024-01-15,2,7,2,5,52.3,34,8,14,21,12,45,245678,0.234,0.0334,claude-3-5-sonnet-20241022,refinement-full
2024-01-16,3,12,5,7,61.7,42,6,18,18,8,52,198234,0.312,0.0260,claude-3-5-sonnet-20241022,refinement-full
```

**Columns:**
- Date and volume metrics
- PBI quality metrics
- Question and risk metrics
- Action generation metrics
- Performance metrics
- Cost metrics
- Configuration used

---

### 2.5 Audit Trail Log

**Format**: JSON Lines (JSONL)
**File**: `logs/audit/YYYY-MM-decisions.jsonl`

Tracks all decision points in the pipeline:

```jsonl
{"timestamp":"2024-01-15T14:30:54.789Z","run_id":"run-20240115-143052","decision_type":"meeting_classification","pbi_id":null,"decision":"refinement","confidence":0.95,"reasoning":"Transcript contains discussion of user stories, acceptance criteria, and scope definition","alternative_classifications":["planning:0.12","retrospective:0.03"]}
{"timestamp":"2024-01-15T14:31:45.123Z","run_id":"run-20240115-143052","decision_type":"pbi_extraction","pbi_id":"PBI-001","decision":"extract","confidence":0.87,"reasoning":"Clear business value and technical discussion present","segments":[{"start":123,"end":456}]}
{"timestamp":"2024-01-15T14:33:12.456Z","run_id":"run-20240115-143052","decision_type":"readiness_evaluation","pbi_id":"PBI-001","criterion":"dependencies_resolved","decision":"FAIL","severity":"blocking","reasoning":"License capacity insufficient, GDPR approval missing","evidence":["Q003: insufficient licenses","Q002: GDPR not addressed"]}
```

**Fields:**
- `timestamp` - Decision timestamp
- `run_id` - Pipeline run
- `decision_type` - Type of decision made
- `pbi_id` - Related PBI (if applicable)
- `decision` - The decision made
- `confidence` - Confidence score (0-1)
- `reasoning` - Why this decision was made
- `evidence` - Supporting evidence
- `alternatives` - Alternative options considered

---

## 3. Analytics Metrics to Track

### 3.1 Pipeline Performance Metrics

```yaml
metrics:
  pipeline:
    - total_runs
    - successful_runs
    - failed_runs
    - avg_duration_ms
    - p50_duration_ms
    - p95_duration_ms
    - p99_duration_ms

  steps:
    - step_execution_count
    - step_duration_avg_ms
    - step_duration_p95_ms
    - step_success_rate
    - step_cache_hit_rate

  subtasks:
    - subtask_execution_count
    - subtask_duration_avg_ms
    - subtask_success_rate
```

---

### 3.2 Quality Metrics

```yaml
metrics:
  pbis:
    - total_processed
    - ready_count
    - not_ready_count
    - avg_readiness_score
    - readiness_score_distribution
    - avg_confidence_score
    - confidence_score_distribution

  questions:
    - total_questions_generated
    - avg_questions_per_pbi
    - critical_questions_count
    - high_questions_count
    - medium_questions_count
    - low_questions_count
    - questions_with_proposed_answers
    - avg_proposed_answers_per_question

  risks:
    - total_risks_detected
    - blocking_risks_count
    - warning_risks_count
    - risks_by_category
    - avg_risks_per_pbi

  actions:
    - total_actions_generated
    - immediate_actions_count
    - before_sprint_actions_count
    - nice_to_have_actions_count
    - avg_actions_per_pbi
```

---

### 3.3 Cost Metrics

```yaml
metrics:
  api_usage:
    - total_api_calls
    - total_input_tokens
    - total_output_tokens
    - total_cost_usd
    - avg_cost_per_meeting
    - avg_cost_per_pbi
    - cost_by_step
    - cost_by_model
    - cache_hit_rate
    - cache_savings_usd

  model_usage:
    - calls_by_model
    - tokens_by_model
    - cost_by_model
    - avg_tokens_per_call
```

---

### 3.4 Team Analytics

```yaml
metrics:
  refinement_effectiveness:
    - meetings_per_week
    - pbis_per_meeting
    - ready_pbi_percentage
    - avg_time_to_ready
    - questions_answered_rate
    - common_blocking_issues

  stakeholder_involvement:
    - questions_routed_by_stakeholder
    - avg_questions_per_stakeholder
    - question_response_time

  historical_learning:
    - similar_pbis_found_rate
    - estimate_accuracy_improvement
    - repeated_risks_detected
```

---

## 4. Real-time vs Batch Analytics

### Real-time (Written During Execution)

These logs are written **during** pipeline execution:
- **Pipeline execution logs** - As events happen
- **API usage logs** - After each API call
- **Audit trail logs** - As decisions are made

### Batch (Aggregated Post-Execution)

These are generated **after** pipeline completes:
- **Processing history** - One record per PBI
- **Daily analytics CSV** - Aggregated at end of day
- **Weekly/monthly analytics** - Aggregated on schedule

---

## 5. Log Configuration

Add to workflow YAML:

```yaml
global:
  logging:
    # Execution logs
    execution_log:
      enabled: true
      level: "INFO"  # DEBUG | INFO | WARN | ERROR
      format: "jsonl"
      output_dir: "logs/pipeline"
      rotate: "daily"
      retention_days: 90

    # API usage logs
    api_log:
      enabled: true
      output_dir: "logs/api-usage"
      include_request_data: false  # For privacy
      include_response_data: false
      rotate: "daily"
      retention_days: 365

    # Processing history
    processing_log:
      enabled: true
      output_dir: "logs/processing-history"
      format: "jsonl"
      rotate: "daily"
      retention_days: 365

    # Audit trail
    audit_log:
      enabled: true
      output_dir: "logs/audit"
      format: "jsonl"
      include_reasoning: true
      rotate: "monthly"
      retention_days: 730  # 2 years

    # Analytics
    analytics:
      enabled: true
      output_dir: "logs/analytics"
      generate_daily: true
      generate_weekly: true
      generate_monthly: true
      formats: ["csv", "json"]
```

---

## 6. Analytics Dashboard Data

### 6.1 Pipeline Performance Dashboard

**Source**: `logs/analytics/daily/*.csv`

**Metrics to Display**:
- Pipeline runs per day (trend)
- Average processing time (trend)
- Success rate (trend)
- Cost per meeting (trend)
- Bottleneck steps (bar chart)

### 6.2 Quality Metrics Dashboard

**Source**: `logs/processing-history/*.jsonl`

**Metrics to Display**:
- PBI readiness rate (trend)
- Average readiness score (trend)
- Questions generated per PBI (trend)
- Common blocking issues (frequency chart)
- Time to ready (histogram)

### 6.3 Cost Monitoring Dashboard

**Source**: `logs/api-usage/*.jsonl`

**Metrics to Display**:
- Daily API costs (trend)
- Cost by model (pie chart)
- Cost by step (bar chart)
- Token usage (trend)
- Cache effectiveness (percentage)

---

## 7. Log Analysis Queries

### Example: Find Expensive Pipeline Runs

```bash
# Parse API logs to find runs that cost > $0.50
cat logs/api-usage/2024-01-*.jsonl | \
  jq -s 'group_by(.run_id) |
         map({run_id: .[0].run_id, total_cost: (map(.cost_usd) | add)}) |
         map(select(.total_cost > 0.50)) |
         sort_by(.total_cost) |
         reverse'
```

### Example: Average Readiness Score by Workflow

```bash
# Parse processing history to compare workflows
cat logs/processing-history/2024-01-*.jsonl | \
  jq -s 'group_by(.workflow) |
         map({workflow: .[0].workflow,
              avg_score: (map(.final_readiness_score) | add / length),
              count: length})'
```

### Example: Identify Bottleneck Steps

```bash
# Parse execution logs to find slowest steps
cat logs/pipeline/2024-01-15/run-*.log | \
  jq -s 'map(select(.event == "step_complete")) |
         group_by(.step_id) |
         map({step: .[0].step_id,
              avg_duration: (map(.duration_ms) | add / length),
              count: length}) |
         sort_by(.avg_duration) |
         reverse'
```

---

## 8. Privacy and Security Considerations

### Data to EXCLUDE from Logs

❌ **Never log**:
- Customer names
- Email addresses
- Phone numbers
- Personal identifiable information (PII)
- Full transcript content
- Proprietary business data

✅ **Safe to log**:
- PBI IDs (anonymized references)
- Meeting IDs (anonymized)
- Metadata (timestamps, durations, counts)
- Aggregate statistics
- Technical metrics
- Configuration details

### Anonymization Strategy

```typescript
// Example: Anonymize PBI data in logs
function anonymizePBI(pbi: PBI): AnonymizedPBI {
  return {
    pbi_id: pbi.id,  // Keep ID for correlation
    title_hash: hash(pbi.title),  // Hash for privacy
    word_count: pbi.description.split(' ').length,
    has_acceptance_criteria: pbi.acceptance_criteria.length > 0,
    question_count: pbi.questions.length,
    // ... metadata only, no actual content
  }
}
```

---

## 9. Log Rotation and Retention

### Rotation Policy

```yaml
rotation:
  pipeline_logs:
    strategy: "daily"
    max_size_mb: 100
    compress: true

  api_logs:
    strategy: "daily"
    max_size_mb: 50
    compress: true

  processing_history:
    strategy: "daily"
    compress: true

  audit_logs:
    strategy: "monthly"
    compress: true
```

### Retention Policy

```yaml
retention:
  pipeline_logs: 90 days
  api_logs: 365 days
  processing_history: 365 days
  audit_logs: 730 days  # 2 years for compliance
  analytics_daily: 180 days
  analytics_weekly: 365 days
  analytics_monthly: 1825 days  # 5 years
```

---

## 10. Implementation Requirements

### Logger Interface

```typescript
interface Logger {
  // Pipeline events
  logPipelineStart(runId: string, config: WorkflowConfig): void
  logPipelineComplete(runId: string, metrics: PipelineMetrics): void
  logStepStart(runId: string, stepId: string): void
  logStepComplete(runId: string, stepId: string, metrics: StepMetrics): void
  logSubtaskStart(runId: string, stepId: string, subtask: string): void
  logSubtaskComplete(runId: string, stepId: string, subtask: string, metrics: SubtaskMetrics): void

  // API calls
  logApiCall(call: ApiCallMetrics): void

  // Processing records
  logProcessingRecord(record: ProcessingRecord): void

  // Audit trail
  logDecision(decision: DecisionRecord): void

  // Errors
  logError(runId: string, error: Error, context: any): void
}
```

### Analytics Generator

```typescript
interface AnalyticsGenerator {
  // Generate daily analytics
  generateDailyAnalytics(date: Date): Promise<DailyAnalytics>

  // Generate weekly analytics
  generateWeeklyAnalytics(week: string): Promise<WeeklyAnalytics>

  // Generate monthly analytics
  generateMonthlyAnalytics(month: string): Promise<MonthlyAnalytics>

  // Query specific metrics
  queryMetric(metric: string, filters: QueryFilters): Promise<MetricResult[]>
}
```

---

## 11. Example Output Files

See the existing POC files as examples:
- `poc-step7/output/readiness-assessment.json` - Already includes metadata

The `metadata` section should be logged to all analytics files:

```json
"metadata": {
  "generated_at": "2025-11-19T15:03:57.419Z",
  "total_pbis": 3,
  "ready_count": 0,
  "not_ready_count": 3,
  "average_readiness_score": 36,
  "model_used": "claude-3-5-haiku-20241022",
  "processing_duration_ms": 262536,
  "total_api_cost": 0.07902200000000001
}
```

---

## Summary

✅ **Flat file logs** for easy parsing and analysis
✅ **Multiple log types** for different purposes (execution, API, processing, audit)
✅ **CSV analytics** for easy import into spreadsheets
✅ **JSONL format** for structured data that's easy to query
✅ **Privacy-safe** - no PII in logs
✅ **Configurable** - logging levels and outputs controlled via YAML
✅ **Queryable** - simple jq/grep queries for analysis
✅ **Retention policies** for compliance and cost management
