# MCP-Based Architecture for Context Enrichment

## Overview

Step 4 (Enrich with Context) uses **Model Context Protocol (MCP)** to access unstructured data from multiple enterprise sources. This eliminates the need for custom API integrations and provides a standardized interface for context retrieval.

## Why MCP for Context Enrichment?

### Traditional Approach Challenges
- **Complex API integrations** - Each data source (DevOps, Confluence, Fireflies) has different APIs
- **Authentication management** - OAuth, API tokens, session handling for each service
- **Rate limiting** - Different limits and retry strategies per service
- **Data format inconsistencies** - HTML, Markdown, JSON, XML
- **Maintenance overhead** - API version updates, breaking changes

### MCP Solution Benefits
- **Standardized protocol** - One interface for all data sources
- **Built-in auth handling** - OAuth 2.0/2.1 managed by MCP servers
- **Optimized for LLMs** - Data pre-formatted for AI consumption
- **Community ecosystem** - Leverage existing, maintained servers
- **Simplified codebase** - No custom API clients to maintain

---

## Available MCP Servers

### 1. Azure DevOps MCP Server
**Status**: Generally Available (GA) - October 2025
**Provider**: Microsoft (Official)
**Repository**: [Tiberriver256/mcp-server-azure-devops](https://github.com/Tiberriver256/mcp-server-azure-devops)

**Capabilities**:
- Access work items (User Stories, Bugs, Features)
- Query pull requests and code reviews
- Retrieve build and release history
- Access test plans and results
- Read wiki documentation
- Semantic search across repositories

**Authentication**: Personal Access Token (PAT) or OAuth 2.0
**Deployment**: Local MCP server (runs in your network)
**Limitations**: Azure DevOps Services only (on-prem not yet supported)

**Configuration**:
```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "npx",
      "args": ["-y", "mcp-server-azure-devops"],
      "env": {
        "AZURE_DEVOPS_ORG": "your-org",
        "AZURE_DEVOPS_PAT": "your-pat-token"
      }
    }
  }
}
```

### 2. Atlassian MCP Server (Confluence + Jira)
**Status**: Public Beta
**Provider**: Atlassian (Official)
**Repository**: [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)

**Capabilities**:
- Search Confluence spaces and pages
- Read page content and blog posts
- Query Jira issues and backlogs
- Access project documentation
- Retrieve past sprint data
- Search comments and discussion threads

**Authentication**: OAuth 2.1 (browser-based PKCE flow)
**Deployment**: Remote MCP server (hosted by Atlassian on Cloudflare)
**Rate Limits**:
- Standard plan: Moderate usage
- Premium/Enterprise: 1,000 requests/hour + per-user limits

**Configuration**:
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "@atlassian/mcp-server"],
      "env": {
        "ATLASSIAN_SITE": "your-site.atlassian.net"
      }
    }
  }
}
```

**Alternative - Community Server (sooperset/mcp-atlassian)**:
- Supports on-premise Confluence/Jira (Server/Data Center)
- Docker deployment
- API token or OAuth authentication

### 3. Fireflies MCP Server
**Status**: Community (if available) or Custom Implementation Required
**Note**: No official Fireflies MCP found yet - may need custom implementation

**Potential Implementation**:
- Wrap Fireflies REST API in MCP server
- Expose meeting transcripts, summaries, action items
- Search historical meetings by topic/participant

---

## Architecture Design

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Step 4: Enrich with Context              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Context Enrichment Engine                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  1. Extract Search Queries (Claude)                 │  │
│  │     - Business problem description                  │  │
│  │     - Technical component keywords                  │  │
│  │     - Key concepts from PBI                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  2. Parallel MCP Queries                            │  │
│  │                                                       │  │
│  │    ┌──────────────┐  ┌──────────────┐  ┌──────────┐│  │
│  │    │ Azure DevOps │  │  Confluence  │  │Fireflies ││  │
│  │    │     MCP      │  │     MCP      │  │   MCP    ││  │
│  │    └──────────────┘  └──────────────┘  └──────────┘│  │
│  │          │                  │                │       │  │
│  └──────────┼──────────────────┼────────────────┼──────┘  │
│             │                  │                │          │
│             ▼                  ▼                ▼          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  3. Result Aggregation & Ranking                    │  │
│  │     - Deduplicate results                           │  │
│  │     - Score relevance                               │  │
│  │     - Sort by similarity + recency                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  4. Learning Extraction (Claude)                    │  │
│  │     - Analyze similar work                          │  │
│  │     - Extract estimation patterns                   │  │
│  │     - Identify risks from past work                 │  │
│  │     - Surface relevant decisions                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                              ▼
                    Enriched PBI with Context
```

### Component Architecture

```typescript
// Core enrichment orchestrator
class MCPContextEnricher {
  private mcpClients: {
    devops: MCPClient;
    confluence: MCPClient;
    fireflies: MCPClient;
  };

  async enrichPBI(candidate: ScoredPBI): Promise<EnrichedPBI> {
    // 1. Generate search queries using Claude
    const queries = await this.generateSearchQueries(candidate);

    // 2. Query all MCP sources in parallel
    const [devopsResults, confluenceResults, fireliesResults] =
      await Promise.all([
        this.queryDevOps(queries),
        this.queryConfluence(queries),
        this.queryFireflies(queries)
      ]);

    // 3. Aggregate and rank results
    const rankedResults = await this.rankResults({
      similarWork: devopsResults,
      pastDecisions: [...confluenceResults, ...fireliesResults],
      technicalDocs: confluenceResults
    });

    // 4. Extract learnings using Claude
    const learnings = await this.extractLearnings(
      candidate,
      rankedResults
    );

    return {
      ...candidate,
      context_enrichment: learnings
    };
  }

  private async generateSearchQueries(
    candidate: ScoredPBI
  ): Promise<SearchQueries> {
    const prompt = `
Analyze this PBI and generate search queries:
${JSON.stringify(candidate)}

Generate:
1. similarity_query: Natural language description of the business problem
2. technical_keywords: Salesforce components, objects, APIs mentioned
3. concept_keywords: Key concepts for finding past decisions
4. stakeholder_keywords: Roles or team members referenced

Return JSON.
`;

    return await this.claude.generate(prompt, {
      response_format: { type: 'json_object' }
    });
  }

  private async queryDevOps(queries: SearchQueries): Promise<DevOpsResult[]> {
    // Use MCP to search Azure DevOps
    const results = await this.mcpClients.devops.callTool(
      'search_work_items',
      {
        query: queries.similarity_query,
        workItemTypes: ['User Story', 'Bug', 'Feature'],
        states: ['Done', 'Closed'],
        maxResults: 10,
        // Search last 12 months for relevance
        dateFilter: {
          field: 'System.ChangedDate',
          operator: '>=',
          value: '@today - 365'
        }
      }
    );

    // Enrich with details from top results
    const enriched = await Promise.all(
      results.slice(0, 5).map(item =>
        this.mcpClients.devops.callTool('get_work_item_details', {
          id: item.id,
          includeComments: true,
          includeHistory: true
        })
      )
    );

    return enriched;
  }

  private async queryConfluence(
    queries: SearchQueries
  ): Promise<ConfluenceResult[]> {
    // Search Confluence using MCP
    const searchResults = await this.mcpClients.confluence.callTool(
      'search_content',
      {
        cql: `
          text ~ "${queries.similarity_query}" OR
          text ~ "${queries.technical_keywords.join(' ')}"
          AND type in (page, blogpost)
          AND space in (TECH, ARCH, PROD)
        `,
        limit: 10
      }
    );

    // Fetch full content for top results
    const fullContent = await Promise.all(
      searchResults.slice(0, 5).map(page =>
        this.mcpClients.confluence.callTool('get_page', {
          id: page.id,
          expand: 'body.storage,version,metadata.labels'
        })
      )
    );

    return fullContent;
  }

  private async queryFireflies(
    queries: SearchQueries
  ): Promise<MeetingResult[]> {
    // Search meeting transcripts
    const meetings = await this.mcpClients.fireflies.callTool(
      'search_transcripts',
      {
        query: queries.concept_keywords.join(' '),
        filters: {
          meetingTypes: ['refinement', 'planning', 'architecture'],
          dateRange: 'last_6_months'
        },
        limit: 5
      }
    );

    return meetings;
  }
}
```

---

## Implementation Strategy

### Phase 1: MCP Client Setup (Week 1)
**Goal**: Establish MCP connections to all data sources

**Tasks**:
1. Install and configure Azure DevOps MCP server
2. Set up Atlassian MCP server (Confluence/Jira)
3. Implement Fireflies MCP wrapper (if needed)
4. Create `MCPClient` wrapper class
5. Test basic queries to each source

**Success Criteria**:
- Can query work items from DevOps
- Can search Confluence pages
- Can retrieve meeting transcripts

### Phase 2: Query Generation (Week 2)
**Goal**: Generate effective search queries from PBI data

**Tasks**:
1. Create `SearchQueryGenerator` using Claude
2. Extract business problem descriptions
3. Identify technical components (Objects, APIs, etc.)
4. Extract key concepts and stakeholder references
5. Test query quality with sample PBIs

**Success Criteria**:
- Queries return relevant results 70%+ of the time
- Technical keywords match actual Salesforce components

### Phase 3: Result Aggregation (Week 3)
**Goal**: Combine and rank results from multiple sources

**Tasks**:
1. Implement result deduplication (same PBI in multiple results)
2. Score relevance using similarity metrics
3. Rank by: relevance × recency × completeness
4. Limit to top 10 results per source
5. Handle API errors and timeouts gracefully

**Success Criteria**:
- Top 5 results are relevant to PBI context
- No duplicate entries
- Fast response time (<3 seconds total)

### Phase 4: Learning Extraction (Week 4)
**Goal**: Extract actionable insights using Claude

**Tasks**:
1. Create `LearningExtractor` prompts
2. Identify estimation patterns (estimated vs actual)
3. Extract technical challenges and solutions
4. Surface relevant past decisions
5. Generate risk flags automatically

**Success Criteria**:
- Learnings are specific and actionable
- Risk flags match actual historical issues
- Estimation insights reference concrete data

---

## Key Decisions

### MCP vs Custom API Integration

| Aspect | Custom API | MCP Approach |
|--------|-----------|--------------|
| **Development Time** | 4-6 weeks | 1-2 weeks |
| **Authentication** | Custom OAuth per service | Handled by MCP |
| **Maintenance** | API version updates | MCP server updates |
| **Data Format** | Custom parsing | Standardized |
| **Rate Limiting** | Custom retry logic | MCP handles |
| **Cost** | Dev time + infra | MCP server hosting |

**Decision**: Use MCP for faster time-to-value and reduced maintenance

### Local vs Remote MCP Servers

| Server Type | Pros | Cons | Recommendation |
|------------|------|------|----------------|
| **Local** (Azure DevOps) | Data stays in network, full control | Requires local setup | ✅ Use for DevOps |
| **Remote** (Atlassian) | No infra needed, auto-updates | Data sent to Cloudflare | ✅ Use for Confluence |

### Search Strategy

**Approach**: Keyword-based search via MCP (not vector search)

**Reasoning**:
- MCP servers provide optimized search APIs (CQL for Confluence, WIQL for DevOps)
- Avoids need for vector database infrastructure
- Leverages existing search indexes in source systems
- Can add vector search later if keyword search insufficient

**Trade-off**: May miss semantically similar results, but simpler to implement

---

## Error Handling & Resilience

### MCP Server Failures
```typescript
class MCPClientWithFallback {
  async callTool(
    tool: string,
    params: object,
    options: { timeout?: number; retries?: number } = {}
  ) {
    const { timeout = 5000, retries = 2 } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await Promise.race([
          this.mcpClient.callTool(tool, params),
          this.timeoutPromise(timeout)
        ]);
      } catch (error) {
        if (attempt === retries) {
          // Log error and return empty results
          this.logger.error(`MCP call failed after ${retries} retries`, {
            tool,
            error
          });
          return [];
        }
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
}
```

### Partial Failure Handling
- If DevOps MCP fails → continue with Confluence + Fireflies
- If all MCPs fail → return PBI with warning flag "Context enrichment unavailable"
- Cache successful results for 24 hours to reduce failures

---

## Configuration

### Environment Variables
```bash
# Azure DevOps
AZURE_DEVOPS_ORG=your-org
AZURE_DEVOPS_PAT=your-personal-access-token

# Atlassian
ATLASSIAN_SITE=your-site.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token

# Fireflies
FIREFLIES_API_KEY=your-api-key
```

### MCP Server Configuration
File: `~/.config/backlog-chef/mcp-config.json`

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "npx",
      "args": ["-y", "mcp-server-azure-devops"],
      "env": {
        "AZURE_DEVOPS_ORG": "${AZURE_DEVOPS_ORG}",
        "AZURE_DEVOPS_PAT": "${AZURE_DEVOPS_PAT}"
      }
    },
    "atlassian": {
      "command": "npx",
      "args": ["-y", "@atlassian/mcp-server"],
      "env": {
        "ATLASSIAN_SITE": "${ATLASSIAN_SITE}"
      }
    },
    "fireflies": {
      "command": "node",
      "args": ["./src/mcp-servers/fireflies-mcp.js"],
      "env": {
        "FIREFLIES_API_KEY": "${FIREFLIES_API_KEY}"
      }
    }
  }
}
```

---

## Testing Strategy

### Unit Tests
- Mock MCP client responses
- Test query generation logic
- Verify result ranking algorithms

### Integration Tests
- Test against real MCP servers (staging environment)
- Verify auth flow works end-to-end
- Measure response times

### E2E Tests
- Process sample PBI through full enrichment pipeline
- Validate enriched output format
- Check that learnings are accurate

---

## Monitoring & Observability

### Key Metrics
- MCP query latency (p50, p95, p99)
- MCP error rate by server
- Result relevance score (user feedback)
- Cache hit rate
- API quota usage

### Logging
```typescript
logger.info('MCP query started', {
  pbiId: candidate.id,
  server: 'azure-devops',
  query: queries.similarity_query
});

logger.info('MCP query completed', {
  pbiId: candidate.id,
  server: 'azure-devops',
  resultsCount: results.length,
  latencyMs: latency
});
```

---

## Future Enhancements

### V2: Vector Search via MCP
- If MCP servers add vector search capabilities, switch from keyword to semantic search
- Improves "similar work" matching

### V3: Multi-Tenant Support
- Support multiple Azure DevOps orgs
- Support multiple Confluence sites
- Per-team MCP configurations

### V4: Custom MCP Servers
- Salesforce MCP (query Setup Audit Trail, Schema changes)
- GitHub MCP (PRs, code reviews, discussions)
- Slack MCP (team conversations, decision threads)

---

## References

- [Azure DevOps MCP Server Documentation](https://learn.microsoft.com/en-us/azure/devops/mcp-server/mcp-server-overview)
- [Atlassian MCP Server Announcement](https://www.atlassian.com/blog/announcements/remote-mcp-server)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Server Registry](https://mcpservers.org/)