# Fireflies Integration

Backlog Chef integrates directly with [Fireflies.ai](https://fireflies.ai) to fetch meeting transcripts automatically, eliminating the need to manually export and provide transcript files.

## Overview

The Fireflies integration allows you to:
- Fetch meeting transcripts directly from Fireflies using meeting IDs or URLs
- Process meetings without manual file exports
- Automatically cache transcripts to reduce API calls
- Leverage Fireflies' rich metadata (analytics, summaries, speaker info)

## Prerequisites

1. **Fireflies Account**: You need an active Fireflies.ai account
2. **API Key**: Get your Fireflies API key from [https://app.fireflies.ai/integrations/custom/fireflies](https://app.fireflies.ai/integrations/custom/fireflies)
3. **Environment Variable**: Set `FIREFLIES_API_KEY` in your `.env` file

## Setup

### 1. Get Your Fireflies API Key

1. Log in to [app.fireflies.ai](https://app.fireflies.ai)
2. Navigate to **Integrations** → **Custom** → **Fireflies API**
3. Generate or copy your API key

### 2. Configure Environment

Add your API key to `.env`:

```bash
FIREFLIES_API_KEY=your_api_key_here
```

## Usage

### Fetch by Meeting ID

If you know the Fireflies meeting ID:

```bash
backlog-chef process --fireflies abc123xyz
```

### Fetch by Meeting URL

You can also provide the full Fireflies meeting URL:

```bash
backlog-chef process --fireflies "https://app.fireflies.ai/view/Product-Backlog-Refinement::abc123xyz"
```

The CLI will automatically extract the meeting ID from the URL.

### With Additional Options

Combine Fireflies integration with other CLI flags:

```bash
# Verbose mode
backlog-chef process --fireflies abc123 --verbose

# Custom output directory
backlog-chef process --fireflies abc123 --output ./my-output

# Specific output formats
backlog-chef process --fireflies abc123 --formats obsidian,devops
```

## How It Works

When you use the `--fireflies` flag:

1. **API Authentication**: Validates your `FIREFLIES_API_KEY`
2. **Meeting ID Extraction**: Parses meeting ID from URL if needed
3. **Fetch Transcript**: Retrieves complete transcript via Fireflies GraphQL API
4. **Save Raw Data**: Saves raw Fireflies JSON to output directory (`raw-fireflies-transcript.json`)
5. **Process Pipeline**: Runs transcript through the 8-step Backlog Chef pipeline
6. **Generate Outputs**: Creates PBIs in all requested formats

## Caching

The Fireflies integration includes intelligent caching:

- **Default TTL**: 1 hour (3600 seconds)
- **Cache Key**: Meeting ID
- **Location**: In-memory cache

Cached transcripts are automatically used for subsequent requests within the TTL window, reducing API calls and improving performance.

## Error Handling

The integration includes robust error handling:

### Missing API Key
```
❌ FIREFLIES_API_KEY environment variable is required for Fireflies integration.
   Get your API key from: https://app.fireflies.ai/integrations/custom/fireflies
```

### Invalid Meeting ID
```
❌ Fireflies meeting not found: abc123
```

### Authentication Failed
```
❌ Authentication failed: Invalid API key
   Check your FIREFLIES_API_KEY environment variable
```

### Rate Limiting
The integration includes automatic retry logic with exponential backoff for:
- Network timeouts
- Connection errors
- Rate limit errors (429)
- Server errors (5xx)

**Retry Configuration**:
- **Max Attempts**: 3
- **Initial Delay**: 1 second
- **Max Delay**: 10 seconds
- **Strategy**: Exponential backoff

## Data Structure

The fetched Fireflies transcript includes:

### Basic Metadata
- Meeting ID, title, date
- Duration (seconds)
- Organizer and host emails
- Participant list
- Transcript and audio URLs

### Transcript Content
- **Sentences**: Array of transcript sentences with:
  - Speaker name and ID
  - Timestamp (start/end)
  - Text content
  - AI filters (tasks, questions, metrics, sentiment)

### Analytics (optional)
- Sentiment analysis (positive/negative/neutral percentages)
- Speaker analytics (talk time, word count, questions asked)
- Category counts (questions, tasks, metrics, dates)

### AI-Generated Summary (optional)
- Keywords
- Action items with assignees
- Meeting type classification
- Topics discussed
- Overview and bullet points

## Advanced Usage

### Programmatic Access

You can use the FirefliesService directly in your code:

```typescript
import { FirefliesService } from './integrations/fireflies';

const fireflies = new FirefliesService({
  apiKey: process.env.FIREFLIES_API_KEY!,
  cacheTTL: 3600, // 1 hour
  retryAttempts: 3,
});

// Fetch transcript
const transcript = await fireflies.getTranscript('meeting-id');

// Get formatted text
const text = await fireflies.getTranscriptText('meeting-id');

// Extract meeting ID from URL
const meetingId = fireflies.extractMeetingId(
  'https://app.fireflies.ai/view/meeting::abc123'
);

// Get cache stats
const stats = fireflies.getCacheStats();
console.log(`Cache size: ${stats.size} entries`);
```

### Custom Configuration

```typescript
const fireflies = new FirefliesService({
  apiKey: process.env.FIREFLIES_API_KEY!,
  apiEndpoint: 'https://api.fireflies.ai/graphql', // default
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  cacheTTL: 7200, // 2 hours
});
```

## Limitations

1. **API Rate Limits**: Fireflies imposes rate limits on API requests. The integration includes retry logic but may fail if limits are consistently exceeded.
2. **API Key Required**: You must have API access enabled on your Fireflies account.
3. **Meeting Access**: You can only fetch transcripts for meetings you have access to in your Fireflies account.

## Troubleshooting

### Build Errors

If you encounter TypeScript compilation errors:

```bash
npm run build
```

### Verify API Key

Test your API key with verbose mode:

```bash
backlog-chef process --fireflies abc123 --verbose
```

### Check Fireflies API Status

Visit [https://status.fireflies.ai](https://status.fireflies.ai) to check API status.

### Clear Cache

If you're getting stale data, the cache clears automatically after 1 hour. To force a fresh fetch, restart the application.

## Examples

### Example 1: Process Recent Meeting

```bash
# Get meeting ID from Fireflies UI
# Go to app.fireflies.ai → Your Notebooks → Click meeting → Copy ID from URL

backlog-chef process --fireflies "abc123xyz"
```

### Example 2: Batch Processing with Script

```bash
#!/bin/bash
# process-meetings.sh

MEETINGS=(
  "meeting-id-1"
  "meeting-id-2"
  "meeting-id-3"
)

for meeting in "${MEETINGS[@]}"; do
  echo "Processing meeting: $meeting"
  backlog-chef process --fireflies "$meeting" --output "./output/$meeting"
done
```

### Example 3: Verbose Output

```bash
backlog-chef process --fireflies abc123 --verbose
```

Output:
```
📥 Fetching transcript from Fireflies.ai...
📋 Meeting ID: abc123xyz
✅ Retrieved transcript: "Product Backlog Refinement - Jan 2025"
   Duration: 45 minutes
   Sentences: 234
   Participants: 5
💾 Saved raw Fireflies transcript to: output/run-1737633420000/raw-fireflies-transcript.json

[InputParser] Detected format: JSON
[InputParser] Detected Fireflies.ai JSON format
...
```

## Related Documentation

- [Processing Pipeline](./processing-pipeline/README.md)
- [Input Formats](./core-features.md#input-formats)
- [CLI Commands](../../README.md#cli-usage)

## Support

For issues specific to Fireflies integration:
1. Check this documentation
2. Verify your API key is valid
3. Check Fireflies API status
4. Open an issue on [GitHub](https://github.com/ApexChef/backlog-chef/issues)

For Fireflies API issues, contact Fireflies support at [https://fireflies.ai/support](https://fireflies.ai/support).
