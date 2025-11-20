# Testing the Backlog Chef Pipeline

Quick guide to test the complete 7-step production pipeline.

## Prerequisites

- Node.js 18+ and npm 8+
- At least one AI provider API key

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Edit the `.env` file and add your API key:

```bash
# Open .env in your editor
nano .env  # or vim, code, etc.

# Add your API key (at least one required):
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

Available providers:
- **Anthropic Claude** (recommended): `ANTHROPIC_API_KEY`
- **OpenAI**: `OPENAI_API_KEY`
- **Google Gemini**: `GOOGLE_API_KEY`
- **Azure OpenAI**: `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT`
- **Ollama** (local, free): No key needed, just run `ollama serve`

### 3. Build the Project

```bash
npm run build
```

## Running Tests

### Test 1: Run with Sample Transcript

The project includes a sample refinement meeting transcript:

```bash
npm start
```

Expected output:
- ✅ Detects meeting as "refinement" type
- ✅ Extracts 3 PBIs (social login, Excel export, search optimization)
- ✅ Scores quality for each PBI
- ✅ Enriches with historical context
- ✅ Analyzes risks and complexity
- ✅ Generates questions with AI-powered proposals
- ✅ Evaluates against Definition of Ready
- ✅ Saves output to `output/pipeline-output-[timestamp].json`

### Test 2: Run with Custom Transcript

```bash
npm start path/to/your/meeting-transcript.txt
```

### Test 3: Development Mode (No Build Required)

```bash
npm run dev
```

## What to Look For

### Console Output

You should see:

```
================================================================================
BACKLOG CHEF PIPELINE
================================================================================
Transcript length: XXXX characters
================================================================================

[detect_event_type] Starting...
[detect_event_type] ✓ Completed in X.XXs

[extract_candidates] Starting...
  Extracting PBIs from transcript...
[extract_candidates] ✓ Completed in X.XXs

[score_confidence] Starting...
  Processing PBI: PBI-001 - Title...
[score_confidence] ✓ Completed in X.XXs

[enrich_context] Starting...
  Enriching PBI: PBI-001 - Title...
[enrich_context] ✓ Completed in X.XXs

[check_risks] Starting...
  Analyzing risks for: PBI-001 - Title...
[check_risks] ✓ Completed in X.XXs

[generate_proposals] Starting...
  Processing PBI: PBI-001 - Title...
[generate_proposals] ✓ Completed in X.XXs

[readiness_checker] Starting...
  Checking readiness for: PBI-001 - Title...
[readiness_checker] ✓ Completed in X.XXs

================================================================================
PIPELINE EXECUTION SUMMARY
================================================================================
Event Type:          refinement
Total PBIs:          3
Ready for Sprint:    X
Needs Refinement:    X
Not Ready:           X
Total Cost:          $X.XXXXXX
Total Duration:      XX.XXs
Models Used:         anthropic/claude-3-5-haiku-20241022, ...
================================================================================
```

### Output File

Check the generated JSON file in `output/`:

```bash
cat output/pipeline-output-*.json | jq .
```

Expected structure:
```json
{
  "event_type": "refinement",
  "pbis": [
    {
      "pbi": {
        "id": "PBI-001",
        "title": "...",
        "description": "...",
        "acceptance_criteria": [...]
      },
      "scores": {
        "overall_score": 85,
        "completeness": 90,
        "clarity": 85,
        "actionability": 80,
        "testability": 85
      },
      "context": {
        "similar_work": [...],
        "past_decisions": [...],
        "technical_docs": [...],
        "risk_flags": [...],
        "suggestions": [...]
      },
      "risks": {
        "risks": [...],
        "overall_risk_level": "medium"
      },
      "questions": [...],
      "readiness": {
        "readiness_status": "🟡 NEEDS REFINEMENT",
        "readiness_score": 75,
        "blocking_issues": [...],
        "warnings": [...],
        "recommendations": [...],
        "sprint_ready": false
      }
    }
  ],
  "metadata": {
    "processed_at": "2024-11-20T...",
    "total_pbis": 3,
    "ready_count": 1,
    "needs_refinement_count": 2,
    "not_ready_count": 0,
    "total_cost_usd": 0.015234,
    "total_duration_ms": 45678,
    "models_used": ["anthropic/claude-3-5-haiku-20241022"]
  }
}
```

## Troubleshooting

### Error: "No AI providers available"

**Problem**: No API keys are set in `.env`

**Solution**:
```bash
# Edit .env and add at least one API key
nano .env
```

### Error: "Provider anthropic not found"

**Problem**: API key is not being loaded

**Solution**:
1. Verify `.env` file exists in project root
2. Check API key is on its own line: `ANTHROPIC_API_KEY=sk-ant-...`
3. Rebuild: `npm run build`
4. Try again: `npm start`

### Error: "Failed to parse JSON"

**Problem**: AI response wasn't valid JSON

**Solution**: System has 3-tier fallback parsing. If it still fails:
1. Check API key is valid
2. Try a different model in `config/model-config.yaml`
3. Check logs for the actual AI response

### Error: "Cost limit exceeded"

**Problem**: Ran out of budget

**Solution**: Increase limits in `.env`:
```bash
COST_LIMIT_PER_RUN_USD=2.0
```

## Cost Estimates

With default configuration (Claude 3.5 Haiku):
- **Per PBI**: ~$0.02-0.04 USD
- **Sample transcript (3 PBIs)**: ~$0.06-0.12 USD
- **10 PBIs**: ~$0.20-0.40 USD

Steps 1-2 use Haiku (cheap), Step 3 uses Sonnet (more expensive for analysis).

## Next Steps

Once basic testing works:
1. Try with your own meeting transcripts
2. Adjust model selection in `config/model-config.yaml`
3. Customize cost limits
4. Integrate with your CI/CD pipeline
5. Connect to real data sources (Azure DevOps, Confluence)

## Support

- Documentation: `src/README.md`
- AI Router docs: `src/ai/router/README.md`
- Architecture: `docs/architecture/`
- Issues: Create a GitHub issue
