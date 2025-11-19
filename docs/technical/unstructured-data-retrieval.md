# Unstructured Data Retrieval for Context Enrichment

## Technical Research Paper

**Purpose**: Evaluate strategies for retrieving relevant context from unstructured data sources (Confluence, SharePoint, wikis, product documentation, websites) to enrich PBI quality scoring in Step 4 of the Backlog Chef pipeline.

**Key Question**: Should we build a dedicated vector database with RAG, use MCP servers with semantic search, or combine both approaches?

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Data Source Characteristics](#data-source-characteristics)
3. [Retrieval Strategy Options](#retrieval-strategy-options)
4. [RAG (Retrieval-Augmented Generation) Architecture](#rag-architecture)
5. [Vector Database Solutions](#vector-database-solutions)
6. [Data Synchronization Strategies](#data-synchronization-strategies)
7. [Comparative Analysis](#comparative-analysis)
8. [Recommended Architecture](#recommended-architecture)
9. [Implementation Roadmap](#implementation-roadmap)

---

## Problem Statement

### The Challenge

Step 4 (Enrich with Context) needs to find relevant information from unstructured sources:

**Confluence/SharePoint**:
- Architecture decision records
- Technical documentation
- Meeting notes from past refinements
- Setup guides, runbooks
- **Format**: HTML, rich text, tables, embedded images
- **Volume**: 1,000s of pages per organization

**Internal Wikis**:
- Product specifications
- API documentation
- Design patterns
- Best practices
- **Format**: Markdown, HTML
- **Volume**: 100s to 1,000s of pages

**External Documentation**:
- Salesforce documentation (setup.salesforce.com, help.salesforce.com)
- Third-party API docs
- Vendor product information
- **Format**: HTML, PDF
- **Volume**: Millions of pages (requires selective crawling)

**Websites**:
- Vendor product pages
- Blog posts about solutions
- Stack Overflow discussions
- **Format**: HTML, varying structure
- **Volume**: Unbounded

### Key Requirements

1. **Semantic Search**: Find "similar" content, not just keyword matches
   - Query: "Experience Cloud performance"
   - Should find: "Portal scaling best practices", "Customer Community optimization"

2. **Multi-Source**: Aggregate results from Confluence, SharePoint, wikis, external docs

3. **Fast Retrieval**: Return results in <3 seconds for real-time refinement assistance

4. **Relevance Ranking**: Most relevant results first (not just most recent)

5. **Freshness**: New documentation should be searchable within 24 hours

6. **Privacy**: Respect access controls (user can only search docs they can access)

7. **Cost-Effective**: Minimize embedding/storage costs for large doc volumes

---

## Data Source Characteristics

### Confluence

**Access Method**:
- ✅ **MCP Server**: Atlassian official MCP (remote, cloud-hosted)
- ✅ **REST API**: Direct API access with CQL (Confluence Query Language)

**Search Capabilities**:
- Built-in full-text search (ElasticSearch-backed)
- CQL for structured queries: `text ~ "portal" AND space = TECH`
- Label/metadata filtering
- **Limitation**: Keyword-based, not semantic

**Data Structure**:
```json
{
  "title": "Experience Cloud Architecture Guide",
  "body": {
    "storage": "<p>HTML content...</p>",
    "view": "Rendered HTML"
  },
  "space": "TECH",
  "labels": ["architecture", "portal"],
  "lastModified": "2025-10-15T10:30:00Z",
  "creator": "john.doe"
}
```

**Challenges**:
- HTML parsing required (tables, macros, embedded images)
- Large pages (10,000+ words)
- Nested page hierarchies
- Dynamic macros (Jira issues, status widgets)

---

### SharePoint

**Access Method**:
- ⚠️ **No official MCP** (yet)
- ✅ **Microsoft Graph API**: REST API with search capabilities
- ✅ **SharePoint Search API**: Built-in enterprise search

**Search Capabilities**:
- Full-text search with KQL (Keyword Query Language)
- Managed properties (metadata filtering)
- Result ranking/relevance scoring
- **Limitation**: Keyword-based, not semantic

**Data Structure**:
```json
{
  "Title": "Portal Performance Guide",
  "Path": "https://sharepoint.company.com/sites/tech/docs/guide.docx",
  "LastModifiedTime": "2025-10-15T10:30:00Z",
  "Author": "john.doe@company.com",
  "ContentType": "Document",
  "FileType": "docx",
  "ManagedProperties": {
    "Department": "Engineering",
    "Project": "Portal"
  }
}
```

**Challenges**:
- Multiple file formats (.docx, .pdf, .pptx)
- Permission complexity (item-level security)
- File extraction required (Word, PDF parsing)
- Large binary files

---

### Internal Wikis (e.g., GitBook, Notion, custom)

**Access Method**:
- ⚠️ **Varies by platform** (Notion API, GitBook API, custom)
- ✅ **Web scraping** (if no API)

**Search Capabilities**:
- Platform-dependent
- Often limited to basic keyword search
- **Limitation**: Rarely support advanced search

**Data Structure**:
- Usually Markdown or HTML
- Hierarchical organization (books → chapters → pages)
- Metadata: tags, authors, dates

**Challenges**:
- Inconsistent APIs across platforms
- Web scraping fragility (HTML structure changes)
- Authentication/access control varies

---

### External Documentation (Salesforce, vendor sites)

**Access Method**:
- ✅ **Web scraping** (Playwright, Puppeteer)
- ✅ **Sitemap crawling** (if available)
- ⚠️ **Rate limiting** (must respect robots.txt)

**Search Capabilities**:
- Built-in site search (limited)
- Google site search (`site:salesforce.com "Experience Cloud"`)
- **Limitation**: No API access

**Data Structure**:
- HTML with varying structure
- Often JavaScript-rendered (requires headless browser)
- Pagination, navigation menus

**Challenges**:
- No official API (scraping only)
- Rate limiting / IP blocking risk
- Content changes frequently
- Legal/ToS considerations (scraping allowed?)

---

## Retrieval Strategy Options

### Option 1: Direct API Search (Keyword-Based)

**How it works**:
```typescript
// Confluence CQL search
const confluenceResults = await confluenceAPI.search({
  cql: 'text ~ "Experience Cloud performance" AND space IN (TECH, ARCH)',
  limit: 10
});

// SharePoint KQL search
const sharepointResults = await graphAPI.search({
  query: 'portal AND performance AND FileType:pdf',
  limit: 10
});
```

**Pros**:
- ✅ **Fast**: Built-in search indexes (ElasticSearch, SharePoint Search)
- ✅ **No infrastructure**: Use existing platform search
- ✅ **Real-time**: New content searchable immediately
- ✅ **Respects permissions**: Platform handles access control

**Cons**:
- ❌ **Keyword-only**: Misses semantically similar content
- ❌ **Poor ranking**: Results not optimized for relevance
- ❌ **Query complexity**: Need to craft good search queries
- ❌ **No cross-source ranking**: Can't combine/rank Confluence + SharePoint results

**Best For**: Simple keyword lookups, known document titles

---

### Option 2: MCP Servers with Search Tools

**How it works**:
```typescript
// Use Atlassian MCP server
const results = await mcpClient.callTool('search_confluence', {
  query: 'Experience Cloud performance optimization',
  spaces: ['TECH', 'ARCH'],
  contentTypes: ['page', 'blogpost']
});
```

**Pros**:
- ✅ **Standardized interface**: One protocol for all sources
- ✅ **Managed auth**: OAuth handled by MCP server
- ✅ **Built-in search**: Leverage platform search
- ✅ **LLM-optimized responses**: Data formatted for AI consumption

**Cons**:
- ❌ **Still keyword-based**: No semantic search improvement
- ❌ **Limited to available MCPs**: SharePoint, wikis may lack MCP servers
- ❌ **No cross-source ranking**: Each MCP returns separate results

**Best For**: Standardizing access to multiple platforms, reducing custom API code

---

### Option 3: RAG with Vector Database (Semantic Search)

**How it works**:
```typescript
// 1. Ingest: Embed documents into vector DB
const embedding = await embedModel.embed(documentChunks);
await vectorDB.upsert(embedding, metadata);

// 2. Query: Convert PBI to embedding, find similar vectors
const queryEmbedding = await embedModel.embed(pbiDescription);
const results = await vectorDB.search(queryEmbedding, topK: 10);

// 3. Retrieve: Fetch full documents
const documents = await fetchDocuments(results.map(r => r.id));

// 4. Generate: LLM uses retrieved docs as context
const enrichedPBI = await llm.generate(pbiDescription, documents);
```

**Pros**:
- ✅ **Semantic search**: Finds conceptually similar content
- ✅ **Cross-source ranking**: Unified results from all sources
- ✅ **Better relevance**: Embedding similarity > keyword matching
- ✅ **Customizable**: Train embeddings on domain-specific data

**Cons**:
- ❌ **Infrastructure required**: Vector DB, embedding pipeline
- ❌ **Sync complexity**: Keep vector DB in sync with source systems
- ❌ **Cost**: Embedding API calls ($0.02/1M tokens for OpenAI)
- ❌ **Staleness risk**: Vector DB may be outdated if sync fails

**Best For**: Semantic search, cross-source retrieval, high relevance requirements

---

### Option 4: Hybrid Search (Vector + Keyword)

**How it works**:
```typescript
// 1. Vector search
const vectorResults = await vectorDB.search(queryEmbedding, topK: 50);

// 2. Keyword search (BM25)
const keywordResults = await elasticSearch.search(query, topK: 50);

// 3. Combine with Reciprocal Rank Fusion (RRF)
const combinedResults = reciprocalRankFusion([vectorResults, keywordResults]);

// 4. Rerank top results with LLM
const reranked = await llm.rerank(combinedResults.slice(0, 20), query);
```

**Pros**:
- ✅ **Best of both worlds**: Semantic + exact keyword matches
- ✅ **Higher recall**: Vector search finds similar, keyword finds exact
- ✅ **Better ranking**: RRF combines scores optimally
- ✅ **Handles edge cases**: Acronyms, product names (keyword), concepts (vector)

**Cons**:
- ❌ **Most complex**: Requires both vector DB and keyword search
- ❌ **Higher latency**: Two searches + reranking
- ❌ **More expensive**: Embedding + reranking LLM calls

**Best For**: Production systems needing highest accuracy

---

### Option 5: LLM-as-Search (Emergent Approach)

**How it works**:
```typescript
// Use Claude with extended context (200K tokens)
const allDocs = await fetchAllRelevantDocs();  // Hundreds of pages
const prompt = `
Given these documents:
${allDocs.join('\n\n')}

Find the most relevant information for this PBI:
${pbiDescription}
`;

const results = await claude.generate(prompt);
```

**Pros**:
- ✅ **No infrastructure**: No vector DB, no embedding
- ✅ **Contextual understanding**: LLM understands nuance
- ✅ **Flexible**: Works with any content

**Cons**:
- ❌ **Expensive**: 200K token prompts cost $3-6 per query
- ❌ **Slow**: Large context window = slower inference
- ❌ **Token limits**: Can't fit all docs (100+ pages max)
- ❌ **No caching**: Re-send docs every query

**Best For**: Prototyping, small document sets (<100 pages)

---

## RAG Architecture

### What is RAG?

**Retrieval-Augmented Generation** = Retrieve relevant docs, then use them as context for LLM generation.

**Standard RAG Pipeline**:
```
1. INGEST: Confluence pages → Chunk → Embed → Store in Vector DB
2. QUERY: PBI description → Embed → Search Vector DB
3. RETRIEVE: Top K similar chunks → Fetch full context
4. GENERATE: LLM uses retrieved docs to enrich PBI
```

---

### RAG for Backlog Chef

**Ingestion Pipeline**:

```typescript
class ConfluenceIngestionPipeline {
  async ingestSpace(spaceKey: string): Promise<void> {
    // 1. Fetch all pages in space
    const pages = await this.confluenceAPI.getPages(spaceKey, {
      expand: 'body.storage,version,metadata.labels'
    });

    for (const page of pages) {
      // 2. Parse HTML to plain text
      const plainText = this.htmlToText(page.body.storage.value);

      // 3. Extract metadata
      const metadata: DocumentMetadata = {
        id: page.id,
        title: page.title,
        url: page._links.webui,
        space: spaceKey,
        labels: page.metadata.labels.map(l => l.name),
        lastModified: page.version.when,
        author: page.version.by.displayName
      };

      // 4. Chunk document (512 tokens per chunk, 50 token overlap)
      const chunks = this.chunkDocument(plainText, {
        maxTokens: 512,
        overlap: 50
      });

      // 5. Create embeddings
      const embeddings = await this.embeddingModel.embedBatch(chunks);

      // 6. Store in vector DB with metadata
      await this.vectorDB.upsert(
        embeddings.map((embedding, idx) => ({
          id: `${page.id}_chunk_${idx}`,
          vector: embedding,
          metadata: {
            ...metadata,
            chunkIndex: idx,
            chunkText: chunks[idx]
          }
        }))
      );

      console.log(`Ingested: ${page.title} (${chunks.length} chunks)`);
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    // Use library like 'html-to-text'
    const { convert } = require('html-to-text');
    return convert(html, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' },
        { selector: 'table', format: 'dataTable' }
      ]
    });
  }

  /**
   * Chunk document with sliding window
   */
  private chunkDocument(
    text: string,
    options: { maxTokens: number; overlap: number }
  ): string[] {
    const chunks: string[] = [];
    const encoder = this.getTokenEncoder();

    let start = 0;
    const tokens = encoder.encode(text);

    while (start < tokens.length) {
      const end = Math.min(start + options.maxTokens, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      chunks.push(encoder.decode(chunkTokens));

      // Overlap next chunk
      start += options.maxTokens - options.overlap;
    }

    return chunks;
  }
}
```

**Query Pipeline**:

```typescript
class RAGQueryPipeline {
  async findRelevantContext(pbi: PBI): Promise<RetrievedDocument[]> {
    // 1. Extract search query from PBI
    const searchQuery = await this.extractSearchQuery(pbi);

    // 2. Create embedding for query
    const queryEmbedding = await this.embeddingModel.embed(searchQuery);

    // 3. Vector search
    const vectorResults = await this.vectorDB.search({
      vector: queryEmbedding,
      topK: 50,
      filter: {
        // Optional: filter by space, recency, etc.
        space: { $in: ['TECH', 'ARCH', 'PROD'] },
        lastModified: { $gte: '2024-01-01' }
      }
    });

    // 4. Deduplicate by document (multiple chunks from same doc)
    const uniqueDocs = this.deduplicateByDocument(vectorResults);

    // 5. Rerank with cross-encoder (optional, for higher accuracy)
    const reranked = await this.crossEncoderRerank(uniqueDocs, searchQuery);

    // 6. Fetch full document content for top results
    const topResults = reranked.slice(0, 5);
    const fullDocs = await this.fetchFullDocuments(topResults);

    return fullDocs;
  }

  /**
   * Extract optimal search query from PBI using LLM
   */
  private async extractSearchQuery(pbi: PBI): Promise<string> {
    const prompt = `
Extract a search query to find relevant technical documentation for this PBI:

Title: ${pbi.title}
Description: ${pbi.description}

Focus on:
- Technical components (e.g., "Experience Cloud", "Order object")
- Business problem (e.g., "customer portal performance")
- Architecture patterns (e.g., "caching strategy")

Return a concise search query (1-2 sentences).
`;

    return await this.llm.generate(prompt);
  }

  /**
   * Deduplicate chunks from same document
   */
  private deduplicateByDocument(
    results: VectorSearchResult[]
  ): VectorSearchResult[] {
    const seenDocs = new Set<string>();
    const unique: VectorSearchResult[] = [];

    for (const result of results) {
      const docId = result.metadata.id.split('_chunk_')[0];
      if (!seenDocs.has(docId)) {
        seenDocs.add(docId);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Rerank results with cross-encoder model (more accurate than embedding similarity)
   */
  private async crossEncoderRerank(
    results: VectorSearchResult[],
    query: string
  ): Promise<VectorSearchResult[]> {
    // Use a cross-encoder model (e.g., Cohere Rerank API, or local model)
    const scores = await this.rerankModel.score(
      results.map(r => ({ query, document: r.metadata.chunkText }))
    );

    // Sort by rerank score
    return results
      .map((r, idx) => ({ ...r, rerankScore: scores[idx] }))
      .sort((a, b) => b.rerankScore - a.rerankScore);
  }
}
```

---

### Advanced RAG Techniques

#### 1. **Hierarchical Chunking**
Instead of fixed 512-token chunks, use document structure:

```typescript
interface HierarchicalChunk {
  level: 'page' | 'section' | 'paragraph';
  title: string;
  content: string;
  parent?: string;  // Link to parent section
}

// Embed both full sections and paragraphs
// Retrieve at paragraph level, but return full section for context
```

**Benefits**: Better context preservation, more coherent results

---

#### 2. **Metadata Filtering**
Pre-filter vector search by metadata:

```typescript
await vectorDB.search({
  vector: queryEmbedding,
  topK: 50,
  filter: {
    space: { $in: ['TECH', 'ARCH'] },          // Only technical docs
    labels: { $contains: 'salesforce' },       // Must have Salesforce label
    lastModified: { $gte: '2024-01-01' }       // Recent docs only
  }
});
```

**Benefits**: Reduces irrelevant results, faster search

---

#### 3. **Hybrid Search (Vector + BM25)**
Combine vector search with keyword search:

```typescript
// Vector search
const vectorResults = await vectorDB.search(queryEmbedding, topK: 50);

// Keyword search (ElasticSearch BM25)
const keywordResults = await elasticSearch.search(query, topK: 50);

// Reciprocal Rank Fusion (RRF)
const combined = reciprocalRankFusion([
  vectorResults,
  keywordResults
], k: 60);
```

**RRF Formula**:
```
score(doc) = sum(1 / (k + rank_i(doc)))
```
Where `rank_i` is the rank from search method `i`, `k` is a constant (usually 60).

**Benefits**: Handles both semantic similarity AND exact keyword matches

---

#### 4. **Query Expansion**
Generate multiple search queries:

```typescript
const queries = await llm.generate(`
Generate 3 alternative search queries for this PBI:
"${pbiDescription}"

Return as JSON array.
`);

// Search with each query, combine results
const allResults = await Promise.all(
  queries.map(q => vectorDB.search(embed(q), topK: 20))
);

const combined = mergeResults(allResults);
```

**Benefits**: Higher recall (find more relevant docs)

---

#### 5. **Contextual Retrieval** (Anthropic's technique)
Add context to each chunk before embedding:

```typescript
// Instead of embedding raw chunk:
const chunk = "Performance optimization requires caching strategy.";

// Embed chunk with document context:
const contextualChunk = `
Document: Experience Cloud Architecture Guide
Section: Performance Best Practices

${chunk}
`;

const embedding = await embedModel.embed(contextualChunk);
```

**Benefits**: Chunks are more meaningful when retrieved in isolation

---

## Vector Database Solutions

### Comparison Matrix

| **Solution** | **Type** | **Cost** | **Pros** | **Cons** | **Best For** |
|--------------|----------|----------|----------|----------|--------------|
| **pgvector** | PostgreSQL extension | Free (open-source) | Co-located with main DB, low cost, simple | Limited scalability (>1M vectors slow) | MVP, small-medium datasets |
| **Pinecone** | Managed cloud | $70/mo (starter) | Fully managed, fast, scales to billions | Cost scales with vectors, vendor lock-in | Production, high scale |
| **Weaviate** | Self-hosted or cloud | Free (self-host) or $25/mo | Hybrid search built-in, flexible | Complex setup | Advanced RAG needs |
| **Qdrant** | Self-hosted or cloud | Free (self-host) or $20/mo | Fast, Rust-based, good filtering | Smaller ecosystem | Performance-critical apps |
| **Chroma** | Embedded or cloud | Free (embedded) | Easy to use, local-first | Not for production scale | Prototyping |
| **Milvus** | Self-hosted | Free (open-source) | High performance, scalable | Complex deployment | Enterprise, large scale |

---

### Recommended: **pgvector** (MVP) → **Pinecone** (Production)

#### Why pgvector for MVP?

```sql
-- Create vector table
CREATE TABLE document_embeddings (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  chunk_index INTEGER,
  embedding vector(1536),  -- OpenAI embedding dimension
  metadata JSONB,
  created_at TIMESTAMP
);

-- Create vector index (HNSW - fast approximate search)
CREATE INDEX ON document_embeddings
USING hnsw (embedding vector_cosine_ops);

-- Query similar vectors
SELECT
  id,
  document_id,
  metadata,
  1 - (embedding <=> query_embedding) AS similarity
FROM document_embeddings
ORDER BY embedding <=> query_embedding
LIMIT 10;
```

**Pros**:
- ✅ **Zero additional infrastructure**: Use existing PostgreSQL
- ✅ **Transactions**: ACID guarantees for vector + metadata updates
- ✅ **SQL integration**: Join vectors with relational data
- ✅ **Cost**: Free (open-source)

**Cons**:
- ❌ **Performance degrades** at >1M vectors (OK for MVP)
- ❌ **No multi-tenancy** (harder to isolate teams)

**When to migrate**: When hitting >500K vectors or need <50ms latency

---

#### Why Pinecone for Production?

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index('backlog-chef-docs');

// Upsert vectors
await index.upsert([
  {
    id: 'doc_123_chunk_0',
    values: embedding,  // 1536-dimensional vector
    metadata: {
      documentId: 'doc_123',
      title: 'Experience Cloud Guide',
      space: 'TECH',
      url: 'https://confluence.company.com/...',
      lastModified: '2025-10-15'
    }
  }
]);

// Query vectors
const results = await index.query({
  vector: queryEmbedding,
  topK: 10,
  filter: {
    space: { $in: ['TECH', 'ARCH'] },
    lastModified: { $gte: '2024-01-01' }
  },
  includeMetadata: true
});
```

**Pros**:
- ✅ **Managed**: No infrastructure to maintain
- ✅ **Fast**: <50ms queries even with billions of vectors
- ✅ **Scalable**: Auto-scales with load
- ✅ **Multi-tenancy**: Namespaces for teams/orgs

**Cons**:
- ❌ **Cost**: $70/mo starter (100K vectors), scales with usage
- ❌ **Vendor lock-in**: Proprietary API

**Pricing Example**:
- 1M vectors (1536-dim): ~$70-100/mo
- 10M vectors: ~$300-400/mo

---

## Data Synchronization Strategies

### Challenge: Keep Vector DB in Sync with Source Systems

**Sources change frequently**:
- Confluence pages updated daily
- SharePoint docs added/modified
- Wiki pages restructured

**Vector DB must reflect changes** → Requires sync strategy

---

### Strategy 1: **Scheduled Full Sync** (Simple but Inefficient)

```typescript
// Run every night at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Starting full sync...');

  // 1. Re-ingest all Confluence spaces
  for (const space of ['TECH', 'ARCH', 'PROD']) {
    await ingestionPipeline.ingestSpace(space);
  }

  // 2. Re-ingest all SharePoint sites
  await ingestionPipeline.ingestSharePoint();

  console.log('Full sync complete');
});
```

**Pros**:
- ✅ Simple to implement
- ✅ Guaranteed consistency (eventually)

**Cons**:
- ❌ **Wasteful**: Re-processes unchanged docs
- ❌ **Slow**: Takes hours for large doc sets
- ❌ **Expensive**: Re-embeds all docs ($$$)

**Best For**: MVP with <1,000 docs

---

### Strategy 2: **Incremental Sync** (Delta Updates)

```typescript
// Track last sync time
let lastSyncTime = loadLastSyncTime();

// Sync only changed docs
cron.schedule('*/30 * * * *', async () => {  // Every 30 minutes
  const now = new Date();

  // 1. Query Confluence for updated pages
  const updatedPages = await confluenceAPI.search({
    cql: `lastModified >= "${lastSyncTime.toISOString()}" AND space IN (TECH, ARCH)`,
    limit: 1000
  });

  console.log(`Found ${updatedPages.length} updated pages`);

  // 2. Re-embed updated pages
  for (const page of updatedPages) {
    // Delete old embeddings
    await vectorDB.delete({ documentId: page.id });

    // Re-embed and upsert
    await ingestionPipeline.ingestPage(page);
  }

  // 3. Update last sync time
  lastSyncTime = now;
  saveLastSyncTime(lastSyncTime);
});
```

**Pros**:
- ✅ **Efficient**: Only process changed docs
- ✅ **Fast**: Completes in minutes
- ✅ **Cost-effective**: Minimal re-embedding

**Cons**:
- ❌ **Complex**: Track sync state per source
- ❌ **Deletion handling**: Need to detect deleted docs

**Best For**: Production systems

---

### Strategy 3: **Webhook-Based Sync** (Real-Time)

```typescript
// Confluence webhook: POST to /webhooks/confluence
app.post('/webhooks/confluence', async (req, res) => {
  const event = req.body;

  switch (event.eventType) {
    case 'page_created':
    case 'page_updated':
      await ingestionPipeline.ingestPage(event.page.id);
      break;

    case 'page_removed':
      await vectorDB.delete({ documentId: event.page.id });
      break;
  }

  res.sendStatus(200);
});
```

**Pros**:
- ✅ **Real-time**: Changes reflected immediately
- ✅ **Efficient**: Only process what changed
- ✅ **No polling**: Reduces API load

**Cons**:
- ❌ **Webhook setup**: Requires admin access to configure
- ❌ **Reliability**: Webhooks can fail (need retry logic)
- ❌ **Not universal**: Not all platforms support webhooks

**Best For**: High-freshness requirements

---

### Strategy 4: **Change Data Capture (CDC)** (Advanced)

```typescript
// Use Debezium or similar to stream changes from Confluence DB
const cdcStream = new ConfluenceChangeStream();

cdcStream.on('change', async (change) => {
  if (change.table === 'confluence_pages') {
    switch (change.operation) {
      case 'INSERT':
      case 'UPDATE':
        await ingestionPipeline.ingestPage(change.after.id);
        break;

      case 'DELETE':
        await vectorDB.delete({ documentId: change.before.id });
        break;
    }
  }
});
```

**Pros**:
- ✅ **Guaranteed consistency**: Capture every change
- ✅ **Real-time**: Low latency
- ✅ **Reliable**: Database-level guarantees

**Cons**:
- ❌ **Requires DB access**: Not possible with SaaS platforms (Confluence Cloud)
- ❌ **Complex infrastructure**: Debezium, Kafka, etc.

**Best For**: On-premise deployments with DB access

---

### Recommended: **Incremental Sync (Strategy 2)** for MVP → **Webhooks (Strategy 3)** for Production

**MVP Implementation**:
```typescript
// Sync every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  await syncConfluence();
  await syncSharePoint();
});

async function syncConfluence() {
  const lastSync = await getLastSyncTime('confluence');
  const updatedPages = await confluenceAPI.search({
    cql: `lastModified >= "${lastSync}" AND space IN (TECH, ARCH)`,
    limit: 1000
  });

  for (const page of updatedPages) {
    await vectorDB.delete({ documentId: page.id });
    await ingestionPipeline.ingestPage(page);
  }

  await setLastSyncTime('confluence', new Date());
}
```

**Production Upgrade**:
- Add Confluence webhooks for real-time updates
- Keep incremental sync as fallback (every 6 hours) to catch missed webhooks

---

## Comparative Analysis

### Scenario: Find Relevant Context for Portal PBI

**PBI**: "Customer Order Tracking Portal with Experience Cloud"

---

### Approach 1: **Direct API Search (Keyword)**

```typescript
const results = await confluenceAPI.search({
  cql: 'text ~ "portal Experience Cloud" AND space = TECH'
});
```

**Results**:
- ✅ Found: "Experience Cloud Setup Guide" (exact keyword match)
- ❌ Missed: "Customer Self-Service Architecture" (semantically similar, no "portal" keyword)
- ❌ Missed: "Community Performance Optimization" (relevant but different terminology)

**Precision**: 70% | **Recall**: 40%

---

### Approach 2: **RAG with Vector Search**

```typescript
const queryEmbedding = await embedModel.embed(
  "Customer portal using Experience Cloud for order tracking"
);
const results = await vectorDB.search(queryEmbedding, topK: 10);
```

**Results**:
- ✅ Found: "Experience Cloud Setup Guide"
- ✅ Found: "Customer Self-Service Architecture" (semantically similar!)
- ✅ Found: "Community Performance Optimization" (related concept)
- ⚠️ Found: "Lightning Communities Migration" (relevant but outdated)

**Precision**: 80% | **Recall**: 75%

---

### Approach 3: **Hybrid Search (Vector + Keyword + Rerank)**

```typescript
// 1. Vector search
const vectorResults = await vectorDB.search(queryEmbedding, topK: 50);

// 2. Keyword search
const keywordResults = await confluenceAPI.search({
  cql: 'text ~ "portal Experience Cloud order"'
});

// 3. Combine with RRF
const combined = reciprocalRankFusion([vectorResults, keywordResults]);

// 4. Rerank top 20 with cross-encoder
const reranked = await rerankModel.rerank(combined.slice(0, 20), query);
```

**Results**:
- ✅ Found: All relevant docs from vector search
- ✅ Better ranking: Most relevant docs at top
- ✅ Exact matches prioritized: "Experience Cloud Setup Guide" #1
- ✅ Semantically similar: "Customer Self-Service Architecture" #2

**Precision**: 90% | **Recall**: 85%

---

### Cost Comparison (1,000 Confluence pages, 10 queries/day)

| **Approach** | **Setup Cost** | **Monthly Cost** | **Latency** |
|--------------|----------------|------------------|-------------|
| **Direct API** | $0 | $0 (Confluence included) | <500ms |
| **RAG (pgvector)** | 2 days dev | $10 (embedding API) | 1-2s |
| **RAG (Pinecone)** | 2 days dev | $80 ($70 Pinecone + $10 embedding) | <500ms |
| **Hybrid Search** | 4 days dev | $100 ($70 Pinecone + $10 embedding + $20 rerank) | 1-2s |

---

## Recommended Architecture

### Phase 1: **MVP - MCP + Direct Search** (Week 1-2)

**Approach**: Use MCP servers with keyword search

```typescript
// Simple, fast, no infrastructure
const confluenceResults = await mcpClient.callTool('search_confluence', {
  query: 'Experience Cloud portal performance',
  spaces: ['TECH', 'ARCH']
});

const sharepointResults = await graphAPI.search({
  query: 'portal performance best practices'
});

// Combine results manually
const allResults = [...confluenceResults, ...sharepointResults];
```

**Pros**:
- ✅ Fast to implement (1 week)
- ✅ No infrastructure costs
- ✅ Good enough for initial validation

**Cons**:
- ❌ Keyword-only search (lower recall)
- ❌ Manual result combination

**Deliverables**:
- MCP integration for Confluence + SharePoint
- Basic search query generation (using Claude)
- Manual result aggregation

---

### Phase 2: **RAG with pgvector** (Week 3-6)

**Approach**: Build basic RAG pipeline with pgvector

```typescript
// Ingestion (one-time + incremental sync)
await ingestConfluence(['TECH', 'ARCH', 'PROD']);
await ingestSharePoint();

// Query
const queryEmbedding = await embedModel.embed(searchQuery);
const results = await vectorDB.search(queryEmbedding, topK: 10);
```

**Pros**:
- ✅ Semantic search improves recall
- ✅ Low cost (no additional infra)
- ✅ Cross-source ranking

**Cons**:
- ❌ Slower queries (1-2s vs <500ms)
- ❌ Sync complexity (incremental updates)

**Deliverables**:
- Ingestion pipeline (Confluence, SharePoint, wikis)
- pgvector setup with HNSW index
- Incremental sync (every 30 mins)
- Query pipeline with semantic search

---

### Phase 3: **Hybrid Search + Pinecone** (Week 7-10)

**Approach**: Migrate to Pinecone, add hybrid search

```typescript
// Vector search (Pinecone)
const vectorResults = await pinecone.query({
  vector: queryEmbedding,
  topK: 50,
  filter: { space: { $in: ['TECH', 'ARCH'] } }
});

// Keyword search (ElasticSearch or Confluence API)
const keywordResults = await elasticSearch.search(query, topK: 50);

// Hybrid fusion
const combined = reciprocalRankFusion([vectorResults, keywordResults]);

// Rerank top 20
const reranked = await cohereRerank(combined.slice(0, 20), query);
```

**Pros**:
- ✅ Best accuracy (90%+ precision/recall)
- ✅ Fast queries (<500ms)
- ✅ Scales to millions of docs

**Cons**:
- ❌ Higher cost ($100/mo)
- ❌ More complex

**Deliverables**:
- Pinecone migration from pgvector
- ElasticSearch setup (or use Confluence API for keyword search)
- Reciprocal Rank Fusion implementation
- Cohere Rerank integration

---

### Phase 4: **Production Hardening** (Week 11-12)

**Add**:
- Webhook-based sync (real-time updates)
- Multi-tenancy (team-specific vector namespaces)
- Caching layer (Redis for frequent queries)
- Monitoring (query latency, sync health, embedding costs)

---

## Implementation Roadmap

### Week 1-2: MCP Keyword Search (MVP)
**Goal**: Prove value with simple keyword search

- [ ] Integrate Atlassian MCP (Confluence)
- [ ] Integrate Microsoft Graph API (SharePoint)
- [ ] Implement search query generation (Claude)
- [ ] Manual result aggregation
- [ ] Test with 10 sample PBIs

**Deliverable**: Basic context enrichment working

---

### Week 3-4: RAG Ingestion Pipeline
**Goal**: Build vector database foundation

- [ ] Set up pgvector in PostgreSQL
- [ ] Build Confluence ingestion pipeline
  - [ ] Fetch pages via API
  - [ ] Parse HTML to text
  - [ ] Chunk documents (512 tokens)
  - [ ] Generate embeddings (OpenAI)
  - [ ] Store in pgvector
- [ ] Build SharePoint ingestion pipeline
- [ ] Create initial vector index (1,000 docs)

**Deliverable**: Vector DB with initial doc set

---

### Week 5-6: RAG Query Pipeline
**Goal**: Semantic search working

- [ ] Implement query embedding generation
- [ ] Build vector search (pgvector cosine similarity)
- [ ] Implement result deduplication
- [ ] Test semantic search vs keyword search
- [ ] Measure precision/recall improvement

**Deliverable**: RAG-based context retrieval

---

### Week 7-8: Incremental Sync
**Goal**: Keep vector DB up-to-date

- [ ] Implement last sync time tracking
- [ ] Build incremental Confluence sync (CQL `lastModified >= ...`)
- [ ] Build incremental SharePoint sync (Graph API delta queries)
- [ ] Schedule sync every 30 minutes (cron)
- [ ] Monitor sync health (failed syncs, doc count drift)

**Deliverable**: Auto-updating vector DB

---

### Week 9-10: Hybrid Search + Pinecone Migration
**Goal**: Production-ready search

- [ ] Migrate from pgvector to Pinecone
- [ ] Implement keyword search (ElasticSearch or API fallback)
- [ ] Build Reciprocal Rank Fusion
- [ ] Integrate Cohere Rerank API
- [ ] Benchmark hybrid vs vector-only search

**Deliverable**: Production RAG system

---

### Week 11-12: Production Hardening
**Goal**: Reliable, scalable system

- [ ] Set up Confluence webhooks (real-time sync)
- [ ] Implement multi-tenancy (namespaces per team)
- [ ] Add Redis caching (frequent queries)
- [ ] Build monitoring dashboard (Grafana)
- [ ] Load testing (100 concurrent queries)

**Deliverable**: Production-ready deployment

---

## Conclusion

### Recommended Path

**For Backlog Chef**, the optimal approach is:

1. **Start Simple**: MCP keyword search (Week 1-2) to validate value
2. **Add Semantics**: RAG with pgvector (Week 3-6) for better results
3. **Optimize**: Hybrid search + Pinecone (Week 7-10) for production quality
4. **Scale**: Webhooks, caching, monitoring (Week 11-12) for reliability

### Key Decisions

| **Decision** | **Recommendation** | **Reasoning** |
|--------------|-------------------|---------------|
| **Search Method** | Hybrid (Vector + Keyword) | Best precision/recall trade-off |
| **Vector DB** | pgvector (MVP) → Pinecone (Prod) | Start simple, migrate when scaling |
| **Embedding Model** | OpenAI `text-embedding-3-small` | Best price/performance ($0.02/1M tokens) |
| **Sync Strategy** | Incremental (30 min) + Webhooks (real-time) | Balance freshness and reliability |
| **Chunk Size** | 512 tokens with 50 token overlap | Optimal for retrieval accuracy |
| **Reranking** | Cohere Rerank API | Significantly improves top-K results |

### Cost Estimate (Production)

**Monthly Costs**:
- Pinecone (1M vectors): $70-100
- OpenAI Embeddings (1M new docs/month): $20
- Cohere Rerank (10K queries/month): $10
- **Total**: ~$100-130/month

**One-Time Costs**:
- Development (12 weeks): ~$50-100K (fully loaded engineering cost)
- Initial embedding (10K docs): $20

### Expected Results

**Accuracy** (vs keyword search):
- Precision: 70% → 90% (+20%)
- Recall: 40% → 85% (+45%)

**User Experience**:
- Finds 2x more relevant context
- Better ranking (most relevant first)
- Cross-source results (Confluence + SharePoint unified)

### Should You Build This?

**Yes, if**:
- ✅ You have >1,000 unstructured docs to search
- ✅ Keyword search is missing relevant context
- ✅ You need cross-source unified search
- ✅ Users will run 100+ queries/month

**No, if**:
- ❌ You have <100 docs (use MCP keyword search)
- ❌ Keyword search works well enough (70%+ precision)
- ❌ Budget <$100/month for infrastructure

**For Backlog Chef**: **YES** - Context enrichment is a core value proposition, and semantic search is essential for finding relevant past work.

---

## Appendix: Code Examples

### A. Reciprocal Rank Fusion Implementation

```typescript
function reciprocalRankFusion(
  resultSets: SearchResult[][],
  k: number = 60
): SearchResult[] {
  const scoreMap = new Map<string, number>();

  for (const results of resultSets) {
    results.forEach((result, rank) => {
      const currentScore = scoreMap.get(result.id) || 0;
      scoreMap.set(result.id, currentScore + 1 / (k + rank + 1));
    });
  }

  // Convert to array and sort by RRF score
  return Array.from(scoreMap.entries())
    .map(([id, score]) => ({
      id,
      score,
      // Merge metadata from all result sets
      metadata: this.getMergedMetadata(id, resultSets)
    }))
    .sort((a, b) => b.score - a.score);
}
```

### B. Contextual Chunk Embedding

```typescript
async function embedChunkWithContext(
  chunk: string,
  documentContext: { title: string; section?: string }
): Promise<number[]> {
  const contextualChunk = `
Document: ${documentContext.title}
${documentContext.section ? `Section: ${documentContext.section}` : ''}

${chunk}
`.trim();

  return await embeddingModel.embed(contextualChunk);
}
```

### C. Cross-Encoder Reranking

```typescript
async function rerankWithCrossEncoder(
  results: SearchResult[],
  query: string
): Promise<SearchResult[]> {
  // Use Cohere Rerank API
  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'rerank-english-v2.0',
      query,
      documents: results.map(r => r.metadata.chunkText),
      top_n: 10
    })
  });

  const { results: reranked } = await response.json();

  return reranked.map(r => results[r.index]);
}
```

---

**End of Technical Paper**

**Next Steps**: Review recommended architecture → Approve budget → Start Week 1-2 implementation (MCP keyword search)
