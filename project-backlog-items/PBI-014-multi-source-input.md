# PBI-014: Multi-Source Input Aggregation

## User Story

**As a** product owner or team lead
**I want to** combine multiple input sources (text files, Fireflies meetings, folders) into a single pipeline run
**So that** I can generate PBIs from all relevant meeting artifacts and documents in one consolidated analysis

## Current Behavior

- Pipeline processes a **single input source** at a time:
  - One text file (`examples/sample-transcript.txt`)
  - One Fireflies meeting ID (`--fireflies abc123`)
  - One JSON file (manual Fireflies export)
- Cannot combine multiple sources in a single run
- Must run pipeline multiple times and manually merge results

## Desired Behavior

### Phase 1: Dual Source (Text + Fireflies)
```bash
# Combine a local text file with a Fireflies meeting
backlog-chef process transcript.txt --fireflies abc123xyz

# Process enriches both sources and generates combined PBIs
```

### Phase 2: Multiple Files
```bash
# Process multiple text files
backlog-chef process file1.txt file2.txt file3.txt

# Use glob patterns
backlog-chef process "./meeting-notes/*.txt"

# Mix file types (based on extension)
backlog-chef process notes.txt meeting.json --fireflies abc123
```

### Phase 3: Folder-Based Processing
```bash
# Process all compatible files in a folder
backlog-chef process ./sprint-planning/ --recursive

# Auto-detect and process:
# - .txt files → plain text parser
# - .json files → JSON parser (Fireflies detection)
# - .xml files → XML parser (future)
```

## Acceptance Criteria

### Must Have
- [ ] Support combining one text file + one Fireflies meeting ID
- [ ] Merge transcripts into a single enriched input for pipeline
- [ ] Maintain source attribution (which PBI came from which source)
- [ ] Output metadata includes all source files/meetings processed
- [ ] Existing single-source behavior remains unchanged (backward compatible)

### Should Have
- [ ] Support multiple text files in one command
- [ ] Support glob patterns (`"./notes/*.txt"`)
- [ ] Auto-detect file format from extension (`.txt`, `.json`, `.xml`)
- [ ] Clear console output showing all sources being processed

### Could Have
- [ ] Folder/directory processing with `--recursive` flag
- [ ] Source filtering (`--include "*.txt"`, `--exclude "draft-*"`)
- [ ] Per-source metadata in PBI output (e.g., "mentioned in file1.txt, meeting abc123")
- [ ] Conflict detection when same topic appears in multiple sources

## Technical Considerations

### Input Aggregation Strategy

**Option A: Sequential Concatenation**
```
Transcript = File1 + "\n\n---\n\n" + File2 + "\n\n---\n\n" + FirefliesTranscript
```
- Simple to implement
- Preserves order
- May lose source boundaries in AI analysis

**Option B: Structured Metadata Preservation**
```json
{
  "sources": [
    { "type": "text", "path": "file1.txt", "content": "..." },
    { "type": "fireflies", "id": "abc123", "content": "..." }
  ],
  "combinedTranscript": "..."
}
```
- Better source attribution
- Enables per-source analysis
- More complex implementation

### CLI Design

```bash
# Explicit multi-source
backlog-chef process \
  --input transcript.txt \
  --input meeting-notes.txt \
  --fireflies abc123 \
  --output ./combined-output

# Simplified syntax
backlog-chef process file1.txt file2.txt --fireflies abc123

# Folder mode
backlog-chef process ./meeting-artifacts/ --recursive
```

### File Type Detection

| Extension | Parser | Auto-detect? |
|-----------|--------|--------------|
| `.txt` | PlainTextParser | ✅ Yes |
| `.json` | JSONParser → FirefliesTransformer (if detected) | ✅ Yes |
| `.xml` | XMLParser (future) | ⚠️ Not yet implemented |
| None (Fireflies ID) | FirefliesService API | ✅ Yes (via `--fireflies` flag) |

### Source Attribution in Output

Each PBI should track its origin:

```json
{
  "pbi": {
    "id": "PBI-001",
    "title": "Improve file upload UX",
    "sources": [
      {
        "type": "file",
        "path": "transcript.txt",
        "line_references": [45, 67, 89]
      },
      {
        "type": "fireflies",
        "meeting_id": "abc123",
        "url": "https://app.fireflies.ai/view/...",
        "participants": ["Alice", "Bob"]
      }
    ]
  }
}
```

## Implementation Plan

### Step 1: Extend CLI Argument Parsing
- Modify `process.ts` to accept multiple file paths
- Support `--fireflies` alongside file arguments
- Validate all sources exist before processing

### Step 2: Create Input Aggregator
```typescript
class InputAggregator {
  async aggregate(sources: InputSource[]): Promise<AggregatedInput> {
    // Fetch/read all sources
    // Combine into single enriched transcript
    // Preserve metadata for each source
  }
}
```

### Step 3: Update InputParser
- Accept multiple parsed inputs
- Merge transcripts with source markers
- Pass aggregated metadata through pipeline

### Step 4: Source Attribution in Pipeline
- Track which candidate PBIs came from which source
- Include source info in final PBI output
- Update formatters to display source attribution

### Step 5: Folder Processing (Future)
- Implement directory traversal
- Filter by extension/pattern
- Batch process all compatible files

## Dependencies

- None (extends existing input pipeline)

## Risks

- **Performance**: Multiple large transcripts could slow down LLM processing
  - Mitigation: Implement input size limits, warn on large aggregations
- **Context Window**: Very large combined transcripts may exceed LLM limits
  - Mitigation: Chunk processing or summarization for oversized inputs
- **Source Confusion**: AI may mix up which info came from which source
  - Mitigation: Use clear source markers in prompt, structured metadata

## Testing Strategy

### Unit Tests
- Test `InputAggregator` with various combinations
- Test file type detection logic
- Test source metadata preservation

### Integration Tests
```bash
# Test dual source (text + Fireflies)
backlog-chef process notes.txt --fireflies abc123

# Test multiple files
backlog-chef process file1.txt file2.txt file3.txt

# Test glob patterns
backlog-chef process "./meetings/*.txt"
```

### Expected Behavior
- All sources processed without errors
- Combined transcript includes content from all sources
- Output PBIs include source attribution
- Metadata lists all input sources

## Priority

**Medium-High**

This significantly improves usability by:
- Reducing manual work (no need for multiple runs)
- Better context for AI (all related info in one pass)
- More accurate PBIs (cross-references between sources)

## Effort Estimate

- **Phase 1 (Text + Fireflies)**: 3-5 hours
- **Phase 2 (Multiple files)**: 2-3 hours
- **Phase 3 (Folder processing)**: 3-4 hours
- **Total**: ~8-12 hours

## Related PBIs

- PBI-013: Fireflies API Integration (prerequisite)
- Future: Advanced source analysis (cross-referencing, conflict detection)

---

**Created**: 2025-01-21
**Status**: Backlog
**Labels**: `enhancement`, `cli`, `input-processing`
