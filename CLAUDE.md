# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Backlog Chef** (formerly Backlog Intelligence) is an AI-powered system that transforms Scrum refinement meetings into structured, high-quality Product Backlog Items (PBIs). It's not just transcription - it's an intelligent refinement assistant that prevents incomplete PBIs, learns from history, and provides actionable insights.

## Core Architecture

### 8-Step Processing Pipeline

The system follows a sequential pipeline for processing meeting transcripts:

1. **Event Detection** - Identifies meeting type (refinement, planning, retrospective)
2. **Extract Candidate PBIs** - Parses transcript to identify potential backlog items
3. **Score Confidence** - Evaluates completeness against quality checklist
4. **Enrich with Context** - Searches similar work, past decisions, technical docs
5. **Check Risks & Conflicts** - Detects dependencies, scope creep, blockers
6. **Generate Questions + Proposals** - Creates actionable questions with suggested answers
7. **Run Readiness Checker** - Validates against Definition of Ready criteria
8. **Final Output** - Formats for multiple destinations (DevOps, Obsidian, Confluence)

Each step's documentation is in `docs/features/processing-pipeline/XX-step-name.md` with Input, Process, and Output sections.

### Configuration-Driven Design

The system uses YAML configuration files:

- **`config/workflows/*.yaml`** - Pipeline definitions for different event types
- **`config/stakeholders.yaml`** - Team member registry for question routing
- **`config/adapters/`** - Output format adapters (DevOps, Obsidian, Confluence)

### Key Design Principles

1. **Modular Pipeline** - Each step is isolated and testable
2. **Event-Driven** - Asynchronous processing supports real-time features
3. **API-First** - Integrates with Fireflies, Azure DevOps, Confluence
4. **Quality Built-In** - Confidence scoring prevents incomplete requirements

## Documentation Structure

- **`docs/poc/`** - Proof of concept with complete example walkthrough
- **`docs/features/`** - Feature specifications
  - `core-features.md` - 10 essential quality tools
  - `real-time-features.md` - Live meeting capabilities
  - `processing-pipeline/` - Detailed step-by-step pipeline docs
- **`docs/business/`** - Market opportunity and go-to-market strategy
- **`docs/technical/`** - Tech stack and architecture decisions

## Tech Stack

### Planned MVP (CLI)
- TypeScript/Node.js
- Anthropic Claude API for LLM processing
- Fireflies API for meeting transcripts
- Azure DevOps, Confluence APIs for integration
- Local JSON storage

### Planned V1 (Web App)
- Frontend: Next.js, shadcn/ui, Vercel
- Backend: Node.js, PostgreSQL, Redis
- Real-time: WebSockets
- Infrastructure: Vercel + Railway

## Domain Concepts

### PBI Quality Metrics

The system evaluates PBIs using confidence scores:
- `isCompletePBI` - Clear business value and actionable scope
- `hasAllRequirements` - Critical questions answered
- `isRefinementComplete` - Ready for sprint planning
- `hasAcceptanceCriteria` - Testable conditions defined
- `hasClearScope` - Boundaries explicitly documented
- `isEstimable` - Team can size the work

### Readiness Categories

PBIs are categorized as:
- **READY FOR SPRINT** - All criteria met, can start immediately
- **NOT READY** - Blocking issues must be resolved
- **NEEDS REFINEMENT** - High-priority questions unanswered
- **DEFERRED** - Intentionally postponed, tracked separately
- **FUTURE PHASE** - Requires significant additional research

### Stakeholder Intelligence

Questions are routed to appropriate roles:
- ProductOwner - Business decisions, scope, priorities
- Developer - Technical approach, estimates
- UXDesigner - User experience, interface design
- BusinessAnalyst - Data analysis, requirements
- SecurityArchitect - Compliance, permissions
- SalesforceAdmin - Configuration, limits

## Development Context

This is currently a **documentation-first project** - no implementation exists yet. All files describe the planned system architecture and features.

When implementing:
1. Start with the pipeline steps in sequence
2. Use the YAML configs as the contract between components
3. Reference `docs/poc/proof-of-concept.md` for expected behavior
4. Each pipeline step should be independently testable
5. Output must match the formats shown in step 8 documentation

## File Naming Conventions

- Pipeline step docs: `XX-descriptive-name.md` (numbered 01-08)
- Config files: `kebab-case.yaml`
- Documentation: `kebab-case.md`

## Important Notes

- This is a **Scrum/Agile-specific** tool, not general transcription
- Focus on **quality over speed** - prevent bad PBIs from entering sprints
- System should **learn from history** - similar work, past estimates
- **Propose solutions**, don't just identify problems
- Support **multiple output formats** - teams use different tools
