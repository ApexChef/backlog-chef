# Technical Stack

## MVP (CLI)
- TypeScript/Node.js
- Anthropic Claude API
- **Model Context Protocol (MCP)** for data access:
  - Azure DevOps MCP Server (Microsoft official)
  - Atlassian MCP Server (Confluence/Jira)
  - Fireflies API (custom MCP wrapper)
- Local JSON storage

## V1 (Web App)
- Frontend: Next.js, shadcn/ui, Vercel
- Backend: Node.js, PostgreSQL, Redis
- Real-time: WebSockets
- Infrastructure: Vercel + Railway
- MCP: Same servers as MVP, production deployment

## Architecture
1. Modular pipeline (isolated steps)
2. Event-driven (async)
3. **MCP-first** for external data access (see [MCP Architecture](mcp-architecture.md))
4. API-first
5. Horizontally scalable

## Key Technical Decisions

### Why MCP for Context Enrichment?

**Traditional Approach**: Custom API clients for each service (DevOps, Confluence, Fireflies)
- 4-6 weeks development time
- Complex OAuth flows for each service
- Maintenance overhead (API version updates)
- Different data formats to parse

**MCP Approach**: Standardized protocol via MCP servers
- 1-2 weeks development time
- OAuth managed by MCP servers
- Auto-updates from MCP maintainers
- Standardized data format

See [docs/technical/mcp-architecture.md](mcp-architecture.md) for detailed architecture.
