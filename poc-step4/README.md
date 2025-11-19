# Backlog Chef POC - Step 4: Enrich with Context

## Overview

Step 4 of the Backlog Chef processing pipeline enriches PBI (Product Backlog Item) candidates with relevant context from historical data, documentation, and past decisions. This POC demonstrates how semantic search and AI analysis can add valuable context to help teams make informed decisions about PBI implementation.

## Features

### Context Enrichment Categories

1. **Similar Work**
   - Finds semantically similar past PBIs
   - Extracts learnings and outcomes
   - Calculates similarity scores
   - Provides reference links

2. **Past Decisions**
   - Identifies relevant architectural/business decisions
   - Shows decision rationale and constraints
   - Links to meeting transcripts

3. **Technical Documentation**
   - Locates relevant technical specifications
   - Extracts pertinent sections
   - Identifies data models and APIs
   - Highlights architecture patterns

4. **Risk Flags**
   - Analyzes context for risk indicators
   - Categorizes by severity (HIGH/MEDIUM/LOW)
   - Provides specific risk messages

5. **Suggestions**
   - Generates actionable recommendations
   - References successful approaches
   - Highlights potential optimizations

## Installation

### Prerequisites

- Node.js 18+ and npm
- Anthropic Claude API key
- Step 3 output file (`poc-step3/output/scored-pbis.json`)

### Setup

1. Install dependencies:
```bash
cd poc-step4
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

3. Ensure Step 3 output exists:
```bash
# The input file should be at: ../poc-step3/output/scored-pbis.json
ls ../poc-step3/output/scored-pbis.json
```

## Usage

### Run Enrichment

```bash
# Build and run the enrichment process
npm run enrich

# Or run in development mode
npm run dev

# Or build and run separately
npm run build
node dist/index.js
```

### Command Line Options

```bash
# Display help
node dist/index.js --help

# Run with custom paths (via environment variables)
INPUT_PATH=/path/to/input.json OUTPUT_PATH=/path/to/output.json npm run enrich
```

## Configuration

Configure via `.env` file or environment variables:

```env
# Required
ANTHROPIC_API_KEY=your_api_key_here

# Optional
CLAUDE_MODEL=claude-3-5-haiku-20241022
INPUT_PATH=../poc-step3/output/scored-pbis.json
OUTPUT_PATH=./output/enriched-pbis.json
```

## Input Format

Expects JSON output from Step 3 with scored PBI candidates:

```json
{
  "scored_candidates": [
    {
      "id": "PBI-001",
      "title": "Customer Self-Service Order Portal",
      "confidenceScores": { ... },
      "overall_readiness": "READY"
    }
  ]
}
```

## Output Format

Produces enriched PBI candidates with context:

```json
{
  "enriched_candidates": [
    {
      "id": "PBI-001",
      "title": "Customer Self-Service Order Portal",
      "context_enrichment": {
        "similar_work": [
          {
            "ref": "PBI-2023-156",
            "title": "Partner Portal Implementation",
            "similarity": 78,
            "learnings": ["Experience Cloud licenses were bottleneck"],
            "link": "https://devops.company.com/PBI-2023-156"
          }
        ],
        "past_decisions": [
          {
            "ref": "Meeting-2024-10-15",
            "title": "Q4 Architecture Review",
            "decision": "Standardize on Experience Cloud",
            "rationale": "Consolidate licenses and expertise"
          }
        ],
        "technical_docs": [
          {
            "ref": "CONF-Portal-Architecture",
            "title": "Experience Cloud Architecture Guide",
            "relevant_sections": ["API limit best practices"]
          }
        ],
        "risk_flags": [
          {
            "type": "LICENSE_CAPACITY",
            "severity": "HIGH",
            "message": "Only 500 licenses available"
          }
        ],
        "suggestions": [
          "Review similar completed work for lessons learned"
        ]
      }
    }
  ],
  "metadata": {
    "enriched_at": "2024-11-18T20:30:00Z",
    "total_enriched": 3,
    "model_used": "claude-3-5-haiku-20241022"
  }
}
```

## Mock Data Sources

This POC uses mock data to simulate real context sources:

### DevOps Repository (`src/data/mock-devops.ts`)
- Historical PBIs with actual vs estimated effort
- Learnings and outcomes
- Technologies used
- Completion dates

### Confluence Documentation (`src/data/mock-confluence.ts`)
- Architecture guides
- Technical specifications
- Process documentation
- GDPR compliance guidelines

### Meeting Transcripts (`src/data/mock-meetings.ts`)
- Architectural decisions
- Business decisions
- Constraints and rationale
- Action items

## Architecture

### Components

1. **Enrichment Orchestrator** (`src/enrichment/orchestrator.ts`)
   - Coordinates the enrichment process
   - Manages PBI processing pipeline
   - Handles output generation

2. **Context Search Engine** (`src/search/engine.ts`)
   - Searches mock data repositories
   - Ranks and filters results
   - Extracts relevant information

3. **Claude AI Client** (`src/ai/claude-client.ts`)
   - Generates search queries
   - Calculates semantic similarity
   - Analyzes risks
   - Generates suggestions

4. **Mock Data Repositories** (`src/data/`)
   - Simulates real data sources
   - Provides realistic context examples

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Example Output

When you run the enrichment process:

```
🚀 Backlog Chef POC - Step 4: Enrich with Context
==================================================

📋 Configuration loaded
   Model: claude-3-5-haiku-20241022
   Input: /path/to/scored-pbis.json
   Output: ./output/enriched-pbis.json

📚 Starting context enrichment process...

🔍 Enriching PBI: Customer Self-Service Order Portal
   ID: PBI-001
   Readiness: READY
   Generating search queries...
   Keywords: customer, self, service, order, portal
   Searching for context...
   ✨ Enrichment Summary:
      - Similar Work: 3 items found
        Top match: "Partner Portal Implementation" (78% similarity)
      - Past Decisions: 2 relevant decisions
      - Technical Docs: 3 documents
      - Risk Flags: 3 risks identified
        ⚠️  2 HIGH severity risks
      - Suggestions: 3 recommendations

✅ Context enrichment complete!

💾 Enriched PBIs saved to: ./output/enriched-pbis.json

📊 Enrichment Statistics:
========================
📝 PBIs Enriched: 3
📚 Context Added:
   - Similar Work Items: 7
   - Past Decisions: 5
   - Technical Documents: 6
⚠️  Risks Identified:
   - Total Risk Flags: 8
   - High Severity Risks: 4

🎉 Step 4 completed successfully!
```

## Limitations

This is a POC implementation with the following limitations:

1. **Mock Data**: Uses simulated context sources instead of real integrations
2. **Simple Search**: Basic keyword matching rather than advanced semantic search
3. **Limited Scale**: Designed for small sets of PBIs
4. **No Caching**: Doesn't cache API calls or search results
5. **Basic Error Handling**: Minimal retry logic and error recovery

## Future Enhancements

For production implementation:

1. **Real Integrations**
   - Connect to actual DevOps APIs
   - Integrate with Confluence/Jira
   - Access real meeting transcripts

2. **Advanced Search**
   - Implement vector embeddings
   - Use semantic similarity models
   - Add fuzzy matching

3. **Performance**
   - Add caching layer
   - Implement parallel processing
   - Optimize API calls

4. **Enhanced Analysis**
   - More sophisticated risk patterns
   - ML-based suggestion generation
   - Trend analysis across projects

## Troubleshooting

### Common Issues

1. **API Key Error**
   ```
   Error: ANTHROPIC_API_KEY is required
   ```
   Solution: Add your API key to the `.env` file

2. **Input File Not Found**
   ```
   Error: Input file not found: ../poc-step3/output/scored-pbis.json
   ```
   Solution: Ensure Step 3 has been run and output exists

3. **Rate Limiting**
   ```
   Error: Rate limit exceeded
   ```
   Solution: Wait and retry, or implement exponential backoff

## Support

For issues or questions about this POC, please refer to the main Backlog Chef documentation or contact the development team.