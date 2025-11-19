# PBI Confidence Scoring POC (Step 3)

This proof of concept implements **Step 3: Score Confidence** of the Backlog Chef processing pipeline. It evaluates PBI (Product Backlog Item) candidates against a quality checklist and assigns confidence scores.

## Overview

The system reads extracted PBIs from Step 2, analyzes each one using Claude AI to assess quality across multiple dimensions, and outputs scored PBIs with readiness assessments.

## Features

- **AI-Powered Analysis**: Uses Claude 3.5 Haiku to intelligently evaluate PBI quality
- **Multi-Dimensional Scoring**: Evaluates 6 key quality dimensions (0-100 scores)
- **Readiness Assessment**: Determines overall readiness (READY, MOSTLY_READY, NOT_READY, etc.)
- **Issue Tracking**: Counts blocking and warning issues
- **Detailed Evidence**: Provides reasoning and evidence for each score

## Quality Dimensions

1. **isCompletePBI**: Clear business value, specific user need, actionable scope
2. **hasAllRequirements**: Critical questions answered
3. **isRefinementComplete**: Ready for sprint planning
4. **hasAcceptanceCriteria**: Testable conditions defined
5. **hasClearScope**: Boundaries explicitly documented
6. **isEstimable**: Team can size the work

## Installation

1. Navigate to the POC directory:
```bash
cd poc-step3
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=your-api-key-here
```

## Usage

### Basic Usage

Score PBIs from the default input location:
```bash
npm run score
```

### Custom Paths

Specify custom input/output paths:
```bash
npm run score -- --input /path/to/extracted-pbis.json --output /path/to/scored-pbis.json
```

### Command Line Options

```bash
npm run score -- --help

Options:
  -i, --input <path>     Path to extracted PBIs JSON file (default: "../poc/output/extracted-pbis.json")
  -o, --output <path>    Path to output scored PBIs JSON file (default: "./output/scored-pbis.json")
  -k, --api-key <key>    Anthropic API key (or set ANTHROPIC_API_KEY env var)
  -m, --model <model>    Claude model to use (default: "claude-3-5-haiku-20241022")
  -d, --debug           Enable debug logging
  -h, --help            Display help
```

### Development Mode

Run with TypeScript directly (without building):
```bash
npm run dev
```

## Input Format

The system expects a JSON file with extracted PBIs from Step 2:
```json
{
  "candidates": [
    {
      "id": "PBI-001",
      "title": "Customer Order Portal",
      "description": "...",
      "acceptance_criteria": ["..."],
      "technical_notes": ["..."],
      "scope": {
        "in_scope": ["..."],
        "out_of_scope": ["..."]
      },
      "dependencies": ["..."],
      "mentioned_by": ["..."],
      "type": "feature"
    }
  ]
}
```

## Output Format

Produces scored PBIs with confidence assessments:
```json
{
  "scored_candidates": [
    {
      "id": "PBI-001",
      "title": "Customer Order Portal",
      "confidenceScores": {
        "isCompletePBI": {
          "score": 85,
          "reasoning": "Clear business value, specific user need",
          "evidence": ["Evidence 1", "Evidence 2"]
        },
        // ... other dimensions
      },
      "overall_readiness": "MOSTLY_READY",
      "blocking_issues": 1,
      "warning_issues": 2
    }
  ],
  "metadata": {
    "scored_at": "2024-11-18T20:00:00.000Z",
    "total_scored": 3,
    "model_used": "claude-3-5-haiku-20241022"
  }
}
```

## Readiness Levels

- **READY**: All scores > 70, no blocking issues
- **MOSTLY_READY**: Most scores > 60, max 1 blocking issue
- **NOT_READY**: Multiple scores < 50, multiple blocking issues
- **DEFERRED**: Explicitly deferred in source
- **FUTURE_PHASE**: Marked for future phase

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## Architecture

```
┌─────────────────┐
│   CLI Entry     │
└────────┬────────┘
         │
┌────────▼────────┐
│  Orchestrator   │──────► Coordinates workflow
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    │         │          │
┌───▼──┐  ┌──▼──┐  ┌────▼────┐
│ File │  │Score│  │ Claude  │
│ I/O  │  │Engine│ │ API     │
└──────┘  └─────┘  └─────────┘
```

## Project Structure

```
poc-step3/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── orchestrator.ts    # Main workflow coordinator
│   ├── services/
│   │   ├── fileService.ts    # File I/O operations
│   │   ├── claudeClient.ts   # Claude API integration
│   │   └── scoringEngine.ts  # Scoring logic
│   ├── models/
│   │   └── types.ts       # TypeScript interfaces
│   └── prompts/
│       └── scoringPrompt.ts  # Claude prompts
├── output/               # Generated output files
├── tests/               # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Error Handling

- **API Failures**: Gracefully handles API errors with fallback scores
- **Rate Limiting**: Implements delays between API calls
- **Invalid Input**: Validates JSON structure before processing
- **Network Issues**: Provides clear error messages

## Performance Considerations

- Processes PBIs sequentially to avoid rate limits
- 1-second delay between API calls
- Typical processing: ~3-5 seconds per PBI

## Limitations

- Requires valid Anthropic API key
- API costs apply (~$0.001 per PBI with Haiku model)
- Network connectivity required
- Results may vary slightly between runs due to AI nature

## Next Steps

This POC demonstrates the scoring capability. For production:
1. Add batch processing with rate limit management
2. Implement caching for development
3. Add retry logic with exponential backoff
4. Create web UI for visualization
5. Add export formats (CSV, Markdown)
6. Implement configurable scoring thresholds

## Troubleshooting

**Issue**: "API key not found"
- Solution: Ensure `.env` file exists with `ANTHROPIC_API_KEY`

**Issue**: "File not found"
- Solution: Check input path, ensure Step 2 output exists

**Issue**: "Rate limit exceeded"
- Solution: Wait and retry, or upgrade API plan

**Issue**: "Invalid JSON response"
- Solution: Check debug logs, may be temporary API issue