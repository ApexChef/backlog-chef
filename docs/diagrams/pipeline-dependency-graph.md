# Pipeline Dependency Graph

Visual representation of pipeline step dependencies and execution flows.

## Full Pipeline Flow

```
┌─────────────────────┐
│   INPUT             │
│   (Transcript)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 1              │
│ Event Detection     │  ← Identifies meeting type
│                     │    (refinement, planning, etc.)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 2              │
│ Extract Candidates  │  ← Parses transcript for PBIs
│                     │    based on meeting type
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 3              │
│ Score Confidence    │  ← Evaluates completeness
│                     │    and quality metrics
└──────────┬──────────┘
           │
           ├──────────────────────────┐
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│ Step 4              │    │ Step 6              │
│ Enrich Context      │    │ Generate Proposals  │
│                     │    │                     │
│ • Similar work      │    │ • Questions         │
│ • Past decisions    │    │ • Suggested answers │
│ • Technical docs    │    │ • Stakeholder       │
│ • Risk flags        │    │   routing           │
└──────────┬──────────┘    └──────────┬──────────┘
           │                          │
           ▼                          │
┌─────────────────────┐               │
│ Step 5              │               │
│ Check Risks         │               │
│                     │               │
│ • Dependencies      │               │
│ • Scope creep       │               │
│ • Blockers          │               │
│ • Conflicts         │               │
└──────────┬──────────┘               │
           │                          │
           └──────────┬───────────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │ Step 7              │
           │ Readiness Checker   │  ← Validates against
           │                     │    Definition of Ready
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │ Step 8              │
           │ Format Output       │  ← Generates HTML, MD,
           │                     │    DevOps, Confluence
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │   OUTPUT            │
           │   • PBIs            │
           │   • Scores          │
           │   • Risks           │
           │   • Questions       │
           │   • Readiness       │
           └─────────────────────┘
```

## Minimal Pipeline (Steps 1-2 Only)

```
┌─────────────────────┐
│   INPUT             │
│   (Transcript)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 1              │
│ Event Detection     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 2              │
│ Extract Candidates  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   OUTPUT            │
│   • Event type      │
│   • Basic PBIs      │
│   (no scoring)      │
└─────────────────────┘

Cost: ~$0.01
Time: ~5-10 seconds
```

## Basic Pipeline (Steps 1-3)

```
┌─────────────────────┐
│   INPUT             │
│   (Transcript)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 1              │
│ Event Detection     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 2              │
│ Extract Candidates  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 3              │
│ Score Confidence    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   OUTPUT            │
│   • Event type      │
│   • PBIs            │
│   • Quality scores  │
│   • Completeness    │
└─────────────────────┘

Cost: ~$0.02-0.04
Time: ~15-30 seconds
```

## Parallel Execution Potential

```
Current Sequential:
─────────────────────────────────────────────────
Time: ████████████████████████ (180s)

Step 1 ──► Step 2 ──► Step 3 ──► Step 4 ──► Step 5 ──► Step 6 ──► Step 7 ──► Step 8


Optimized Parallel:
─────────────────────────────────────────────────
Time: ████████████████ (120s, 33% faster)

                        ┌──► Step 4 ──► Step 5 ──┐
Step 1 ──► Step 2 ──► Step 3 ──►                  ──► Step 7 ──► Step 8
                        └──► Step 6 ──────────────┘

Steps 4 and 6 run in parallel (both depend only on Step 3)
```

## Dependency Relationships

```
LEGEND:
──►   Hard dependency (required)
··►   Soft dependency (optional)
═══   Parallel execution possible


                INPUT
                  │
                  ▼
            ┌──────────┐
            │  Step 1  │
            └──────────┘
                  │
                  ▼
            ┌──────────┐
            │  Step 2  │
            └──────────┘
                  │
                  ▼
            ┌──────────┐
            │  Step 3  │
            └──────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    ┌──────────┐      ┌──────────┐
    │  Step 4  │      │  Step 6  │
    └──────────┘      └──────────┘
        │                   │
        ▼                   │
    ┌──────────┐            │
    │  Step 5  │            │
    └──────────┘            │
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
            ┌──────────┐
            │  Step 7  │
            └──────────┘
                  │
                  ▼
            ┌──────────┐
            │  Step 8  │
            └──────────┘
                  │
                  ▼
                OUTPUT
```

## Data Flow Through Pipeline

```
┌─────────────────────────────────────────────────┐
│ INPUT: Transcript (3,800 chars)                 │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ Step 1: Event Detection                         │
│ Output: { event_type: "refinement",            │
│           confidence: 98% }                      │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ Step 2: Extract Candidates                      │
│ Output: { total_found: 3,                      │
│           candidates: [PBI-001, PBI-002, ...] } │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ Step 3: Score Confidence                        │
│ Output: { scored_pbis: [                       │
│   { pbi: PBI-001, scores: {                    │
│       overall: 88,                              │
│       completeness: 85,                         │
│       clarity: 90 ... } } ] }                  │
└─────────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────────┐   ┌───────────────────┐
│ Step 4: Enrich    │   │ Step 6: Proposals │
│ Output:           │   │ Output:           │
│ • 2 similar work  │   │ • 5 questions     │
│ • 2 decisions     │   │ • suggested       │
│ • 2 docs          │   │   answers         │
│ • 4 risk flags    │   │ • stakeholders    │
└───────────────────┘   └───────────────────┘
        │                         │
        ▼                         │
┌───────────────────┐             │
│ Step 5: Risks     │             │
│ Output:           │             │
│ • 4 risks         │             │
│ • severity: HIGH  │             │
│ • mitigations     │             │
└───────────────────┘             │
        │                         │
        └────────────┬────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│ Step 7: Readiness                               │
│ Output: { status: "NEEDS REFINEMENT",          │
│           score: 85,                            │
│           blocking: 0,                          │
│           sprint_ready: false }                 │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ Step 8: Format                                  │
│ Output: HTML, Markdown, JSON                    │
└─────────────────────────────────────────────────┘
```

## Context Object Growth

Shows how the pipeline context grows at each step:

```
Input                ┌──────────────────┐
                     │ transcript       │
                     │ metadata         │
                     └──────────────────┘

After Step 1  ════►  ┌──────────────────┐
                     │ transcript       │
                     │ metadata         │
                     │ eventDetection   │  ← Added
                     └──────────────────┘

After Step 2  ════►  ┌──────────────────┐
                     │ transcript       │
                     │ metadata         │
                     │ eventDetection   │
                     │ extractedCandidates │ ← Added
                     └──────────────────┘

After Step 3  ════►  ┌──────────────────┐
                     │ ...              │
                     │ extractedCandidates │
                     │ scoredPBIs       │  ← Added
                     └──────────────────┘

After Step 4  ════►  ┌──────────────────┐
                     │ ...              │
                     │ scoredPBIs       │
                     │ enrichedPBIs     │  ← Added
                     └──────────────────┘

After Step 5  ════►  ┌──────────────────┐
                     │ ...              │
                     │ enrichedPBIs     │
                     │ risksAssessed    │  ← Added
                     └──────────────────┘

After Step 6  ════►  ┌──────────────────┐
                     │ ...              │
                     │ risksAssessed    │
                     │ questionsGenerated │ ← Added
                     └──────────────────┘

After Step 7  ════►  ┌──────────────────┐
                     │ ...              │
                     │ questionsGenerated │
                     │ readinessAssessed │  ← Added
                     └──────────────────┘

Final Output  ═══►   ┌──────────────────┐
                     │ Complete PBI     │
                     │ with all data    │
                     │ from all steps   │
                     └──────────────────┘
```
