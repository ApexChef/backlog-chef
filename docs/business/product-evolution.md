# Backlog Chef - Product Evolution

**Last Updated:** November 20, 2025
**Status:** Active Development (Dogfooding Phase)

---

## Executive Summary

Backlog Chef started as a simple tool to convert meeting transcripts into Product Backlog Items. Through dogfooding and iterative development, it has evolved into an **AI-powered development orchestration system** that bridges the gap between requirements and execution.

**Current State:**
- ✅ Converts meeting transcripts → structured PBIs
- ✅ Enriches PBIs with historical context and documentation
- ✅ Scores PBI quality and identifies gaps
- ✅ Generates questions with AI-proposed answers
- ✅ Assesses sprint readiness

**Emerging Vision:**
- 🚀 PBIs that know which AI agents can execute them
- 🚀 Automatic task generation from Definition of Done
- 🚀 Self-improving system that identifies missing capabilities
- 🚀 Closed-loop workflow: Meeting → PBI → Tasks → Execution → Review

---

## Evolution Timeline

### Phase 1: Foundation (Nov 1-10, 2025)
**Original Vision:** "Fireflies for requirements"

**Goal:** Convert Scrum refinement meeting transcripts into structured PBI JSON.

**What We Built:**
- 8-step processing pipeline
- Multi-format input support (TXT, JSON, XML)
- Event type detection (refinement, planning, retrospective)
- PBI extraction with acceptance criteria
- Confidence scoring (completeness, clarity, actionability)

**Key Insight:** Static PBI generation isn't enough - we need intelligence.

---

### Phase 2: Intelligence (Nov 11-15, 2025)
**Shift:** From "transcript parser" to "intelligent assistant"

**What We Added:**
- Context enrichment from project documentation
- TABLE-OF-CONTENTS.md for AI-driven doc discovery
- Risk analysis with mitigation strategies
- Question generation with AI-proposed answers
- Readiness assessment (Ready, Needs Refinement, Not Ready)

**Key Insight:** PBIs need historical context to be truly useful.

---

### Phase 3: Dogfooding (Nov 16-20, 2025)
**Shift:** Using Backlog Chef to build Backlog Chef

**What We Discovered:**
- We created `project-backlog-items/` folder for our own PBIs
- Ran the system on ourselves (PBI-001: OCLIF CLI, PBI-002: Step 4 Optimization)
- Found mock data in Step 4 → Fixed to use real docs
- Realized Step 4 is slow ($0.006/PBI, 37s) → Created optimization PBI

**Innovations from Dogfooding:**
1. **Smart Output Path Detection** - Auto-routes output based on input pattern
2. **Performance Awareness** - System tracks its own cost/time metrics
3. **Self-Improvement** - We use the tool to plan improving the tool

**Key Insight:** Dogfooding reveals what a static spec never would.

---

### Phase 4: Execution-Aware PBIs (Current - Nov 20, 2025)
**Paradigm Shift:** From "generating requirements" to "generating executable specifications"

**Emerging Capabilities:**
1. **Agent/Skill Awareness** (PBI-003)
   - PBIs know which Claude Code agents can execute them
   - Recommends skills from Claude Code skill library
   - Detects when new agents/skills are needed

2. **Definition of Done → Task Generation** (PBI-004)
   - Automatically generate implementation tasks from DoD
   - Link tasks to acceptance criteria
   - Flag tasks that require human approval

3. **Execution Boundaries**
   - PBIs specify what Claude Code is allowed to do
   - Define tool permissions, file scope, testing requirements
   - Set safety constraints

**Key Insight:** PBIs should be more than requirements - they should be execution roadmaps.

---

### Phase 5: Continuous Refinement (Planned)
**Next Evolution:** Closed-loop quality improvement

**Vision:**
- **Re-Refinement Workflow**
  - Low-scoring PBIs (< 70) auto-generate re-refinement meeting agendas
  - System groups PBIs by gaps and open questions
  - Second meeting addresses gaps
  - Pipeline runs in "update mode" to enrich existing PBIs

- **PBI Versioning**
  - Track PBI evolution (v1 → v2 → v3)
  - Show what changed between refinements
  - Measure quality improvement over time

---

## Product Vision Evolution

### Original Vision (Nov 1)
> "A tool that converts meeting transcripts into structured PBIs for Azure DevOps"

**Target User:** Scrum teams doing manual PBI creation
**Value Prop:** Save time, reduce transcription errors
**Scope:** Single pipeline, static output

---

### Current Vision (Nov 20)
> "An AI-powered development orchestration system that transforms requirements into executable specifications with embedded execution intelligence"

**Target User:** AI-augmented development teams using Claude Code
**Value Prop:**
- Eliminate gap between "what to build" and "how to build it"
- PBIs that guide AI agents through implementation
- Self-improving system that learns from history
- Continuous quality improvement through re-refinement

**Scope:** Multi-phase workflow with feedback loops

---

## Strategic Implications

### Market Positioning

**Before (Simple Tool):**
- Category: Requirements Management
- Competitors: Manual PBI creation, basic transcript tools
- Differentiator: AI-powered PBI generation

**Now (Orchestration Platform):**
- Category: AI-Augmented Development Platform
- Competitors: Traditional ALM tools (Jira, Azure DevOps), AI coding tools (GitHub Copilot, Cursor)
- Differentiator: **Bridge between human collaboration and AI execution**

**Unique Position:**
We're not just generating requirements OR executing code. We're creating **the missing link** - requirements that AI can act on autonomously.

---

### Competitive Advantages

1. **Execution Intelligence Built-In**
   - Competitors: Generate PBIs without execution context
   - Us: PBIs know which agents, skills, and tools to use

2. **Self-Improving System**
   - Competitors: Static tools that don't learn
   - Us: System detects missing capabilities and recommends new agents/skills

3. **Dogfooding-Driven**
   - Competitors: Build for hypothetical users
   - Us: We ARE the users - immediate feedback loop

4. **Historical Context Awareness**
   - Competitors: Each PBI is isolated
   - Us: PBIs enriched with similar work, past decisions, technical docs

---

## Business Model Evolution

### Phase 1 Monetization (Original)
- **Model:** SaaS subscription
- **Tiers:** Free (5 PBIs/month), Pro ($29/month), Team ($99/month)
- **Revenue Driver:** Meeting volume

### Phase 2 Monetization (Emerging)
- **Model:** Platform + Marketplace
- **Base Platform:** PBI generation and orchestration
- **Add-Ons:**
  - Custom AI agents ($19/agent/month)
  - Skill library packs ($9/pack/month)
  - Integration connectors (Azure DevOps, Jira, GitHub)
- **Enterprise:** Custom deployments with private skill libraries

### Phase 3 Monetization (Future)
- **Model:** AI Development Platform
- **Value Metric:** PBIs executed to completion by AI
- **Pricing:** Usage-based (per AI-executed PBI)
- **Enterprise:** Dedicated AI agent clusters, custom skill development

---

## Key Metrics Evolution

### Original Metrics (Phase 1)
- PBIs generated per month
- Accuracy of PBI extraction
- User satisfaction with output quality

### Current Metrics (Phase 3)
- PBIs generated per month
- PBI quality scores (completeness, clarity, actionability)
- Context enrichment hit rate (% with relevant docs found)
- Readiness improvement (% moving from Not Ready → Ready)
- Cost per PBI (AI API costs)
- Time per PBI (pipeline performance)

### Future Metrics (Phase 5)
- PBIs executed end-to-end by AI agents
- Task completion rate (automated vs manual)
- Agent recommendation accuracy
- New agent/skill creation rate
- Re-refinement effectiveness (quality score delta)
- Time from meeting → working code

---

## Product Roadmap Alignment

### Immediate (Q4 2025)
- ✅ Basic pipeline (Steps 1-8)
- ✅ Dogfooding infrastructure
- ✅ Smart output routing
- 🚧 OCLIF CLI (PBI-001)
- 🚧 Step 4 optimization (PBI-002)
- 📋 Agent/Skill awareness (PBI-003)
- 📋 DoD → Task generation (PBI-004)

### Short-term (Q1 2026)
- Re-refinement workflow
- PBI versioning and update mode
- Agent marketplace foundation
- Skill library API

### Mid-term (Q2-Q3 2026)
- Claude Code tight integration
- Automated task execution tracking
- Continuous quality feedback loop
- Custom agent builder UI

### Long-term (Q4 2026+)
- Full end-to-end automation (meeting → deployed code)
- Multi-vendor AI agent support
- Enterprise customization platform

---

## Strategic Questions

### Product Direction
1. **How tight should Claude Code integration be?**
   - Tightly coupled: Faster innovation, vendor lock-in
   - Loosely coupled: More flexible, slower adoption

2. **Who owns agent/skill creation?**
   - Users: More variety, quality concerns
   - Backlog Chef team: Higher quality, slower growth
   - Hybrid: Marketplace with curation

3. **What's the primary value prop?**
   - Time savings (faster PBI creation)
   - Quality improvement (better requirements)
   - AI enablement (executable specifications)

### Market Strategy
1. **Target early adopters:**
   - AI-forward dev teams already using Claude Code?
   - Traditional teams wanting to adopt AI?
   - Enterprise teams with strict governance needs?

2. **Positioning:**
   - ALM tool competitor (vs Jira)?
   - AI dev tool complement (+ GitHub Copilot)?
   - New category: AI Development Orchestration?

---

## Learnings from Dogfooding

### What We Thought Would Matter
- Perfect PBI format
- Comprehensive documentation coverage
- Low-cost AI API usage

### What Actually Matters
- **Smart defaults** (auto-routing, auto-detection)
- **Real context** (not mock data!)
- **Performance visibility** (we track cost/time)
- **Iterative refinement** (PBIs get better over multiple passes)
- **Self-awareness** (system knows when it needs new capabilities)

---

## Next Strategic Decisions Needed

1. **Definition of Done Standardization**
   - Should we provide templates for different industries?
   - Or keep it fully customizable per team?

2. **Agent/Skill Registry**
   - Build our own registry?
   - Use Claude Code's directly?
   - Hybrid approach with local caching?

3. **Task Management Integration**
   - GitHub Issues?
   - Azure DevOps?
   - Jira?
   - All of the above?

4. **Execution Tracking**
   - Should Backlog Chef track task completion?
   - Or is that the project management tool's job?

---

## Conclusion

Backlog Chef has evolved from a **transcript parser** to an **AI development orchestration platform**. Each phase of development revealed new insights that fundamentally changed our understanding of what this product should be.

The dogfooding approach has been transformational - we're not building for hypothetical users; we're solving our own problems in real-time. This creates an authentic product that solves real needs.

**The emerging vision is clear:**
> Backlog Chef is the bridge between human collaboration and AI execution. It transforms unstructured meeting conversations into executable specifications that AI agents can act on autonomously, with embedded intelligence about what to do, how to do it, and who (or what) should do it.

---

**Document Status:** Living document, updated as product evolves
**Next Review:** After implementing PBI-003 or PBI-004
**Owner:** Product Owner (Alwin) + Tech Lead (Claude)
