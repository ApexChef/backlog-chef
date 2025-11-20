# Output Structure

The Backlog Chef pipeline generates organized outputs for each meeting processing run. All outputs for a single meeting are contained in a dedicated folder.

## Folder Structure

```
output/
├── run-{timestamp}/              # One folder per meeting/run
│   ├── step-1-detect_event_type.json
│   ├── step-2-extract_candidates.json
│   ├── step-3-score_confidence.json
│   ├── step-4-enrich_context.json
│   ├── step-5-check_risks.json
│   ├── step-6-generate_proposals.json
│   ├── step-7-readiness_checker.json
│   ├── pbi-{ID}-{title}.json     # Individual PBI files
│   ├── summary.json              # Complete pipeline output
│   └── preview.html              # Interactive HTML preview
```

## File Descriptions

### Step Files (step-X-{name}.json)

Progressive transformation files showing the state after each pipeline step:

1. **step-1-detect_event_type.json** - Meeting type detection (refinement, planning, etc.)
2. **step-2-extract_candidates.json** - Extracted candidate PBIs from transcript
3. **step-3-score_confidence.json** - Quality scores for each PBI
4. **step-4-enrich_context.json** - Added context (similar work, docs, risks)
5. **step-5-check_risks.json** - Risk analysis for each PBI
6. **step-6-generate_proposals.json** - Questions and proposed answers
7. **step-7-readiness_checker.json** - Final readiness assessment

Each step file contains:
- Step metadata (name, timestamp, runId)
- Cost tracking (step cost, total cost)
- Timing (step duration, total duration)
- Step-specific result data

### Individual PBI Files (pbi-{ID}-{title}.json)

Self-contained files for each Product Backlog Item:

```json
{
  "metadata": {
    "generated_at": "2025-11-20T10:30:00.000Z",
    "runId": "1763631000000",
    "event_type": "refinement",
    "pbi_index": 1,
    "total_pbis": 3
  },
  "pbi": {
    "id": "PBI-001",
    "title": "...",
    "description": "...",
    "acceptance_criteria": [...]
  },
  "quality": {
    "scores": {...},
    "overall_assessment": "Good - Minor improvements needed"
  },
  "context": {
    "similar_work": [...],
    "past_decisions": [...],
    "technical_docs": [...],
    "risk_flags": [...]
  },
  "risks": {
    "risks": [...],
    "overall_risk_level": "medium",
    "risk_assessment": "Medium risk - Monitor and address"
  },
  "questions": [...],
  "readiness": {
    "readiness_status": "🟡 NEEDS REFINEMENT",
    "readiness_score": 85,
    "sprint_ready": false
  }
}
```

### Summary File (summary.json)

Complete pipeline output with all PBIs and metadata:

```json
{
  "event_type": "refinement",
  "pbis": [
    {
      "pbi": {...},
      "scores": {...},
      "context": {...},
      "risks": {...},
      "questions": [...],
      "readiness": {...}
    }
  ],
  "metadata": {
    "processed_at": "2025-11-20T10:30:00.000Z",
    "total_pbis": 3,
    "ready_count": 1,
    "needs_refinement_count": 2,
    "not_ready_count": 0,
    "total_cost_usd": 0.123456,
    "total_duration_ms": 120000,
    "models_used": ["claude-3-5-haiku-20241022"]
  }
}
```

### HTML Preview (preview.html)

Interactive, self-contained HTML file with:
- Beautiful responsive design
- Color-coded status indicators
- Expandable/collapsible PBI cards
- All PBI details organized by section
- No external dependencies (embedded CSS/JS)

Open in any browser: `file:///path/to/output/run-{timestamp}/preview.html`

## Run ID Format

Each run folder is named with a timestamp: `run-{timestamp}`

Example: `run-1763631000000` (milliseconds since Unix epoch)

## Benefits of Folder-per-Meeting Structure

1. **Easy Organization** - Each meeting has its own dedicated folder
2. **No File Conflicts** - Files don't overwrite each other
3. **Complete Context** - All files for a run are in one place
4. **Easy Cleanup** - Delete old runs by removing entire folders
5. **Easy Sharing** - Share complete meeting analysis by copying folder
6. **Historical Archive** - Keep history of all meeting processings

## Accessing Files

### View HTML Preview
```bash
open output/run-{timestamp}/preview.html
```

### List All Runs
```bash
ls -1 output/ | grep "^run-"
```

### Find Latest Run
```bash
ls -1t output/ | grep "^run-" | head -1
```

### Check Run Contents
```bash
ls -lah output/run-{timestamp}/
```

### Extract Specific PBI
```bash
cat output/run-{timestamp}/pbi-{ID}-{title}.json | jq '.'
```

## Old Output Files

Files in the `output/` root directory are from the old structure:
- `pipeline-output-{timestamp}.json` - Old summary files
- `preview-{timestamp}.html` - Old HTML previews
- `steps/` - Old step files
- `pbis/` - Old PBI files

These will be removed once the new structure is confirmed working.
