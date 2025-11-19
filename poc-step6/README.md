# POC Step 6: Generate Questions + Proposals

## Overview

This is Step 6 of the Backlog Chef processing pipeline - an AI-powered system that identifies unanswered questions in Product Backlog Items (PBIs) and generates intelligent proposals for resolution. The system analyzes risk-assessed PBIs from Step 5, identifies knowledge gaps, routes questions to appropriate stakeholders, and provides AI-generated proposed answers with confidence levels.

## Key Features

- **Intelligent Question Identification**: Uses Claude AI to analyze PBIs and identify critical unanswered questions
- **Smart Prioritization**: Classifies questions as CRITICAL, HIGH, MEDIUM, or LOW based on impact
- **Stakeholder Routing**: Automatically routes questions to the right stakeholders based on domain expertise
- **AI-Powered Proposals**: Generates comprehensive proposed answers with confidence levels
- **Documentation Search**: Simulates searching internal documentation for supporting information
- **Alternative Solutions**: Provides multiple approaches for complex questions
- **Compliance Awareness**: Includes legal and GDPR considerations where relevant
- **Performance Recommendations**: Suggests technical optimizations for performance-related questions

## Prerequisites

- Node.js 18+ and npm
- Claude API key (Anthropic)
- Risk analysis output from Step 5 (`poc-step5/output/risk-analysis.json`)
- Unix-like environment (macOS, Linux, WSL)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ApexChef/backlog-chef.git
cd backlog-chef/poc-step6
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

4. Ensure Step 5 output exists:
```bash
# Check that risk analysis file exists
ls -la ../poc-step5/output/risk-analysis.json
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
DEBUG=false  # Set to true for verbose logging
```

### Stakeholder Registry

The stakeholder registry is defined in `config/stakeholders.yaml`. It includes:

- **Roles**: Product Owner, Scrum Master, Technical Lead, Security Architect, UX Designer, etc.
- **Domain Mapping**: Maps question categories to responsible roles
- **Escalation Rules**: Defines which roles handle critical issues

Example structure:
```yaml
roles:
  - id: product_owner
    title: Product Owner
    domains: [Business, Requirements, Prioritization]
    default_assignee:
      name: Sarah van der Berg
      email: sarah.vdberg@company.nl
```

## Usage

### Basic Usage

Run the question and proposal generation:
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

The system expects a risk analysis JSON file from Step 5 with this structure:

```json
{
  "risk_analysis": [
    {
      "id": "PBI-001",
      "title": "Customer Self-Service Order Portal",
      "risks": {
        "CRITICAL": [...],
        "HIGH": [...],
        "MEDIUM": [...],
        "LOW": [...]
      },
      "conflicts": [...],
      "complexity_score": 7.5,
      "recommended_split": true,
      "split_suggestion": "...",
      "analysis_confidence": 0.88,
      "analyzed_at": "2024-11-19T10:32:42.010Z"
    }
  ],
  "metadata": {...}
}
```

## Output Format

The system generates a comprehensive JSON file with questions and proposals:

```json
{
  "questions_and_proposals": [
    {
      "pbi_id": "PBI-001",
      "title": "Customer Self-Service Order Portal",
      "unanswered_questions": {
        "critical": [
          {
            "id": "Q001",
            "question": "Which account types should have portal access?",
            "category": "Business",
            "priority": "CRITICAL",
            "stakeholders": [...],
            "proposed_answer": {
              "confidence": "MEDIUM",
              "suggestion": "...",
              "rationale": "...",
              "alternatives": [...],
              "legal_considerations": [...],
              "risk": "..."
            },
            "documentation_search": {
              "found": true,
              "sources": [...]
            }
          }
        ],
        "high": [...],
        "medium": [...],
        "low": [...]
      }
    }
  ],
  "metadata": {
    "generated_at": "2024-11-19T14:30:00Z",
    "total_pbis": 3,
    "total_questions": 15,
    "critical_questions": 3,
    "high_questions": 5,
    "stakeholders_identified": [...],
    "model_used": "claude-3-5-haiku-20241022",
    "generation_duration_ms": 45000
  }
}
```

## Processing Pipeline

1. **Load Input**: Read risk analysis from Step 5
2. **Load Registry**: Parse stakeholder registry configuration
3. **For Each PBI**:
   - Identify unanswered questions using Claude AI
   - Classify questions by domain and priority
   - Route to appropriate stakeholders
   - Generate AI-powered proposals
   - Search documentation for supporting information
4. **Generate Output**: Compile all questions and proposals
5. **Save Results**: Write to `output/questions-proposals.json`

## Question Prioritization

Questions are prioritized based on impact:

- **CRITICAL**: Blocks development start, must be answered immediately
- **HIGH**: Needed before sprint planning, significant impact
- **MEDIUM**: Affects quality but can be deferred
- **LOW**: Nice to have, optimization opportunities

## API Integration

### Claude API

The system uses Claude 3.5 Haiku for:
- Question identification from PBI analysis
- Proposal generation with confidence levels
- Documentation search simulation

### Rate Limiting

- Automatic retry with exponential backoff
- Configurable retry attempts (default: 3)
- Small delays between API calls to avoid rate limits

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

### Test Coverage

The test suite includes:
- Unit tests for validators
- Service integration tests
- Stakeholder routing tests
- Documentation search tests

## Project Structure

```
poc-step6/
├── src/
│   ├── config/
│   │   ├── app.config.ts        # Application configuration
│   │   └── prompts.ts           # AI prompt templates
│   ├── services/
│   │   ├── claude-api-client.ts # Claude API integration
│   │   ├── question-generator.ts # Question identification
│   │   ├── proposal-generator.ts # Proposal generation
│   │   ├── stakeholder-router.ts # Stakeholder routing
│   │   └── doc-search.ts        # Documentation search
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── utils/
│   │   ├── logger.ts            # Logging utility
│   │   └── validators.ts        # Input validation
│   └── index.ts                 # Main orchestrator
├── config/
│   └── stakeholders.yaml        # Stakeholder registry
├── tests/
│   ├── unit/                    # Unit tests
│   └── fixtures/                # Test data
├── output/
│   └── questions-proposals.json # Generated output
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
   Error: Failed to load risk analysis
   ```
   Solution: Ensure Step 5 has been run and output exists at `../poc-step5/output/risk-analysis.json`

3. **Rate Limiting**
   ```
   Error: 429 Too Many Requests
   ```
   Solution: The system will automatically retry. If persistent, increase `RETRY_DELAY` in `.env`

4. **Invalid JSON Response**
   ```
   Error: Invalid JSON response from Claude
   ```
   Solution: This is usually temporary. The system will retry automatically.

### Debug Mode

Enable debug logging for detailed information:
```bash
DEBUG=true npm start
```

This will show:
- Detailed API requests/responses
- Question generation process
- Stakeholder routing decisions
- Proposal generation details

### Log Files

All logs are stored in the `logs/` directory:

- **`logs/poc-step6.log`**: All logs (info, warnings, errors)
- **`logs/poc-step6-error.log`**: Error logs only

Log files are automatically rotated when they reach 5MB (keeps last 5 files).

To view logs in real-time:
```bash
# All logs
tail -f logs/poc-step6.log

# Errors only
tail -f logs/poc-step6-error.log
```

## Performance

- Typical processing time: 10-15 seconds per PBI
- Memory usage: ~100-200MB
- API calls: 3-5 per PBI (questions, proposals, documentation)

## Security Considerations

- API keys stored in environment variables (never committed)
- Input sanitization for all user data
- No sensitive data logged in debug mode
- Secure stakeholder email handling

## Future Enhancements

- Real documentation search integration
- Machine learning for question pattern recognition
- Historical question/answer database
- Integration with JIRA/Azure DevOps
- Slack/Teams notifications for stakeholders
- Web UI for question review and approval

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

*Part of the Backlog Chef Pipeline - Step 6 of 8*