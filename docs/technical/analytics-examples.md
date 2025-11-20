# Analytics Examples - Sample Data and Queries

## Example Analytics Files

### 1. Daily Analytics CSV

**File**: `logs/analytics/daily/2024-01-15.csv`

```csv
date,run_id,meeting_id,workflow,pbis_processed,pbis_ready,pbis_not_ready,avg_readiness_score,total_questions,critical_questions,high_questions,medium_questions,low_questions,total_risks,blocking_risks,warning_risks,total_actions,immediate_actions,before_sprint_actions,processing_duration_ms,total_api_calls,total_input_tokens,total_output_tokens,total_api_cost_usd,model_used,steps_executed
2024-01-15,run-20240115-143052,MTG-2024-001,refinement-full,3,0,3,35.67,34,9,14,8,3,21,12,9,45,24,15,262536,24,45678,12345,0.079,claude-3-5-sonnet-20241022,8
2024-01-15,run-20240115-163421,MTG-2024-002,refinement-full,5,2,3,64.20,28,4,10,10,4,12,5,7,32,15,12,198234,32,52341,15678,0.095,claude-3-5-sonnet-20241022,8
```

---

### 2. Weekly Summary CSV

**File**: `logs/analytics/weekly/2024-W03.csv`

```csv
week,total_meetings,total_pbis,pbis_ready,pbis_not_ready,ready_rate_pct,avg_readiness_score,total_questions,avg_questions_per_pbi,critical_questions,total_risks,blocking_risks,total_actions,avg_processing_time_ms,total_api_cost_usd,avg_cost_per_meeting,avg_cost_per_pbi,primary_workflow,primary_model
2024-W03,12,47,18,29,38.3,56.2,267,5.7,34,89,42,234,215678,1.234,0.103,0.026,refinement-full,claude-3-5-sonnet-20241022
```

---

### 3. Step Performance CSV

**File**: `logs/analytics/step-performance/2024-01.csv`

```csv
month,step_id,step_name,execution_count,avg_duration_ms,p50_duration_ms,p95_duration_ms,success_rate_pct,avg_api_calls,avg_cost_usd,cache_hit_rate_pct
2024-01,01-event-detection,Event Detection,145,2456,2123,4567,100.0,1.2,0.003,15.2
2024-01,02-extract-candidates,Extract Candidates,145,12345,11234,18901,98.6,2.8,0.012,8.5
2024-01,03-score-confidence,Score Confidence,145,8901,8234,13456,99.3,3.5,0.015,12.3
2024-01,04-enrich-context,Enrich Context,145,23456,21234,35678,95.2,8.2,0.025,45.6
2024-01,05-check-risks,Check Risks,145,15678,14567,24567,97.9,4.1,0.018,18.9
2024-01,06-generate-questions,Generate Questions,145,18901,17234,28901,98.6,5.3,0.021,22.1
2024-01,07-readiness-checker,Readiness Checker,145,16789,15234,26789,99.3,4.8,0.019,19.5
2024-01,08-final-output,Final Output,145,3456,3123,5678,100.0,0.2,0.001,5.2
```

---

### 4. PBI Details JSONL

**File**: `logs/processing-history/2024-01-15-processing.jsonl`

```jsonl
{"run_id":"run-20240115-143052","timestamp":"2024-01-15T14:35:12.345Z","meeting_id":"MTG-2024-001","meeting_date":"2024-01-15","meeting_type":"refinement","workflow":"refinement-full","pbi_id":"PBI-001","pbi_title_hash":"a1b2c3d4e5f6","pbi_word_count":234,"initial_confidence_score":35,"final_readiness_score":27,"readiness_status":"NOT_READY","has_acceptance_criteria":false,"acceptance_criteria_count":0,"critical_questions":3,"high_questions":5,"medium_questions":2,"low_questions":1,"blocking_issues":7,"warning_issues":3,"suggestion_issues":2,"processing_duration_ms":86731,"api_calls":8,"total_input_tokens":15234,"total_output_tokens":4123,"api_cost_usd":0.026,"steps_executed":["01","02","03","04","05","06","07","08"],"similar_pbis_found":5,"similar_pbis_avg_score":0.78,"past_estimates_found":2,"risks_detected":["license_capacity","gdpr_approval","dependencies"],"risk_count":3,"actions_immediate":8,"actions_before_sprint":2,"actions_nice_to_have":1,"actions_total":11,"sprint_readiness_eta":"2-3 weeks","confidence_in_eta":"MEDIUM"}
{"run_id":"run-20240115-143052","timestamp":"2024-01-15T14:35:12.456Z","meeting_id":"MTG-2024-001","meeting_date":"2024-01-15","meeting_type":"refinement","workflow":"refinement-full","pbi_id":"PBI-002","pbi_title_hash":"b2c3d4e5f6g7","pbi_word_count":156,"initial_confidence_score":58,"final_readiness_score":51,"readiness_status":"NOT_READY","has_acceptance_criteria":true,"acceptance_criteria_count":4,"critical_questions":0,"high_questions":3,"medium_questions":4,"low_questions":2,"blocking_issues":0,"warning_issues":6,"suggestion_issues":3,"processing_duration_ms":67234,"api_calls":8,"total_input_tokens":12345,"total_output_tokens":3456,"api_cost_usd":0.021,"steps_executed":["01","02","03","04","05","06","07","08"],"similar_pbis_found":8,"similar_pbis_avg_score":0.82,"past_estimates_found":5,"risks_detected":["scope_creep"],"risk_count":1,"actions_immediate":6,"actions_before_sprint":3,"actions_nice_to_have":2,"actions_total":11,"sprint_readiness_eta":"1-2 weeks","confidence_in_eta":"HIGH"}
```

---

## Example Analytics Queries

### Query 1: Daily Cost Trend

```bash
# Extract daily costs from analytics
cat logs/analytics/daily/*.csv | \
  awk -F',' 'NR>1 {date=$1; cost=$23; print date","cost}' | \
  sort | \
  uniq
```

**Output**:
```
2024-01-15,0.079
2024-01-16,0.095
2024-01-17,0.123
```

---

### Query 2: Readiness Score Distribution

```bash
# Get readiness score histogram from processing history
cat logs/processing-history/2024-01-*.jsonl | \
  jq -r '.final_readiness_score' | \
  awk '{
    if ($1 < 20) bucket="0-19"
    else if ($1 < 40) bucket="20-39"
    else if ($1 < 60) bucket="40-59"
    else if ($1 < 80) bucket="60-79"
    else bucket="80-100"
    count[bucket]++
  }
  END {
    for (b in count) print b": "count[b]
  }'
```

**Output**:
```
0-19: 5
20-39: 12
40-59: 18
60-79: 23
80-100: 15
```

---

### Query 3: Most Expensive Steps

```bash
# Find most expensive steps by average cost
cat logs/analytics/step-performance/*.csv | \
  awk -F',' 'NR>1 {print $3","$9}' | \
  sort -t',' -k2 -rn | \
  head -5
```

**Output**:
```
Enrich Context,0.025
Generate Questions,0.021
Readiness Checker,0.019
Check Risks,0.018
Score Confidence,0.015
```

---

### Query 4: Common Blocking Issues

```bash
# Extract and count most common blocking issues
cat logs/processing-history/2024-01-*.jsonl | \
  jq -r '.risks_detected[]' | \
  sort | \
  uniq -c | \
  sort -rn | \
  head -10
```

**Output**:
```
45 dependencies
34 license_capacity
28 gdpr_approval
23 scope_creep
18 technical_complexity
15 performance_concerns
12 security_requirements
10 data_quality
8 integration_complexity
6 team_capacity
```

---

### Query 5: Workflow Effectiveness Comparison

```bash
# Compare different workflows by ready rate
cat logs/processing-history/2024-01-*.jsonl | \
  jq -s 'group_by(.workflow) |
    map({
      workflow: .[0].workflow,
      total: length,
      ready: (map(select(.readiness_status == "READY")) | length),
      avg_score: (map(.final_readiness_score) | add / length),
      avg_cost: (map(.api_cost_usd) | add / length),
      avg_duration_ms: (map(.processing_duration_ms) | add / length)
    }) |
    map(. + {ready_rate: (.ready / .total * 100)})' | \
  jq -r '.[] | [.workflow, .ready_rate, .avg_score, .avg_cost, .avg_duration_ms] | @csv'
```

**Output**:
```csv
"refinement-full",42.5,58.3,0.026,215678
"refinement-minimal",38.2,52.1,0.012,89234
"refinement-binary-readiness",44.1,N/A,0.025,198456
"refinement-risk-focused",35.8,54.2,0.034,276543
```

---

### Query 6: Question Analysis

```bash
# Analyze question patterns
cat logs/processing-history/2024-01-*.jsonl | \
  jq -s '{
    total_pbis: length,
    avg_questions_per_pbi: (map(.critical_questions + .high_questions + .medium_questions + .low_questions) | add / length),
    avg_critical: (map(.critical_questions) | add / length),
    avg_high: (map(.high_questions) | add / length),
    pbis_with_critical: (map(select(.critical_questions > 0)) | length),
    pct_with_critical: ((map(select(.critical_questions > 0)) | length) / length * 100)
  }'
```

**Output**:
```json
{
  "total_pbis": 127,
  "avg_questions_per_pbi": 5.7,
  "avg_critical": 1.2,
  "avg_high": 2.8,
  "pbis_with_critical": 89,
  "pct_with_critical": 70.1
}
```

---

### Query 7: Time to Ready Estimation Accuracy

```bash
# Compare estimated vs actual time to ready (requires historical data)
# This would track PBIs over time to see if estimates were accurate
cat logs/processing-history/2024-*.jsonl | \
  jq -s 'map(select(.sprint_readiness_eta != null)) |
    group_by(.pbi_id) |
    map(select(length > 1)) |  # PBIs processed multiple times
    map({
      pbi_id: .[0].pbi_id,
      initial_eta: .[0].sprint_readiness_eta,
      initial_score: .[0].final_readiness_score,
      final_score: .[-1].final_readiness_score,
      time_to_ready_days: (((.[-1].timestamp | fromdateiso8601) - (.[0].timestamp | fromdateiso8601)) / 86400)
    }) |
    map(select(.final_score >= 80))'  # Only PBIs that became ready
```

---

### Query 8: Cost Optimization Opportunities

```bash
# Find steps with low cache hit rates (opportunities for optimization)
cat logs/analytics/step-performance/*.csv | \
  awk -F',' 'NR>1 {print $3","$10","$9}' | \
  sort -t',' -k2 -n | \
  head -5
```

**Output** (steps with lowest cache hit rates):
```
Final Output,5.2,0.001
Extract Candidates,8.5,0.012
Score Confidence,12.3,0.015
Event Detection,15.2,0.003
Check Risks,18.9,0.018
```

---

## Analytics Dashboard Visualizations

### Dashboard 1: Executive Summary

**Data Source**: `logs/analytics/daily/*.csv`

**Visualizations**:
1. **Trend Line**: Meetings processed per day
2. **Trend Line**: Average readiness score over time
3. **Bar Chart**: PBIs ready vs not ready (daily)
4. **Trend Line**: Cost per PBI over time
5. **KPI Cards**:
   - Total meetings this month
   - Total PBIs processed
   - Average readiness score
   - Total cost this month

---

### Dashboard 2: Quality Metrics

**Data Source**: `logs/processing-history/*.jsonl`

**Visualizations**:
1. **Histogram**: Readiness score distribution
2. **Bar Chart**: Top 10 blocking issues
3. **Trend Line**: Questions per PBI over time
4. **Pie Chart**: PBI status breakdown (ready, not ready, needs refinement)
5. **Scatter Plot**: Confidence score vs readiness score correlation
6. **Heat Map**: Question severity by PBI (critical/high/medium/low)

---

### Dashboard 3: Performance & Cost

**Data Source**: `logs/analytics/step-performance/*.csv` + `logs/api-usage/*.jsonl`

**Visualizations**:
1. **Bar Chart**: Average duration by step
2. **Bar Chart**: Average cost by step
3. **Trend Line**: Total daily API costs
4. **Pie Chart**: Cost distribution by step
5. **Bar Chart**: Cache hit rate by step
6. **Trend Line**: Tokens used over time
7. **KPI Cards**:
   - Cost per meeting
   - Average processing time
   - Cache savings

---

### Dashboard 4: Workflow Comparison

**Data Source**: `logs/processing-history/*.jsonl`

**Visualizations**:
1. **Table**: Workflow effectiveness comparison
   - Columns: Workflow, Ready Rate, Avg Score, Avg Cost, Avg Duration
2. **Bar Chart**: Ready rate by workflow
3. **Bar Chart**: Cost per PBI by workflow
4. **Bar Chart**: Processing time by workflow

---

## Example Log Analysis Scripts

### Script 1: Generate Daily Summary

```bash
#!/bin/bash
# generate-daily-summary.sh

DATE=${1:-$(date +%Y-%m-%d)}

echo "Generating analytics for $DATE..."

# Process all runs from that day
cat logs/processing-history/${DATE}-processing.jsonl | \
  jq -s '{
    date: "'$DATE'",
    meetings_processed: (group_by(.meeting_id) | length),
    pbis_processed: length,
    pbis_ready: (map(select(.readiness_status == "READY")) | length),
    pbis_not_ready: (map(select(.readiness_status == "NOT_READY")) | length),
    avg_readiness_score: (map(.final_readiness_score) | add / length),
    total_questions: (map(.critical_questions + .high_questions + .medium_questions + .low_questions) | add),
    critical_questions: (map(.critical_questions) | add),
    total_api_cost_usd: (map(.api_cost_usd) | add),
    avg_processing_time_ms: (map(.processing_duration_ms) | add / length)
  }' > logs/analytics/daily/${DATE}.json

echo "Analytics saved to logs/analytics/daily/${DATE}.json"
```

---

### Script 2: Weekly Report Generator

```bash
#!/bin/bash
# generate-weekly-report.sh

WEEK=${1:-$(date +%Y-W%V)}

echo "Generating weekly report for $WEEK..."

# Aggregate all daily analytics for the week
find logs/analytics/daily -name "${WEEK:0:4}-*.json" -type f | \
  xargs cat | \
  jq -s '{
    week: "'$WEEK'",
    total_meetings: (map(.meetings_processed) | add),
    total_pbis: (map(.pbis_processed) | add),
    pbis_ready: (map(.pbis_ready) | add),
    pbis_not_ready: (map(.pbis_not_ready) | add),
    avg_readiness_score: (map(.avg_readiness_score) | add / length),
    total_cost: (map(.total_api_cost_usd) | add),
    avg_cost_per_meeting: ((map(.total_api_cost_usd) | add) / (map(.meetings_processed) | add))
  }' > logs/analytics/weekly/${WEEK}.json

echo "Weekly report saved to logs/analytics/weekly/${WEEK}.json"
```

---

## Summary

✅ **CSV files** for easy spreadsheet import
✅ **JSONL files** for detailed queryable data
✅ **Simple queries** using jq, awk, grep
✅ **Multiple time granularities** (daily, weekly, monthly)
✅ **Comprehensive metrics** for quality, performance, and cost
✅ **Dashboard-ready** data formats
✅ **Privacy-safe** (no PII in analytics)
