# POC Step 5: Check Risks & Conflicts

AI-powered risk analysis system for enriched Product Backlog Items (PBIs). This is Step 5 of the Backlog Chef processing pipeline.

## Overview

This POC analyzes enriched PBIs from Step 4 to identify:
- **Risks**: Categorized by severity (CRITICAL, HIGH, MEDIUM, LOW)
- **Conflicts**: Overlapping work, data inconsistencies, resource conflicts
- **Complexity**: Scoring from 0-10 with split recommendations
- **Actionable Insights**: Specific actions and assignees for risk mitigation

## Features

- **Intelligent Risk Detection**: Uses Claude AI to analyze unstructured data
- **8 Risk Types**: Blocking dependencies, unresolved decisions, scope creep, etc.
- **3 Conflict Types**: Existing work, data inconsistency, resource conflicts
- **Complexity Scoring**: Automated assessment with split recommendations
- **Parallel Processing**: Handles multiple PBIs concurrently for efficiency
- **Comprehensive Output**: Structured JSON with detailed analysis

## Prerequisites

- Node.js 18+ and npm
- Claude API key (Anthropic)
- Completed Step 4 output (`poc-step4/output/enriched-pbis.json`)

## Installation

1. Navigate to the POC directory:
```bash
cd poc-step5
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Claude API key:
```
ANTHROPIC_API_KEY=your-actual-api-key-here
```

## Usage

### Basic Analysis

Run risk analysis on enriched PBIs from Step 4:
```bash
npm run analyze
```

### Custom Input/Output

Specify custom file paths:
```bash
npx ts-node src/index.ts analyze -i /path/to/input.json -o /path/to/output.json
```

### Validate Input

Check if your input file is valid:
```bash
npx ts-node src/index.ts validate -i ../poc-step4/output/enriched-pbis.json
```

### Development Mode

Run without building:
```bash
npm run dev analyze
```

## Configuration

Edit `.env` file for configuration:

```env
# Claude API Configuration
ANTHROPIC_API_KEY=your-api-key-here

# Processing Configuration
MAX_CONCURRENT_ANALYSES=5        # Number of PBIs to analyze in parallel
ANALYSIS_TIMEOUT_MS=30000        # Timeout per PBI analysis

# Logging Configuration
LOG_LEVEL=info                   # error, warn, info, debug
LOG_FILE=poc-step5.log

# File Paths (optional)
INPUT_FILE_PATH=../poc-step4/output/enriched-pbis.json
OUTPUT_FILE_PATH=./output/risk-analysis.json
```

## Output Format

The system generates a structured JSON file with:

```json
{
  "risk_analysis": [
    {
      "id": "PBI-001",
      "title": "Customer Order Tracking Portal",
      "risks": {
        "CRITICAL": [
          {
            "type": "BLOCKING_DEPENDENCY",
            "description": "License capacity insufficient",
            "detail": "Current capacity: 500 licenses, Need: 1200+",
            "action_required": "Confirm budget approval",
            "assigned_to": "Sarah (PO)",
            "confidence": 0.95,
            "evidence": ["Current license pool: 500"]
          }
        ],
        "HIGH": [...],
        "MEDIUM": [...],
        "LOW": [...]
      },
      "conflicts": [
        {
          "type": "EXISTING_WORK",
          "description": "Overlaps with PBI-2025-023",
          "detail": "Same authentication mechanism needed",
          "resolution": "Verify if login flow can be reused",
          "assigned_to": "Lisa (Dev)",
          "related_items": ["PBI-2025-023"]
        }
      ],
      "complexity_score": 8.5,
      "recommended_split": true,
      "split_suggestion": "Consider splitting into: 1. Portal Login, 2. Order Dashboard, 3. Cancellation",
      "analysis_confidence": 0.92,
      "analyzed_at": "2024-11-19T12:00:00Z"
    }
  ],
  "metadata": {
    "analyzed_at": "2024-11-19T12:00:00Z",
    "total_analyzed": 3,
    "critical_risks": 2,
    "high_risks": 3,
    "medium_risks": 2,
    "low_risks": 1,
    "total_conflicts": 2,
    "high_complexity_items": 1,
    "model_used": "claude-3-5-haiku-20241022",
    "analysis_duration_ms": 15234
  }
}
```

## Risk Types

- **BLOCKING_DEPENDENCY**: Missing prerequisites that prevent work
- **UNRESOLVED_DECISION**: Key decisions not yet made
- **SCOPE_CREEP_RISK**: Features expanding beyond original scope
- **TECHNICAL_COMPLEXITY**: High technical difficulty
- **DEPENDENCY_ON_INFLIGHT_WORK**: Depends on ongoing work
- **ESTIMATION_UNCERTAINTY**: Difficult to estimate accurately
- **MISSING_STAKEHOLDER**: Required person not involved
- **DATA_INCONSISTENCY**: Conflicting information found

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## Architecture

The system uses a modular architecture:

```
┌─────────────────┐
│   CLI Interface │ - Command-line entry point
└────────┬────────┘
         │
┌────────▼────────┐
│  Orchestrator   │ - Coordinates analysis flow
└────────┬────────┘
         │
    ┌────┴────┬────────┬──────────┐
    │         │        │          │
┌───▼──┐ ┌───▼──┐ ┌──▼───┐ ┌────▼────┐
│ Risk │ │Conflict│ │Complex│ │   AI    │
│Detect│ │Analyze │ │Score  │ │Analysis │
└──────┘ └────────┘ └───────┘ └────┬────┘
                                    │
                            ┌───────▼──────┐
                            │ Claude API   │
                            └──────────────┘
```

## Troubleshooting

### Common Issues

1. **API Key Error**
   - Ensure `ANTHROPIC_API_KEY` is set in `.env`
   - Verify the key is valid and has sufficient credits

2. **Input File Not Found**
   - Check that Step 4 has been executed
   - Verify the path in `INPUT_FILE_PATH`

3. **Rate Limiting**
   - Reduce `MAX_CONCURRENT_ANALYSES` in `.env`
   - Add delays between batches if needed

4. **Memory Issues**
   - Process smaller batches
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`

### Debug Mode

Enable detailed logging:
```bash
LOG_LEVEL=debug npm run analyze
```

## Performance

- Processes ~3-5 PBIs per second (depending on complexity)
- Parallel processing for better throughput
- Token-optimized prompts for cost efficiency
- Automatic retry with exponential backoff

## Next Steps

After running this analysis:
1. Review critical risks and take action
2. Consider splitting high-complexity items
3. Resolve conflicts before sprint planning
4. Use output for Step 6: Prepare Sprint Candidates

## License

MIT