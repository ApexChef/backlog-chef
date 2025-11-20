# Roadmap

This document roadmap will list all the things I'm thinking about during the development of this project. Once in a while, the agent will review this and make proper backlog items. But for now, it is just a place to quickly transcribe some notes. or brainstorm ideas.

## CLI & User Interface

- ✅ DONE: Basic npm start interface
- 🏗️ IN PROGRESS: OCLIF CLI implementation (see `project-backlog-items/input/001-oclif-cli.txt`)
  - Global installation: `npm install -g backlog-chef`
  - Commands: `backlog-chef process [file]`
  - Flags: `--format`, `--output`, `--verbose`, `--help`

## Performance & Cost Optimization

### Step 4 Performance Optimization (PRIORITY)

**Current Status:** Step 4 takes 37s per PBI and costs $0.006 (reading entire TOC + docs for every PBI)

**Planned Optimization** (see `project-backlog-items/input/002-step4-optimization.txt`):
- 📋 BACKLOG: In-memory TOC caching (parse once at startup)
- 📋 BACKLOG: Keyword-based pre-filtering (reduce AI analysis from 37 docs to ~10)
- 📋 BACKLOG: Document content caching with 5-minute TTL
- 📋 BACKLOG: File system watch for automatic cache invalidation

**Target Metrics:**
- Time: 37s → <10s per PBI (70% improvement)
- Cost: $0.006 → $0.002 per PBI (66% reduction)
- Quality: Maintain current doc selection accuracy

## Documentation & Context Enrichment

### Table of Contents for AI Agents (Step 4 Enhancement)

Currently, we have `docs/TABLE-OF-CONTENTS.md` that indexes all documentation with keywords. This enables Step 4 (Enrich with Context) to find relevant project documentation when processing PBIs.

**Current Issues:**
- ⚠️ **Performance**: Reads entire TOC for every PBI (expensive)
- ⚠️ **Cost**: $0.006 per PBI just for context enrichment
- ⚠️ **Latency**: 37 seconds per PBI

**Future enhancements:**

1. **Vector Database Integration**
   - Move TABLE-OF-CONTENTS into a vector database (e.g., ChromaDB, Pinecone)
   - Semantic search instead of keyword matching
   - Faster retrieval for large doc sets
   - Automatic similarity scoring

2. **External Documentation Sources**
   - Support for Confluence pages (via API)
   - Support for Azure DevOps wiki (via API)
   - Support for local markdown folders outside the project
   - Support for shared drives or network locations
   - Configurable source priority

3. **Automatic TOC Maintenance**
   - AI agent auto-updates TABLE-OF-CONTENTS.md when:
     - New docs are added
     - Docs are modified significantly
     - Features are completed
   - Claude Code instruction: "When a feature is done, update TABLE-OF-CONTENTS.md"
   - Automatic keyword extraction from new docs

4. **Smart Context Selection**
   - AI determines which 2-3 docs are most relevant (not just keyword match)
   - Confidence scoring for document relevance
   - Progressive loading: start with TOC, then fetch full docs only if needed

5. **Project-Specific Documentation Patterns**
   - Templates for different doc types (architecture, API, decisions)
   - Standardized metadata in markdown frontmatter
   - Auto-linking between related docs

**Implementation Priority:**
- MVP: ✅ Basic TABLE-OF-CONTENTS.md (DONE)
- V1: Auto-updates when features complete
- V2: External source support (Confluence, DevOps)
- V3: Vector database with semantic search 
