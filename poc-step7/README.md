# POC Step 7: Run Readiness Checker

## Overview

This is Step 7 of the Backlog Chef processing pipeline - an AI-powered system that evaluates Product Backlog Items (PBIs) against the Definition of Ready criteria. The system provides objective assessments, identifies gaps (blocking/warning/suggestion), calculates readiness scores, and recommends actionable next steps to get PBIs sprint-ready.

## Key Features

- **Definition of Ready Evaluation**: Comprehensive assessment against configurable readiness criteria
- **Multi-Level Severity**: Categorizes issues as BLOCKING, WARNING, or SUGGESTION
- **Intelligent Scoring**: Weighted scoring system (0-100) with configurable thresholds
- **Action Recommendations**: Generates specific, prioritized actions with time estimates and owners
- **ETA Calculation**: Predicts timeline to sprint readiness with confidence levels
- **Estimation Guidance**: Provides story point recommendations based on complexity
- **Cost Tracking**: Tracks Claude API usage and costs with CSV history
- **File Logging**: Comprehensive rotating logs for audit and troubleshooting

## Definition of Ready Criteria

The system evaluates PBIs against 13 configurable criteria across three severity levels:

### Blocking Criteria (Must Pass)
1. **Has Clear Business Value** - Articulates who, what, why
2. **Has Acceptance Criteria** - Testable, specific criteria defined
3. **Scope is Defined** - In/out of scope explicitly stated
4. **Has Technical Approach** - Solution direction agreed upon
5. **Dependencies Resolved** - All blocking dependencies handled
6. **Key Questions Answered** - Critical questions resolved
7. **Estimable by Team** - Sufficient information to estimate

### Warning Criteria (Should Pass)
8. **Small Enough for Sprint** - Fits within sprint capacity
9. **Design Approved** - UX/UI designs reviewed
10. **Performance Baseline** - Performance requirements defined

### Suggestion Criteria (Nice to Have)
11. **Has Test Strategy** - Testing approach documented
12. **Documentation Complete** - Technical docs prepared
13. **Monitoring Defined** - Observability strategy planned

## Prerequisites

- Node.js 18+ and npm
- Claude API key (Anthropic)
- Questions & proposals output from Step 6 (`poc-step6/output/questions-proposals.json`)
- Unix-like environment (macOS, Linux, WSL)

## Installation

1. Navigate to the Step 7 directory:
```bash
cd poc-step7
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your Claude API key
```

4. Ensure Step 6 output exists:
```bash
ls -la ../poc-step6/output/questions-proposals.json
```

## Configuration

### Environment Variables

Create a `.env` file with the following:

```env
# Claude API Configuration
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-haiku-20241022

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY=1000

# Debug Mode
DEBUG=false

# Input/Output Paths
INPUT_FILE=../poc-step6/output/questions-proposals.json
OUTPUT_FILE=output/readiness-assessment.json
```

### Definition of Ready

The Definition of Ready is configured in `config/definition-of-ready.yaml`. You can customize:

- **Criteria**: Add/remove/modify criteria
- **Weights**: Adjust scoring weights for each criterion
- **Thresholds**: Change readiness status thresholds
  - `ready`: 85+ (default)
  - `needs_refinement`: 60-84 (default)
  - `not_ready`: < 60 (default)
- **Evaluation Prompts**: Customize how Claude evaluates each criterion

## Usage

### Basic Usage

Run the readiness checker:
```bash
npm start
```

### Development Mode

Run with TypeScript directly (no build required):
```bash
npm run dev
```

### With Debug Logging

Enable detailed logging:
```bash
DEBUG=true npm start
```

## Input Format

The system expects a questions & proposals JSON file from Step 6 with this structure:

```json
{
  "questions_and_proposals": [
    {
      "pbi_id": "PBI-001",
      "title": "Customer Self-Service Order Portal",
      "unanswered_questions": {
        "critical": [...],
        "high": [...],
        "medium": [...],
        "low": [...]
      },
      "complexity_score": 8.5,
      "recommended_split": true,
      "split_suggestion": "..."
    }
  ],
  "metadata": {...}
}
```

## Output Format

The system generates a comprehensive readiness assessment:

```json
{
  "readiness_assessment": [
    {
      "pbi_id": "PBI-001",
      "title": "Customer Order Tracking Portal",
      "readiness_status": "🔴 NOT READY",
      "readiness_score": "35/100",
      "definition_of_ready_checklist": {
        "passed": {
          "has_clear_business_value": {
            "status": "PASS",
            "evidence": "Customer pain point clearly articulated"
          }
        },
        "blocking_failures": {
          "dependencies_resolved": {
            "status": "FAIL",
            "severity": "BLOCKING",
            "issues": [
              "License capacity insufficient",
              "GDPR approval not obtained"
            ],
            "action_required": "..."
          }
        },
        "warnings": {...},
        "suggestions": {...}
      },
      "recommended_next_actions": {
        "immediate": [
          {
            "action": "PO: Secure license budget approval",
            "priority": "CRITICAL",
            "owner": "Sarah van der Berg",
            "estimated_time": "2-3 days"
          }
        ],
        "before_sprint": [...],
        "sprint_ready": false
      },
      "sprint_readiness_eta": "2-3 weeks",
      "confidence_in_eta": "MEDIUM",
      "estimation_guidance": {
        "complexity_factors": [...],
        "recommended_estimate": "5-8 story points",
        "confidence": "MEDIUM"
      }
    }
  ],
  "metadata": {
    "generated_at": "2024-11-19T15:00:00Z",
    "total_pbis": 3,
    "ready_count": 1,
    "not_ready_count": 1,
    "needs_refinement_count": 1,
    "average_readiness_score": 62,
    "model_used": "claude-3-5-haiku-20241022",
    "processing_duration_ms": 45000,
    "total_api_cost": 0.008432
  }
}
```

## Processing Pipeline

1. **Load Input**: Read questions & proposals from Step 6
2. **Load Config**: Parse Definition of Ready configuration
3. **Initialize Services**: Set up Claude API client and checker
4. **For Each PBI**:
   - Evaluate all blocking criteria
   - Evaluate warning criteria
   - Evaluate suggestion criteria
   - Calculate weighted readiness score
   - Determine readiness status (READY/NEEDS_REFINEMENT/NOT_READY)
   - Generate recommended actions with priorities
   - Calculate sprint readiness ETA
   - Provide estimation guidance (if score >= 60)
5. **Generate Output**: Compile comprehensive assessment
6. **Save Results**: Write to JSON and track costs

## Readiness Status

PBIs are categorized into three statuses:

- **🟢 READY** (Score >= 85): Sprint ready, all blocking criteria passed
- **🟡 NEEDS REFINEMENT** (Score 60-84): Close to ready, some work needed
- **🔴 NOT READY** (Score < 60): Significant gaps, multiple blockers

## Action Prioritization

Recommended actions are prioritized:

- **CRITICAL**: Must be done immediately, blocks sprint entry
- **HIGH**: Important, needed before sprint starts
- **MEDIUM**: Should be done, improves quality
- **LOW**: Nice to have, can be deferred

## API Integration

### Claude API

The system uses Claude 3.5 Haiku for:
- Evaluating each readiness criterion with evidence
- Identifying specific issues and gaps
- Generating actionable recommendations

### Rate Limiting

- Automatic retry with exponential backoff
- Configurable retry attempts (default: 3)
- Intelligent error handling for transient failures

## Cost Tracking

The system tracks API usage and costs:

- **Real-time tracking**: Logs cost per API call
- **JSON reports**: Detailed breakdown in `output/costs/`
- **CSV history**: Cumulative history in `output/costs/cost-history.csv`
- **Summary**: Total costs displayed at completion

Example cost summary:
```
API COST SUMMARY
================================================================================
Total API Calls:       15
Total Input Tokens:    45,231
Total Output Tokens:   12,847
Total Tokens:          58,078
Total Cost (USD):      $0.109382
Avg Cost per Call:     $0.007292
Model:                 claude-3-5-haiku-20241022
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Project Structure

```
poc-step7/
├── src/
│   ├── config/
│   │   └── app.config.ts           # Application configuration
│   ├── services/
│   │   ├── claude-api-client.ts    # Claude API integration
│   │   └── readiness-checker.ts    # Core evaluation logic
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── utils/
│   │   ├── logger.ts               # Logging utility
│   │   └── cost-tracker.ts         # API cost tracking
│   └── index.ts                    # Main orchestrator
├── config/
│   └── definition-of-ready.yaml    # Readiness criteria config
├── tests/
│   └── unit/                       # Unit tests
├── output/
│   ├── readiness-assessment.json   # Generated output
│   └── costs/                      # Cost tracking files
├── logs/                           # Log files
└── package.json
```

## Troubleshooting

### Common Issues

1. **API Key Error**
   ```
   Error: CLAUDE_API_KEY is not set in environment variables
   ```
   Solution: Add your Claude API key to `.env` file

2. **Input File Not Found**
   ```
   Error: Input file not found
   ```
   Solution: Ensure Step 6 has been run and output exists at specified path

3. **Rate Limiting**
   ```
   Error: 429 Too Many Requests
   ```
   Solution: The system will automatically retry. If persistent, increase `RETRY_DELAY`

4. **Invalid JSON Response**
   ```
   Error: Failed to parse JSON response
   ```
   Solution: System uses 3-tier fallback strategy. Check logs for details.

### Debug Mode

Enable debug logging for detailed information:
```bash
DEBUG=true npm start
```

This will show:
- Detailed API requests/responses
- Criterion evaluation process
- Scoring calculations
- Action generation logic

### Log Files

All logs are stored in the `logs/` directory:

- **`logs/poc-step7-YYYY-MM-DD.log`**: All logs (info, warnings, errors)
- **`logs/poc-step7-error-YYYY-MM-DD.log`**: Error logs only

Log files rotate daily and keep last 5 days.

To view logs in real-time:
```bash
# All logs
tail -f logs/poc-step7-*.log

# Errors only
tail -f logs/poc-step7-error-*.log
```

## Performance

- Typical processing time: 15-20 seconds per PBI
- Memory usage: ~150-250MB
- API calls: ~10-15 per PBI (one per criterion evaluation)
- Average cost: $0.005-0.015 per PBI (Haiku pricing)

## Customization

### Adding New Criteria

1. Edit `config/definition-of-ready.yaml`
2. Add criterion under appropriate severity level:
```yaml
criteria:
  blocking:
    - id: my_new_criterion
      name: "My New Criterion"
      description: "..."
      weight: 10
      evaluation_prompt: |
        Evaluation guide...
```

### Adjusting Weights

Modify the `weight` property for any criterion. Weights should sum to 100 for proper scoring:
- Blocking criteria: 80 total weight
- Warning criteria: 15 total weight
- Suggestion criteria: 5 total weight

### Changing Thresholds

Edit the `thresholds` section in the config:
```yaml
thresholds:
  ready: 85          # Change from default 85
  needs_refinement: 60  # Change from default 60
  not_ready: 0
```

## Security Considerations

- API keys stored in environment variables (never committed)
- Input sanitization for all external data
- No sensitive data logged even in debug mode
- Secure PBI data handling throughout pipeline

## Future Enhancements

- Historical readiness tracking and trends
- Team-specific Definition of Ready templates
- Integration with JIRA/Azure DevOps for status updates
- Slack/Teams notifications for readiness changes
- Machine learning for ETA prediction improvement
- Automated retry scheduling for failed criteria
- Web UI for interactive readiness assessment

## License

MIT

## Support

For issues or questions:
- GitHub Issues: https://github.com/ApexChef/backlog-chef/issues
- Documentation: https://github.com/ApexChef/backlog-chef/docs

## Contributors

- Backlog Chef Team
- Powered by Claude 3.5 Haiku (Anthropic)

---

*Part of the Backlog Chef Pipeline - Step 7 of 8*
