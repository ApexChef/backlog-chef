# RAG System Setup Guide

This guide helps you set up and test the RAG (Retrieval-Augmented Generation) system for PBI-013.

## Prerequisites

- Node.js and npm installed
- Python 3.x and pip installed
- ChromaDB server running

## Quick Start

### 1. Install ChromaDB Server

```bash
# Install ChromaDB via pip
pip3 install chromadb
```

### 2. Start ChromaDB Server

```bash
# Start server (runs in background)
chroma run --path ./vector-db --host localhost --port 8000

# Or use nohup to keep it running
nohup chroma run --path ./vector-db --host localhost --port 8000 > chroma-server.log 2>&1 &
```

### 3. Enable RAG in Configuration

Edit `config/rag-config.yaml`:

```yaml
rag:
  enabled: true  # Change from false to true
```

### 4. Index Your Documents

The RAG system will automatically index documents from the configured sources:
- Previous PBI outputs: `./output/run-*/final-output.json`
- Project documentation: `./docs/**/*.md`

Or run the interactive demo:

```bash
npx ts-node examples/test-rag-demo.ts
```

### 5. Run the Pipeline

```bash
# Build first
npm run build

# Run pipeline with RAG enabled
node dist/index.js examples/sample-transcript.txt
```

## Testing the Full Pipeline

### Test 1: Demo (Standalone RAG Test)

```bash
# This creates test data and shows semantic search working
npx ts-node examples/test-rag-demo.ts
```

**Expected Output:**
- 6 documents indexed
- 10 chunks created
- 4 semantic searches with results showing 40-60% relevance scores

### Test 2: Full CLI Pipeline

```bash
# Ensure ChromaDB server is running
curl http://localhost:8000/api/v1/heartbeat

# Build project
npm run build

# Run pipeline
node dist/index.js examples/sample-transcript.txt
```

**What to Look For:**
- Step 4 (Enrich Context) should show "Initializing RAG service"
- If RAG succeeds: "Found X similar work items"
- If RAG falls back: "Using traditional documentation enrichment"

## Configuration Options

### Minimum Configuration (Default)

```yaml
rag:
  enabled: true
  provider: chroma
  embedding:
    model: Xenova/all-MiniLM-L6-v2
    dimensions: 384
  retrieval:
    topK: 5
    minSimilarity: 0.7
```

### Production Configuration

For production use, adjust similarity thresholds and indexing:

```yaml
rag:
  enabled: true
  retrieval:
    topK: 5
    minSimilarity: 0.3  # Lower for more results, higher for precision
```

## Troubleshooting

### ChromaDB Not Running

**Error:** `Failed to initialize ChromaDB store`

**Solution:** Start the ChromaDB server:
```bash
chroma run --path ./vector-db --host localhost --port 8000
```

### No Search Results

**Symptom:** Searches return 0 results even with documents indexed

**Possible Causes:**
1. **Similarity threshold too high** - Lower `minSimilarity` in config
2. **No documents indexed** - Check `vector-db/` directory exists
3. **Embeddings mismatch** - Ensure same model used for indexing and search

### Pipeline Falls Back to Traditional Enrichment

**Symptom:** Pipeline logs "Falling back to traditional enrichment"

**This is expected behavior!** RAG gracefully degrades when:
- ChromaDB server is not running
- No documents are indexed yet
- Configuration has `enabled: false`

The pipeline will continue working normally with mock enrichment.

## Performance Metrics

| Operation | Expected Time |
|-----------|---------------|
| Initialize RAG service | 100-200ms |
| Index 10 documents | 100-500ms |
| Single semantic search | 4-10ms |
| Embedding generation | 50-100ms per doc |

## Next Steps

Once RAG is working:

1. **Index Your PBI History**
   - Run pipeline on past transcripts
   - Outputs will be indexed automatically

2. **Index Documentation**
   - Add project docs to `./docs/`
   - Configure paths in `rag-config.yaml`

3. **Monitor Search Quality**
   - Check relevance scores in Step 4 output
   - Adjust `minSimilarity` threshold
   - Review "similar work" results

## Advanced: Check Server Status

```bash
# Quick status check script
npx ts-node scripts/rag-status.ts
```

## Cleanup

To stop and clean up:

```bash
# Stop ChromaDB server
pkill -f "chroma run"

# Remove test data
rm -rf .rag-test-data .test-chroma-db

# Keep vector-db for production
# rm -rf vector-db  # Only if you want to reset completely
```
