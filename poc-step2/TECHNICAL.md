# Technical Documentation - Backlog Chef POC

## Architecture Overview

### Component Hierarchy
```
CLI Entry (index.ts)
    ├── FileHandler (I/O operations)
    ├── ClaudeClient (API communication)
    └── PBIExtractor (Core logic)
            ├── PromptBuilder (Prompt generation)
            └── Response Parser (JSON extraction)
```

### Data Flow Pipeline
1. **Input Stage**: Read transcript + optional summary
2. **Processing Stage**: Build prompt → Call API → Parse response
3. **Validation Stage**: Validate structure → Clean data → Ensure completeness
4. **Output Stage**: Generate JSON → Write file → Display results

## Core Components

### PBIExtractor
**Responsibility**: Orchestrates the extraction process
- Manages prompt building via PromptBuilder
- Handles API communication via ClaudeClient
- Parses and validates responses
- Ensures data quality

**Key Methods**:
- `extract(transcript, summary?)`: Main extraction method
- `parseResponse(response)`: Extracts JSON from API response
- `validatePBI(pbi)`: Ensures all required fields present
- `analyzeExtractionQuality(result)`: Generates quality metrics

### ClaudeClient
**Responsibility**: Manages Anthropic API communication
- Handles authentication
- Implements retry logic with exponential backoff
- Manages rate limiting

**Configuration**:
- Model: `claude-3-5-haiku-20241022`
- Temperature: `0.2` (low for consistency)
- Max tokens: `4096`
- Retry attempts: `3` (configurable)

### PromptBuilder
**Responsibility**: Constructs optimized prompts
- System prompt: Defines Claude's role as Scrum expert
- User prompt: Provides transcript and extraction instructions
- Includes detailed schema requirements

**Prompt Strategy**:
- Clear role definition
- Explicit output format specification
- Comprehensive extraction guidelines
- Examples of expected structure

## Data Models

### PBICandidate Interface
```typescript
{
  // Required fields
  id: string                    // Unique identifier
  title: string                  // Concise title
  description: string            // Problem description
  acceptance_criteria: string[]  // Testable conditions
  technical_notes: string[]      // Technical details
  scope: {
    in_scope: string[]
    out_of_scope: string[]
  }
  dependencies: string[]
  mentioned_by: string[]

  // Optional fields
  phase?: string                // Implementation phase
  status?: string               // Current status
  type?: string                 // Story type
  current_statuses?: string[]   // For status-related items
}
```

## Error Handling

### Error Categories
1. **File System Errors**
   - File not found → Clear error message
   - Permission denied → Suggest fix
   - Invalid path → Path resolution

2. **API Errors**
   - Authentication → API key validation
   - Rate limiting → Exponential backoff
   - Network issues → Retry mechanism
   - Token limits → Error message (future: chunking)

3. **Parsing Errors**
   - Invalid JSON → Fallback extraction
   - Missing fields → Default values
   - Type mismatches → Type coercion

### Retry Strategy
```
Attempt 1: Immediate
Attempt 2: Wait 1s × 2^0 = 1s
Attempt 3: Wait 1s × 2^1 = 2s
Attempt 4: Wait 1s × 2^2 = 4s
```

## Performance Considerations

### Optimizations
- Async/await for non-blocking I/O
- Efficient JSON parsing with fallbacks
- Minimal memory footprint
- Stream processing ready (future)

### Limitations
- Single transcript processing (by design for POC)
- Token limit: ~50KB transcripts
- No caching (intentional for POC)
- Sequential processing only

## Testing Strategy

### Unit Test Coverage
- PBI extraction logic
- Prompt building
- Response parsing
- Validation logic
- Error handling

### Test Patterns
- Mocked API responses
- Edge case validation
- Error simulation
- Quality metric verification

## Configuration

### Environment Variables
```env
ANTHROPIC_API_KEY=sk-ant-...  # Required
LOG_LEVEL=info                 # info|debug|warn|error
MAX_RETRIES=3                  # API retry attempts
RETRY_DELAY_MS=1000           # Base retry delay
```

### CLI Arguments
```typescript
{
  input: string     // Transcript path
  summary: string   // Summary path (optional)
  output: string    // Output JSON path
  verbose: boolean  // Debug logging
  analyze: boolean  // Show quality metrics
}
```

## Extension Points

### Easy to Extend
1. **New PBI Fields**: Add to interface and prompt
2. **Different Models**: Change model in ClaudeClient
3. **Output Formats**: Add formatters (CSV, Markdown)
4. **Validation Rules**: Extend validatePBI method

### Future Enhancements
1. **Batch Processing**: Process multiple transcripts
2. **Streaming**: Handle large files via streams
3. **Caching**: Cache API responses
4. **Web Interface**: REST API wrapper
5. **Database Storage**: Persist extractions
6. **Custom Templates**: User-defined prompts

## API Usage

### Token Estimation
- System prompt: ~500 tokens
- User prompt template: ~400 tokens
- Transcript (average): ~2000 tokens
- Response: ~1500 tokens
- **Total per request**: ~4400 tokens

### Cost Estimation
- Claude 3.5 Sonnet pricing: $3/million input, $15/million output
- Average request cost: ~$0.025
- POC test runs: <$1

## Security Considerations

### API Key Protection
- Stored in environment variables
- Never logged or displayed
- Validated before use
- .gitignore prevents commits

### Input Validation
- File path sanitization
- Size limits enforced
- JSON structure validation
- No code execution

## Debugging Guide

### Enable Debug Logging
```bash
LOG_LEVEL=debug npm run dev
```

### Common Issues
1. **Empty extraction**: Check prompt, increase temperature
2. **Partial extraction**: Token limit hit, reduce transcript
3. **Invalid JSON**: Check API response format
4. **Missing fields**: Review validation logic

### Logging Levels
- **ERROR**: Critical failures only
- **WARN**: Recoverable issues
- **INFO**: Normal operation (default)
- **DEBUG**: Detailed trace information

## Code Quality

### TypeScript Configuration
- Strict mode enabled
- No implicit any
- No unused variables
- Consistent casing enforced

### Best Practices
- Single responsibility components
- Dependency injection
- Error boundaries
- Comprehensive types
- Clear abstractions