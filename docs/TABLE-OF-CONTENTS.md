# Backlog Chef Documentation - Table of Contents

> **Purpose**: This document serves as a master index for all Backlog Chef documentation, enabling AI agents and developers to quickly locate relevant information when enriching PBIs with context during the pipeline execution.

## How to Use This TOC

- **AI Agents**: Use keywords/tags to find relevant documentation when processing PBIs
- **Developers**: Navigate to specific documentation quickly
- **Maintainers**: Update this file when adding/modifying documentation

---

## 📋 Project Overview

### `docs/roadmap.md`
**Description**: Product roadmap with planned features and timeline
**Keywords**: roadmap, future features, planning, priorities, releases
**Relevant for**: Feature planning, understanding project direction, long-term vision

---

## 🏗️ Architecture & Design

### `docs/architecture/06-architecture-flow.md`
**Description**: High-level system architecture and data flow diagrams
**Keywords**: architecture, system design, data flow, components, structure
**Relevant for**: Understanding system structure, component relationships, technical decisions

### `docs/architecture/pact-phases/01-architect-multi-agent-system.md`
**Description**: Multi-agent system design following PACT framework
**Keywords**: multi-agent, PACT framework, agents, orchestration, agent design
**Relevant for**: Agent architecture, multi-agent coordination, PACT methodology

### `docs/diagrams/pipeline-dependency-graph.md`
**Description**: Visual representation of pipeline step dependencies
**Keywords**: pipeline, dependencies, graph, visualization, steps
**Relevant for**: Understanding pipeline flow, step relationships, execution order

### `docs/pipeline-dependencies.md`
**Description**: Detailed documentation of pipeline step dependencies
**Keywords**: pipeline, dependencies, steps, execution order, prerequisites
**Relevant for**: Pipeline implementation, step sequencing, dependency management

### `docs/output-structure.md`
**Description**: Structure and format of pipeline output files
**Keywords**: output, format, structure, results, JSON, file structure
**Relevant for**: Output formatting, result interpretation, file organization

---

## 🎯 Features & Capabilities

### `docs/features/README.md`
**Description**: Overview of all feature categories
**Keywords**: features, overview, capabilities, summary
**Relevant for**: High-level feature understanding, capability discovery

### `docs/features/core-features.md`
**Description**: 10 essential quality tools and core capabilities
**Keywords**: core features, quality tools, essential capabilities, main features
**Relevant for**: Core functionality, quality metrics, essential tools

### `docs/features/processing-pipeline.md`
**Description**: Overview of the 8-step processing pipeline
**Keywords**: pipeline, processing, steps, workflow, execution
**Relevant for**: Pipeline overview, processing workflow, step summary

### `docs/features/real-time-features.md`
**Description**: Live meeting capabilities and real-time processing
**Keywords**: real-time, live meetings, streaming, immediate feedback
**Relevant for**: Real-time processing, live features, streaming capabilities

---

## 🔄 Pipeline Steps (Detailed)

### `docs/features/processing-pipeline/01-event-detection.md`
**Description**: Step 1 - Identifies meeting type (refinement, planning, retrospective)
**Keywords**: event detection, meeting type, classification, refinement, planning, retrospective
**Relevant for**: Meeting classification, event identification, step 1 implementation

### `docs/features/processing-pipeline/02-extract-candidate-pbis.md`
**Description**: Step 2 - Parses transcript to identify potential backlog items
**Keywords**: extraction, PBI detection, parsing, candidates, backlog items
**Relevant for**: PBI extraction, parsing logic, candidate identification, step 2

### `docs/features/processing-pipeline/03-score-confidence.md`
**Description**: Step 3 - Evaluates completeness against quality checklist
**Keywords**: confidence scoring, quality metrics, completeness, evaluation
**Relevant for**: Quality assessment, confidence metrics, scoring logic, step 3

### `docs/features/processing-pipeline/04-enrich-with-context.md`
**Description**: Step 4 - Searches similar work, past decisions, technical docs
**Keywords**: enrichment, context, similar work, past decisions, documentation search
**Relevant for**: Context enrichment, historical data, documentation lookup, step 4

### `docs/features/processing-pipeline/05-check-risks-conflicts.md`
**Description**: Step 5 - Detects dependencies, scope creep, blockers
**Keywords**: risk detection, conflicts, dependencies, scope creep, blockers
**Relevant for**: Risk analysis, conflict detection, dependency checking, step 5

### `docs/features/processing-pipeline/06-generate-questions-proposals.md`
**Description**: Step 6 - Creates actionable questions with suggested answers
**Keywords**: questions, proposals, suggestions, clarification, stakeholders
**Relevant for**: Question generation, proposal creation, clarification logic, step 6

### `docs/features/processing-pipeline/07-run-readiness-checker.md`
**Description**: Step 7 - Validates against Definition of Ready criteria
**Keywords**: readiness, validation, definition of ready, criteria, sprint ready
**Relevant for**: Readiness validation, DoR checking, sprint readiness, step 7

### `docs/features/processing-pipeline/08-final-output.md`
**Description**: Step 8 - Formats for multiple destinations (DevOps, Obsidian, Confluence)
**Keywords**: output formatting, export, DevOps, Obsidian, Confluence, final output
**Relevant for**: Output generation, formatting, export options, step 8

---

## 💼 Business & Market

### `docs/business/market-opportunity.md`
**Description**: Market analysis and opportunity assessment
**Keywords**: market, opportunity, business case, market analysis, competition
**Relevant for**: Business context, market positioning, opportunity sizing

### `docs/business/go-to-market.md`
**Description**: Go-to-market strategy and launch planning
**Keywords**: GTM, go-to-market, launch, strategy, sales, marketing
**Relevant for**: Launch planning, market strategy, sales approach

---

## 🔧 Technical Implementation

### `docs/technical/tech-stack.md`
**Description**: Technology stack, frameworks, and tools used
**Keywords**: tech stack, technologies, frameworks, tools, languages, libraries
**Relevant for**: Technology decisions, stack overview, tool selection

### `docs/technical/architecture-comparison.md`
**Description**: Comparison of SaaS vs Local-First architectures
**Keywords**: architecture comparison, SaaS, local-first, deployment models
**Relevant for**: Deployment decisions, architecture choices, hosting models

### `docs/technical/local-first-architecture.md`
**Description**: Local-first architecture with user-provided API keys
**Keywords**: local-first, API keys, client-side, privacy, user keys
**Relevant for**: Local deployment, API key management, privacy considerations

### `docs/technical/authentication-architecture.md`
**Description**: Authentication and authorization system design
**Keywords**: authentication, authorization, auth, security, access control
**Relevant for**: Auth implementation, security, access control

### `docs/technical/cli-authentication-example.md`
**Description**: CLI authentication implementation examples
**Keywords**: CLI auth, command-line authentication, examples, implementation
**Relevant for**: CLI development, auth examples, command-line tools

### `docs/technical/user-api-keys-implementation.md`
**Description**: Implementation of user-provided API key management
**Keywords**: API keys, user keys, key management, configuration
**Relevant for**: API key handling, user configuration, key storage

### `docs/technical/mcp-architecture.md`
**Description**: Model Context Protocol integration architecture
**Keywords**: MCP, Model Context Protocol, integration, AI models
**Relevant for**: MCP integration, AI model configuration, protocol implementation

### `docs/technical/pipeline-configuration-architecture.md`
**Description**: Pipeline configuration system and YAML structure
**Keywords**: pipeline config, YAML, configuration, workflows, settings
**Relevant for**: Pipeline configuration, YAML structure, workflow setup

### `docs/technical/yaml-to-code-mapping.md`
**Description**: Mapping between YAML configuration and code implementation
**Keywords**: YAML mapping, config to code, implementation mapping
**Relevant for**: Config implementation, YAML parsing, code generation

### `docs/technical/CONFIGURATION-DELIVERABLES.md`
**Description**: Configuration deliverables and file specifications
**Keywords**: configuration deliverables, config files, specifications
**Relevant for**: Config file structure, deliverables, specifications

### `docs/technical/configuration-examples-summary.md`
**Description**: Summary of configuration examples and use cases
**Keywords**: config examples, use cases, configuration patterns
**Relevant for**: Configuration patterns, example configs, usage examples

### `docs/technical/logging-and-analytics.md`
**Description**: Logging, analytics, and monitoring implementation
**Keywords**: logging, analytics, monitoring, observability, metrics
**Relevant for**: Logging setup, analytics implementation, monitoring

### `docs/technical/analytics-examples.md`
**Description**: Analytics implementation examples and patterns
**Keywords**: analytics examples, metrics, tracking, usage analytics
**Relevant for**: Analytics patterns, tracking implementation, metrics collection

### `docs/technical/human-in-the-loop-training.md`
**Description**: Human-in-the-loop training and feedback mechanisms
**Keywords**: HITL, human feedback, training, learning, feedback loops
**Relevant for**: Feedback systems, learning mechanisms, human input

---

## 🧪 Proof of Concept

### `docs/poc/proof-of-concept.md`
**Description**: Complete POC walkthrough with example outputs
**Keywords**: POC, proof of concept, example, demo, walkthrough
**Relevant for**: Understanding system behavior, example outputs, demo scenarios

### `docs/poc/transcript.md`
**Description**: Example transcript used in POC
**Keywords**: example transcript, sample input, demo transcript
**Relevant for**: Sample inputs, example meetings, test data

### `docs/poc/transcript-summary.md`
**Description**: Summary and analysis of POC transcript
**Keywords**: transcript summary, POC analysis, example analysis
**Relevant for**: Example analysis, POC results, sample outputs

---

## 📊 How AI Agents Should Use This TOC

### For Step 4 (Enrich with Context):

1. **Identify PBI Topic**: Parse the PBI being processed to identify key topics
2. **Search by Keywords**: Use keywords from this TOC to find relevant documentation
3. **Read Relevant Docs**: Fetch and read the most relevant 2-3 documents
4. **Extract Context**: Pull relevant patterns, constraints, and past decisions
5. **Enrich PBI**: Add contextual information to the PBI

### Example Search Patterns:

- **PBI about CLI**: Search keywords "CLI", "command-line", "OCLIF"
  → Read: `cli-authentication-example.md`, `tech-stack.md`

- **PBI about authentication**: Search keywords "auth", "authentication", "security"
  → Read: `authentication-architecture.md`, `user-api-keys-implementation.md`

- **PBI about pipeline steps**: Search keywords "pipeline", "steps", "processing"
  → Read: `processing-pipeline.md`, specific step docs (01-08)

- **PBI about output formats**: Search keywords "output", "format", "export"
  → Read: `08-final-output.md`, `output-structure.md`

---

## 🔄 Maintenance Instructions

**When adding new documentation:**

1. Add the file to the appropriate section
2. Include: Path, Description, Keywords, "Relevant for" context
3. Update the last modified date below
4. Keep keywords specific and searchable
5. Ensure description is concise (1-2 sentences)

**When modifying existing docs:**
- Update keywords if topic changes
- Update description if focus shifts
- Keep this TOC in sync with actual file structure

---

**Last Updated**: November 20, 2025
**Total Documents**: 37 markdown files indexed
**Maintained by**: Backlog Chef Team
