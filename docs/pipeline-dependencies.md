# Pipeline Step Dependencies

This document maps out the dependencies between pipeline steps in the Backlog Chef system.

## Dependency Graph

```
Input (Transcript)
    ↓
Step 1: Event Detection
    ↓
Step 2: Extract Candidates
    ↓
Step 3: Score Confidence ←──┐
    ↓                       │
Step 4: Enrich Context ─────┤ (depends on Step 3)
    ↓
Step 5: Check Risks
    ↓
Step 6: Generate Proposals ←─┐ (also depends on Step 3)
    ↓                        │
Step 7: Readiness Checker    │
    ↓                        │
Step 8: Format Output        │
```

## Detailed Dependencies

### Step 1: Event Detection (`detect_event_type`)
**Purpose:** Identify the meeting type (refinement, planning, retrospective)

**Dependencies:**
- **Input:** Transcript (non-empty)

**Required for:**
- Step 2 (Extract Candidates)

**Rationale:** We need to know the meeting type to understand what kind of items to extract. A refinement meeting produces PBIs, a planning meeting produces sprint tasks, etc.

---

### Step 2: Extract Candidates (`extract_candidates`)
**Purpose:** Parse transcript to identify potential backlog items

**Dependencies:**
- **Step 1:** Event Detection (`context.eventDetection`)

**Required for:**
- Step 3 (Score Confidence)

**Rationale:** Based on the meeting type from Step 1, we know what to extract. If it's a refinement meeting, we extract PBIs. We cannot extract candidates without knowing the context.

---

### Step 3: Score Confidence (`score_confidence`)
**Purpose:** Evaluate completeness and quality of each PBI

**Dependencies:**
- **Step 2:** Extract Candidates (`context.extractedCandidates`)

**Required for:**
- Step 4 (Enrich Context)
- Step 6 (Generate Proposals)

**Rationale:** We need candidates to score. The quality scores help determine which PBIs need enrichment and what questions to ask.

---

### Step 4: Enrich Context (`enrich_context`)
**Purpose:** Search for similar work, past decisions, technical docs, and risk flags

**Dependencies:**
- **Step 3:** Score Confidence (`context.scoredPBIs`)

**Required for:**
- Step 5 (Check Risks)

**Rationale:** We enrich PBIs that have been scored. The enrichment data (similar work, docs, flags) is critical for risk assessment.

**Note:** While Step 4 technically depends on Step 3 in the current implementation, it could theoretically depend on Step 2 instead, as you correctly identified. The enrichment doesn't inherently need scores—it just needs candidates.

---

### Step 5: Check Risks (`check_risks`)
**Purpose:** Detect dependencies, scope creep, blockers, and conflicts

**Dependencies:**
- **Step 4:** Enrich Context (`context.enrichedPBIs`)

**Required for:**
- Step 7 (Readiness Checker)

**Rationale:** Risk analysis requires the enriched context from Step 4. We analyze risks based on similar work, past decisions, and risk flags found during enrichment.

---

### Step 6: Generate Proposals (`generate_proposals`)
**Purpose:** Create actionable questions with suggested answers

**Dependencies:**
- **Step 3:** Score Confidence (`context.scoredPBIs`)

**Required for:**
- Step 7 (Readiness Checker)

**Rationale:** Questions are generated based on confidence scores. Low-scoring areas need clarifying questions. This step could run in parallel with Steps 4-5 since it only needs Step 3.

**Note:** Currently depends on Step 3, but is executed after Step 5 in the pipeline. This is a design choice to ensure questions consider risk analysis, but the hard dependency is only on Step 3.

---

### Step 7: Readiness Checker (`readiness_checker`)
**Purpose:** Validate against Definition of Ready criteria

**Dependencies:**
- **Step 5:** Check Risks (`context.risksAssessed`)
- **Implicitly:** Step 6 (Generate Proposals) for complete readiness assessment

**Required for:**
- Step 8 (Format Output)

**Rationale:** Readiness assessment requires risk analysis to determine if PBIs are sprint-ready. Blocking risks prevent a PBI from being ready.

---

### Step 8: Format Output (`format_output`)
**Purpose:** Generate formatted outputs (HTML, Markdown, DevOps, Confluence)

**Dependencies:**
- **Step 7:** Readiness Checker (`context.readinessAssessed`)

**Required for:**
- Final pipeline output

**Rationale:** We format the complete pipeline results after all assessments are done.

---

## Dependency Matrix

| Step | Depends On | Output Used By |
|------|-----------|----------------|
| 1. Event Detection | Input (transcript) | Step 2 |
| 2. Extract Candidates | Step 1 | Step 3 |
| 3. Score Confidence | Step 2 | Step 4, Step 6 |
| 4. Enrich Context | Step 3 | Step 5 |
| 5. Check Risks | Step 4 | Step 7 |
| 6. Generate Proposals | Step 3 | Step 7 (implicit) |
| 7. Readiness Checker | Step 5, Step 6 | Step 8 |
| 8. Format Output | Step 7 | Final output |

---

## Minimal Required Steps

To generate basic user stories (PBIs) with minimal processing:

1. **Step 1:** Event Detection (to know meeting type)
2. **Step 2:** Extract Candidates (to get PBIs)

For usable PBIs with quality assessment:

1. **Step 1:** Event Detection
2. **Step 2:** Extract Candidates
3. **Step 3:** Score Confidence

For sprint-ready PBIs:

1. **Step 1:** Event Detection
2. **Step 2:** Extract Candidates
3. **Step 3:** Score Confidence
4. **Step 4:** Enrich Context
5. **Step 5:** Check Risks
6. **Step 6:** Generate Proposals
7. **Step 7:** Readiness Checker

---

## Parallel Execution Opportunities

Based on dependencies, these steps could run in parallel:

**After Step 3:**
- Step 4 (Enrich Context)
- Step 6 (Generate Proposals)

Both depend only on Step 3, so they could execute concurrently to reduce total pipeline time.

**Current Sequential Order:**
```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
```

**Optimized Parallel Order:**
```
1 → 2 → 3 → ┌─ 4 → 5 ─┐
            └─ 6 ──────┘→ 7 → 8
```

This could reduce total execution time by ~30-40% since Steps 4 and 6 take significant time.

---

## Implementation Notes

Each step implements `canExecute(context: PipelineContext): boolean` to validate prerequisites:

```typescript
// Step 2: Requires event detection
canExecute(context: PipelineContext): boolean {
  return !!context.eventDetection;
}

// Step 3: Requires candidates
canExecute(context: PipelineContext): boolean {
  return !!context.extractedCandidates &&
         context.extractedCandidates.candidates.length > 0;
}

// Step 4: Requires scored PBIs
canExecute(context: PipelineContext): boolean {
  return !!context.scoredPBIs &&
         context.scoredPBIs.scored_pbis.length > 0;
}
```

The orchestrator checks `canExecute()` before running each step and throws an error if prerequisites aren't met.
