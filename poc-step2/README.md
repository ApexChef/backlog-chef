# Backlog Chef POC - Extract Candidate PBIs

A proof-of-concept implementation for Step 2 of the Backlog Chef processing pipeline: extracting structured Product Backlog Items (PBIs) from meeting transcripts using AI.

## Overview

This POC demonstrates how to:
- Read meeting transcripts from markdown files
- Use the Anthropic Claude API to analyze and extract PBIs
- Output structured JSON with detailed PBI information
- Handle various PBI attributes (acceptance criteria, scope, dependencies, etc.)

## Features

- **AI-Powered Extraction**: Uses Claude 3.5 Sonnet for intelligent PBI extraction
- **Comprehensive PBI Structure**: Captures title, description, acceptance criteria, technical notes, scope, dependencies, and more
- **Flexible Input**: Supports transcript with optional meeting summary
- **Quality Analysis**: Built-in analysis of extraction quality
- **Error Handling**: Robust error handling with retries for API calls
- **CLI Interface**: Simple command-line interface for easy testing

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Anthropic API key (Claude API access)

## Installation

1. Navigate to the POC directory:
```bash
cd /Users/alwinvandijken/Projects/github.com/ApexChef/backlog-chef/poc
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

## Usage

### Basic Usage

Extract PBIs from the default POC transcript:
```bash
npm run extract
```

### Advanced Usage

Run with custom options:
```bash
npm run dev -- --input ../docs/poc/transcript.md --output ./output/my-pbis.json --analyze
```

### CLI Options

- `-i, --input <path>`: Path to transcript file (default: `../docs/poc/transcript.md`)
- `-s, --summary <path>`: Path to optional summary file (default: `../docs/poc/transcript-summary.md`)
- `-o, --output <path>`: Path to output JSON file (default: `./output/extracted-pbis.json`)
- `--no-summary`: Skip loading the summary file
- `-v, --verbose`: Enable verbose logging
- `--analyze`: Show extraction quality analysis
- `-h, --help`: Display help

### Examples

1. Extract with verbose logging:
```bash
npm run dev -- --verbose
```

2. Extract without summary file:
```bash
npm run dev -- --no-summary
```

3. Extract and analyze quality:
```bash
npm run dev -- --analyze
```

## Output Format

The tool generates a JSON file with the following structure:

```json
{
  "candidates": [
    {
      "id": "PBI-001",
      "title": "Customer Order Tracking Portal",
      "description": "Enable customers to self-service check their order status...",
      "acceptance_criteria": [
        "Customers can log into the portal using their email/credentials",
        "Dashboard shows overview of customer's orders"
      ],
      "technical_notes": [
        "Use Salesforce Experience Cloud",
        "Need to implement caching for performance"
      ],
      "scope": {
        "in_scope": ["Product orders only", "View and cancel functionality"],
        "out_of_scope": ["Service appointments (phase 2)"]
      },
      "dependencies": [
        "Experience Cloud licenses must be available"
      ],
      "mentioned_by": ["Sarah (PO)", "Lisa (Dev)", "Mark (BA)"],
      "phase": "phase_1",
      "status": "ready"
    }
  ],
  "metadata": {
    "extracted_at": "2024-11-18T10:30:00.000Z",
    "total_candidates": 4
  }
}
```

## Project Structure

```
poc/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── extractor/
│   │   ├── PBIExtractor.ts   # Main extraction service
│   │   └── PromptBuilder.ts  # Prompt template management
│   ├── api/
│   │   └── ClaudeClient.ts   # Anthropic API wrapper
│   ├── models/
│   │   └── PBICandidate.ts   # TypeScript interfaces
│   └── utils/
│       ├── FileHandler.ts    # File I/O operations
│       └── Logger.ts         # Logging utilities
├── output/
│   └── extracted-pbis.json   # Generated output
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Development

### Building the Project

```bash
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

## Configuration

Environment variables (in `.env`):

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `LOG_LEVEL`: Logging level (error, warn, info, debug)
- `MAX_RETRIES`: Maximum API retry attempts (default: 3)
- `RETRY_DELAY_MS`: Initial retry delay in milliseconds (default: 1000)

## Error Handling

The POC includes comprehensive error handling for:
- Missing or invalid API keys
- File not found errors
- API rate limiting (with exponential backoff)
- Invalid JSON responses
- Network timeouts

## Limitations

This is a POC with the following limitations:
- Single transcript processing only
- No database storage
- No caching of results
- Basic CLI interface only
- Token limits may affect very large transcripts

## Future Enhancements

Potential improvements for production:
- Batch processing of multiple transcripts
- Web interface for easier use
- Database storage for extracted PBIs
- Integration with other pipeline steps
- Caching to reduce API calls
- Support for different meeting types
- Custom prompt templates
- Export to different formats (CSV, Markdown)

## Troubleshooting

### API Key Issues
If you get an authentication error:
1. Verify your API key is correctly set in `.env`
2. Ensure the key starts with `sk-ant-`
3. Check your API key has not expired

### File Not Found
If the transcript file is not found:
1. Verify the file path is correct
2. Use absolute paths if relative paths don't work
3. Check file permissions

### Large Transcripts
If you get token limit errors:
1. Consider breaking the transcript into smaller parts
2. Reduce the verbosity of the prompt
3. Use a model with higher token limits

## Support

For issues or questions about this POC, please refer to the main Backlog Chef documentation or contact the development team.

## License

MIT