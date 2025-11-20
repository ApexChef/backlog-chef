# Workflow Configurations - Quick Comparison

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW COMPARISON MATRIX                            │
└─────────────────────────────────────────────────────────────────────────────┘

Step/Workflow               Full    Minimal  No-7    Binary  Enrich  Questions  Risk
─────────────────────────────────────────────────────────────────────────────────
01. Event Detection         ✅      ✅       ✅      ✅      ✅      ✅         ✅
02. Extract Candidates      ✅      ✅ˡⁱᵗᵉ   ✅      ✅      ✅      ✅         ✅
03. Score Confidence        ✅      ❌       ✅      ✅      ✅      ❌         ✅
04. Enrich Context          ✅      ❌       ✅      ✅      ✅⁺⁺    ❌         ✅⁺
05. Check Risks             ✅      ❌       ✅      ✅      ✅ˡⁱᵗᵉ   ❌         ✅⁺⁺
06. Generate Questions      ✅      ✅ˡⁱᵗᵉ   ✅      ✅      ✅      ✅⁺⁺       ✅
07. Readiness Checker       ✅      ❌       ❌      ✅ᵇⁱⁿ   ❌      ❌         ✅ʳⁱˢᵏ
08. Final Output            ✅      ✅ˡⁱᵗᵉ   ✅      ✅      ✅      ✅         ✅

─────────────────────────────────────────────────────────────────────────────────
LLM Model                   Sonnet  Haiku   Sonnet  Sonnet  Sonnet  Sonnet     Sonnet
Temperature                 0.3     0.3     0.3     0.3     0.3     0.4        0.2
Processing Time             2-3m    30-45s  1.5-2m  2-3m    2-2.5m  1-1.5m     3-4m
Output Formats              All     DevOps  All     All     3       3          All
─────────────────────────────────────────────────────────────────────────────────

Legend:
✅      = Fully enabled with all subtasks
✅⁺     = Enabled with enhanced configuration
✅⁺⁺    = Enabled with significantly enhanced configuration
✅ˡⁱᵗᵉ  = Enabled but with reduced subtasks
✅ᵇⁱⁿ   = Enabled with binary variant (no numeric scoring)
✅ʳⁱˢᵏ  = Enabled with risk-focused configuration
❌      = Disabled
```

---

## Detailed Step Breakdown

### 1️⃣ Event Detection

| Workflow | Subtasks Enabled | Configuration Notes |
|----------|------------------|---------------------|
| **Full** | `detect_meeting_type`, `validate_transcript_quality` | Standard validation |
| **Minimal** | `detect_meeting_type` only | Skip quality validation for speed |
| **No-7** | All subtasks | Standard configuration |
| **Binary** | All subtasks | Standard configuration |
| **Enrich** | All subtasks | Standard configuration |
| **Questions** | All subtasks | Standard configuration |
| **Risk** | All subtasks | Standard configuration |

---

### 2️⃣ Extract Candidates

| Workflow | Subtasks Enabled | Configuration Notes |
|----------|------------------|---------------------|
| **Full** | All 4 subtasks | Full extraction including AC and scope |
| **Minimal** | 2 subtasks | Only `identify_pbi_discussions` + `extract_business_value` |
| **No-7** | All 4 subtasks | Full extraction |
| **Binary** | All 4 subtasks | Full extraction |
| **Enrich** | All 4 subtasks | Full extraction |
| **Questions** | All 4 subtasks | Full extraction |
| **Risk** | All 4 subtasks | Full extraction |

---

### 3️⃣ Score Confidence

| Workflow | Enabled | Notes |
|----------|---------|-------|
| **Full** | ✅ | Standard scoring rubric |
| **Minimal** | ❌ | Disabled for speed |
| **No-7** | ✅ | Standard scoring |
| **Binary** | ✅ | Standard scoring |
| **Enrich** | ✅ | Standard scoring |
| **Questions** | ❌ | Not needed for question generation |
| **Risk** | ✅ | Standard scoring |

---

### 4️⃣ Enrich with Context

| Workflow | Enabled | Configuration Highlights |
|----------|---------|-------------------------|
| **Full** | ✅ | All 4 subtasks, standard config |
| **Minimal** | ❌ | Disabled for speed |
| **No-7** | ✅ | All 4 subtasks |
| **Binary** | ✅ | All 4 subtasks |
| **Enrich** | ✅⁺⁺ | **Enhanced**: More results (10 vs 5), more sources, 24-month lookback, includes retrospectives |
| **Questions** | ❌ | Not needed for question generation |
| **Risk** | ✅⁺ | **Focus on failures**: past overruns, failed PBIs, architecture docs |

#### Enrichment Configuration Comparison

```yaml
# Full/Standard
search_similar_pbis:
  max_results: 5
  similarity_threshold: 0.75

# Enrich (Enhanced)
search_similar_pbis:
  max_results: 10
  similarity_threshold: 0.70  # More results

# Risk (Failure-focused)
search_similar_pbis:
  focus_on_failed_pbis: true  # Learn from failures
```

---

### 5️⃣ Check Risks & Conflicts

| Workflow | Enabled | Subtasks | Configuration Notes |
|----------|---------|----------|---------------------|
| **Full** | ✅ | All 4 subtasks | Standard risk checks |
| **Minimal** | ❌ | N/A | Disabled for speed |
| **No-7** | ✅ | All 4 subtasks | Standard |
| **Binary** | ✅ | All 4 subtasks | Standard |
| **Enrich** | ✅ˡⁱᵗᵉ | `detect_dependencies` only | Basic dependency check |
| **Questions** | ❌ | N/A | Not needed |
| **Risk** | ✅⁺⁺ | **All 4 subtasks with enhanced config** | See details below |

#### Risk-Focused Step 5 Configuration

```yaml
# Risk Workflow - Enhanced Configuration
detect_dependencies:
  check_external_dependencies: true
  check_team_dependencies: true
  check_technical_dependencies: true
  check_data_dependencies: true

identify_scope_creep:
  complexity_threshold: 7.0  # Lower = more sensitive
  warn_on_multi_domain: true
  warn_on_architectural_change: true

check_technical_blockers:
  check_api_limits: true
  check_platform_constraints: true
  check_performance_risks: true
  check_security_requirements: true

validate_resource_availability:
  check_license_capacity: true
  check_api_limits: true
  check_infrastructure: true
  check_budget: true
  check_team_capacity: true
```

---

### 6️⃣ Generate Questions & Proposals

| Workflow | Enabled | Subtasks | Configuration Notes |
|----------|---------|----------|---------------------|
| **Full** | ✅ | All 5 subtasks | Standard question generation |
| **Minimal** | ✅ˡⁱᵗᵉ | 2 subtasks | Only `identify_unanswered_questions` + `route_to_stakeholders` |
| **No-7** | ✅ | All 5 subtasks | Standard |
| **Binary** | ✅ | All 5 subtasks | Standard |
| **Enrich** | ✅ | All 5 subtasks | Standard |
| **Questions** | ✅⁺⁺ | **All 5 with enhanced config** | See details below |
| **Risk** | ✅ | All 5 subtasks | Standard |

#### Questions-Focused Configuration

```yaml
# Questions Workflow - Enhanced Configuration
identify_unanswered_questions:
  include_all_question_types: true
  min_priority: "LOW"  # Include even low-priority questions

generate_proposed_answers:
  confidence_threshold_to_propose: 0.5  # Lower = more proposals
  max_alternatives: 5                    # More alternatives (default: 3)
  include_rationale: true
  include_tradeoffs: true

search_documentation:
  timeout_seconds: 60  # More time for comprehensive search
```

---

### 7️⃣ Readiness Checker ⭐ Key Differentiator

| Workflow | Enabled | Variant | Subtasks | Notes |
|----------|---------|---------|----------|-------|
| **Full** | ✅ | Default (with scoring) | All 4 subtasks | Numeric readiness score 0-100 |
| **Minimal** | ❌ | N/A | N/A | Completely disabled |
| **No-7** | ❌ | N/A | N/A | **Completely disabled** |
| **Binary** | ✅ | **Binary variant** | 3 subtasks (no scoring) | Simple READY/NOT READY |
| **Enrich** | ❌ | N/A | N/A | Manual readiness assessment |
| **Questions** | ❌ | N/A | N/A | Focus on questions only |
| **Risk** | ✅⁺ | Risk-weighted | All 4 subtasks | Higher thresholds, risk prioritization |

#### Step 7 Subtask Matrix

```
Subtask                           Full  Binary  Risk
──────────────────────────────────────────────────
evaluate_readiness_criteria       ✅    ✅      ✅
categorize_gaps                   ✅    ✅      ✅
calculate_readiness_score         ✅    ❌      ✅⁺
recommend_next_actions            ✅    ✅      ✅⁺
```

#### Readiness Scoring Comparison

```yaml
# Full Workflow
calculate_readiness_score:
  pass_threshold: 80
  weights:
    has_clear_business_value: 0.15
    dependencies_resolved: 0.15

# Binary Workflow
calculate_readiness_score:
  enabled: false  # No scoring - binary only

# Risk Workflow
calculate_readiness_score:
  pass_threshold: 85  # Higher threshold
  weights:
    scope_is_defined: 0.15          # Higher weight
    has_technical_approach: 0.15    # Higher weight
    dependencies_resolved: 0.20     # Highest weight (risk focus)
```

---

### 8️⃣ Final Output

| Workflow | Enabled Formats | Configuration Notes |
|----------|-----------------|---------------------|
| **Full** | DevOps, Obsidian, Confluence, Email | All formats |
| **Minimal** | DevOps only | Minimal output for speed |
| **No-7** | DevOps, Obsidian, Confluence, Email | All formats |
| **Binary** | DevOps, Obsidian, Confluence, Email | All formats |
| **Enrich** | DevOps, Obsidian, Email | No Confluence |
| **Questions** | DevOps, Obsidian, Email | Question-focused template |
| **Risk** | DevOps, Obsidian, Confluence, Email | All formats |

---

## Use Case Decision Tree

```
START: What do you need?
│
├─► Quick summary for demo/testing?
│   └─► Use: refinement-minimal.yaml
│
├─► Comprehensive analysis for production?
│   └─► Use: refinement-full.yaml
│
├─► Team does manual readiness checks?
│   └─► Use: refinement-no-step7.yaml
│
├─► Avoid readiness score debates?
│   └─► Use: refinement-binary-readiness.yaml
│
├─► Learn from past work and improve estimates?
│   └─► Use: refinement-with-enrichment-only.yaml
│
├─► Generate questions for async refinement?
│   └─► Use: refinement-questions-only.yaml
│
└─► Complex/high-risk feature with many dependencies?
    └─► Use: refinement-risk-focused.yaml
```

---

## Performance Comparison

```
Processing Time (minutes)
────────────────────────────────────────

Risk          ████████████████████ 3-4 min
Full          ███████████████      2-3 min
Binary        ███████████████      2-3 min
Enrich        ██████████████       2-2.5 min
No-7          ████████████         1.5-2 min
Questions     ██████               1-1.5 min
Minimal       ███                  0.5-0.75 min

────────────────────────────────────────
```

## Cost Comparison (Estimated)

Based on Claude API pricing:

| Workflow | Model | Avg Tokens | Est. Cost/Meeting |
|----------|-------|------------|-------------------|
| **Minimal** | Haiku | 15K | $0.02 |
| **Questions** | Sonnet | 35K | $0.10 |
| **No-7** | Sonnet | 45K | $0.13 |
| **Enrich** | Sonnet | 50K | $0.15 |
| **Full** | Sonnet | 60K | $0.18 |
| **Binary** | Sonnet | 60K | $0.18 |
| **Risk** | Sonnet | 75K | $0.22 |

---

## Output Comparison

### What Each Workflow Produces

| Workflow | Outputs |
|----------|---------|
| **Full** | PBIs, Questions, Proposed Answers, Risks, Readiness Scores, Action Items |
| **Minimal** | Basic PBIs, Simple Questions |
| **No-7** | PBIs, Questions, Proposed Answers, Risks (no readiness assessment) |
| **Binary** | Everything from Full, but READY/NOT READY instead of scores |
| **Enrich** | PBIs with extensive historical context, similar work, past estimates |
| **Questions** | Comprehensive questions with multiple proposed answers and alternatives |
| **Risk** | Deep risk analysis, extensive dependency mapping, conservative readiness |

---

## Migration Path

```
Development → Testing → Staging → Production
────────────────────────────────────────────

Minimal  →  Questions  →  No-7  →  Full
(Demo)      (Testing)     (Staging)  (Production)

                    ↓ (If needed)

              Binary or Risk
           (Team preference/Risk level)
```

---

## Summary Table

| Workflow | Speed | Depth | Cost | Best For |
|----------|-------|-------|------|----------|
| **Full** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$ | Production |
| **Minimal** | ⭐⭐⭐⭐⭐ | ⭐ | $ | Demos, Testing |
| **No-7** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$ | Manual readiness teams |
| **Binary** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$ | Avoid score debates |
| **Enrich** | ⭐⭐⭐ | ⭐⭐⭐⭐ | $$ | Learning from history |
| **Questions** | ⭐⭐⭐⭐ | ⭐⭐⭐ | $ | Async refinement prep |
| **Risk** | ⭐⭐ | ⭐⭐⭐⭐⭐ | $$$ | High-risk features |
