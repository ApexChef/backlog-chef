# Quick Start Guide - Backlog Chef POC

## 5-Minute Setup

### 1. Prerequisites Check
```bash
# Check Node.js version (should be 18+)
node --version

# Check npm is installed
npm --version
```

### 2. Install & Configure
```bash
# Navigate to POC directory
cd /Users/alwinvandijken/Projects/github.com/ApexChef/backlog-chef/poc

# Install dependencies
npm install

# Set up your API key
cp .env.example .env
# Edit .env and add your Anthropic API key
```

### 3. Run the Extraction
```bash
# Build and run with default settings
npm run extract
```

That's it! Check `output/extracted-pbis.json` for the results.

## Common Commands

### Extract with Analysis
Shows quality metrics about the extraction:
```bash
npm run dev -- --analyze
```

### Extract with Verbose Logging
See detailed processing information:
```bash
npm run dev -- --verbose
```

### Skip Summary File
Process transcript only:
```bash
npm run dev -- --no-summary
```

### Custom Input/Output
```bash
npm run dev -- --input /path/to/transcript.md --output /path/to/output.json
```

## What to Expect

When successful, you'll see:
- Loading indicators for each step
- List of extracted PBIs with titles
- Success message with output file location

The output JSON will contain:
- 4 PBI candidates from the example transcript
- Detailed acceptance criteria for each
- Technical notes and dependencies
- Scope boundaries (in/out)
- Phase and status information where applicable

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable is not set"
→ Make sure you've created `.env` file and added your API key

### "File not found: ../docs/poc/transcript.md"
→ Run from the POC directory: `cd /Users/alwinvandijken/Projects/github.com/ApexChef/backlog-chef/poc`

### "Invalid API key"
→ Verify your API key starts with `sk-ant-` and is valid

### API Rate Limit
→ The tool automatically retries with exponential backoff

## Next Steps

1. Review the extracted PBIs in `output/extracted-pbis.json`
2. Compare with expected output in `output/extracted-pbis.example.json`
3. Try with your own transcript files
4. Experiment with the `--analyze` flag to see extraction quality metrics

## Support

See the main README.md for detailed documentation and advanced usage.