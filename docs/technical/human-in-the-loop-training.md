# Human-in-the-Loop (HITL) Training System

## Overview

Backlog Chef learns from **your team's domain expertise** to improve PBI quality scoring over time. This document describes the training system that collects feedback at each pipeline step and uses it to refine the AI's behavior.

## Why HITL Training is Critical

### The Challenge
- **PBI quality is subjective** - What's "complete" varies by team, domain, tech stack
- **Domain-specific patterns** - Salesforce teams have different needs than web app teams
- **Organization-specific standards** - Your Definition of Ready may differ from others
- **Context is king** - "Similar work" depends on your historical backlog, not generic patterns

### The Solution
- Capture corrections and guidance from Product Owners, Developers, and Scrum Masters
- Build a **team-specific knowledge base** of quality patterns
- Continuously improve confidence scoring based on your feedback
- Learn where to find relevant context for your organization

---

## Training Architecture

### Three-Layer Learning System

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: IMMEDIATE FEEDBACK (Real-time Corrections)         │
│  - Correct confidence scores                                 │
│  - Identify missing context sources                          │
│  - Flag incorrect risk detections                            │
│  - Override readiness classifications                        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: TRAINING DATA COLLECTION (Structured Feedback)     │
│  - Store feedback with original PBI + output                 │
│  - Tag feedback by pipeline step                             │
│  - Track correction patterns over time                       │
│  - Build golden dataset for fine-tuning                      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: ADAPTIVE LEARNING (System Improvements)            │
│  - Few-shot prompt examples from feedback                    │
│  - Custom scoring rubrics per team                           │
│  - Learned context source priorities                         │
│  - Fine-tuned models (future)                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Feedback Mechanisms by Pipeline Step

### Step 1: Event Detection
**What can go wrong**: Misclassifies meeting type (refinement vs retrospective vs planning)

**HITL Feedback Interface**:
```typescript
interface EventDetectionFeedback {
  detected_event: 'refinement' | 'planning' | 'retrospective' | 'other';
  correct_event: 'refinement' | 'planning' | 'retrospective' | 'other';
  confidence_was: number;
  correction_reason: string;
  indicators_missed?: string[];  // "Team discussed story points"
}
```

**Example UI**:
```
❌ Detected: Planning Meeting (confidence: 75%)

Correct event type:
○ Refinement Meeting
○ Sprint Planning
○ Retrospective
● Other: Architecture Discussion

Why was detection wrong?
"Meeting discussed technical approach, not sprint commitment"

Indicators the system missed:
- "No velocity or capacity discussion"
- "Focused on design patterns, not tasks"

[Submit Correction]
```

**How system learns**:
- Stores corrected examples in `training-data/event-detection/corrections.jsonl`
- Adds correction as few-shot example in next prompt
- After 10+ corrections of same type, updates base prompt

---

### Step 2: Extract Candidate PBIs
**What can go wrong**: Misses a PBI mentioned in meeting, or creates duplicate PBIs

**HITL Feedback Interface**:
```typescript
interface ExtractionFeedback {
  extracted_pbis: string[];  // IDs of extracted PBIs
  corrections: {
    type: 'missed_pbi' | 'duplicate' | 'incorrectly_split' | 'incorrectly_merged';
    description: string;
    transcript_reference: string;  // Timestamp or quote
    correct_pbi?: {
      title: string;
      description: string;
    };
  }[];
}
```

**Example UI**:
```
Extracted 3 PBIs from transcript:

✓ PBI-001: Customer Order Tracking Portal
✓ PBI-002: Customer-Friendly Order Status Labels
✓ PBI-003: B2B Account Permission Model

Did the system miss any PBIs?
[+ Add Missed PBI]

Was anything incorrectly extracted?
PBI-003 should be merged with PBI-001
Reason: "Team discussed permissions as part of portal feature, not separate PBI"
Transcript quote: "Sarah: The portal needs role-based permissions..."

[Submit Correction]
```

**How system learns**:
- Stores transcript excerpts where PBIs were missed
- Learns patterns like "Later, Tom mentioned..." = separate PBI
- Adjusts PBI boundary detection (when to split vs merge)

---

### Step 3: Score Confidence
**What can go wrong**: Over/underestimates readiness scores, misses critical gaps

**HITL Feedback Interface**:
```typescript
interface ConfidenceScoringFeedback {
  pbi_id: string;
  score_corrections: {
    dimension: 'isCompletePBI' | 'hasAllRequirements' | 'isRefinementComplete' |
               'hasAcceptanceCriteria' | 'hasClearScope' | 'isEstimable';
    system_score: number;
    correct_score: number;
    reasoning_was: string;
    correct_reasoning: string;
    evidence_missed?: string[];
  }[];
  overall_readiness_correction?: {
    system_readiness: 'READY' | 'MOSTLY_READY' | 'NOT_READY' | 'DEFERRED';
    correct_readiness: 'READY' | 'MOSTLY_READY' | 'NOT_READY' | 'DEFERRED';
    reason: string;
  };
}
```

**Example UI** (Interactive Score Review):
```
PBI-001: Customer Order Tracking Portal

┌─────────────────────────────────────────────────────────┐
│ isCompletePBI                              [Edit Score] │
│ System Score: 90/100                                    │
│ Reasoning: "Clear business value, specific user need"  │
│                                                         │
│ ✏️ Your Score: 75/100                                   │
│ Reason: "Missing specific ROI metrics for business"    │
│ Evidence Missed:                                        │
│ - "No customer support time savings quantified"        │
│ - "Missing user adoption targets"                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ hasAllRequirements                          [Edit Score]│
│ System Score: 85/100                                    │
│ Reasoning: "Comprehensive technical requirements"      │
│                                                         │
│ ✏️ Your Score: 60/100                                   │
│ Reason: "License capacity unknown - CRITICAL blocker"  │
│ Evidence Missed:                                        │
│ - "No confirmation of 1200 Experience Cloud licenses"  │
│ - "Cost approval not obtained"                         │
└─────────────────────────────────────────────────────────┘

Overall Readiness:
System: READY ❌
Correct: NOT_READY (blocking: license capacity)

[Save All Corrections]
```

**How system learns**:
- Builds team-specific scoring rubric (e.g., "license capacity always checked")
- Learns which evidence is critical vs nice-to-have
- Adjusts score thresholds (maybe your team's "READY" = 85+, not 70+)

---

### Step 4: Enrich with Context
**What can go wrong**: Misses relevant past work, searches wrong locations, misidentifies "similar"

**HITL Feedback Interface**:
```typescript
interface ContextEnrichmentFeedback {
  pbi_id: string;
  found_context: {
    type: 'similar_work' | 'past_decisions' | 'technical_docs';
    ref: string;
    relevance_score: number;
  }[];
  corrections: {
    type: 'missed_context' | 'irrelevant_context' | 'wrong_source';
    description: string;
    action: {
      type: 'add_context' | 'remove_context' | 'adjust_query' | 'add_source';
      details: {
        // Add context
        context_location?: string;  // "Confluence: https://..."
        why_relevant?: string;

        // Remove context
        context_id?: string;
        why_irrelevant?: string;

        // Adjust query
        better_query?: string;

        // Add source
        new_source?: {
          type: 'confluence_space' | 'devops_query' | 'sharepoint_folder';
          location: string;
        };
      };
    };
  }[];
}
```

**Example UI** (Guided Feedback):
```
PBI-001: Customer Order Tracking Portal

Context Found (5 results):
✓ PBI-2023-156: Partner Portal Implementation (78% similar)
✓ CONF-Portal-Architecture (65% similar)
? PBI-2022-034: Mobile App Redesign (42% similar)  [Mark Irrelevant]
✓ Meeting-2024-10-15: Q4 Architecture Review
? CONF-API-Limits (38% similar)  [Mark Irrelevant]

Did the system miss important context?
[+ Add Missing Context]

╔════════════════════════════════════════════════════════╗
║ Add Missing Context                                    ║
╠════════════════════════════════════════════════════════╣
║ Context Type:                                          ║
║ ● Similar Work                                         ║
║ ○ Past Decision                                        ║
║ ○ Technical Documentation                              ║
║                                                        ║
║ Where is it located?                                   ║
║ ○ Azure DevOps (work item ID): PBI-2024-201           ║
║ ● Confluence (page URL):                               ║
║   https://confluence.company.com/experience-cloud-     ║
║   performance-guide                                    ║
║ ○ Fireflies (meeting date): ___________               ║
║ ○ Other: _____________________________________         ║
║                                                        ║
║ Why is this relevant?                                  ║
║ "This guide documents caching strategies we used for  ║
║  the Partner Portal that had the same performance      ║
║  requirements. System should have found this."         ║
║                                                        ║
║ Search query that should have found it:                ║
║ "Experience Cloud performance optimization caching"    ║
║                                                        ║
║ [Cancel]  [Add to Knowledge Base]                     ║
╚════════════════════════════════════════════════════════╝

[Submit All Feedback]
```

**How system learns**:
- Stores successful context locations per PBI pattern
- Learns better search queries for your domain
- Discovers new context sources (e.g., "always check #architecture Slack channel")
- Builds MCP query templates: "For portal PBIs, search Confluence space TECH with keywords [portal, performance, caching]"

---

### Step 5: Check Risks & Conflicts
**What can go wrong**: Misses critical risks, flags false positives, underestimates complexity

**HITL Feedback Interface**:
```typescript
interface RiskCheckFeedback {
  pbi_id: string;
  detected_risks: {
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  }[];
  corrections: {
    type: 'missed_risk' | 'false_positive' | 'wrong_severity';
    details: {
      // Missed risk
      risk_type?: string;
      risk_severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      risk_description?: string;
      why_missed?: string;

      // False positive
      flagged_risk_id?: string;
      why_not_a_risk?: string;

      // Wrong severity
      risk_id?: string;
      correct_severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      severity_reasoning?: string;
    };
  }[];
  complexity_score_correction?: {
    system_score: number;  // 0-10
    correct_score: number;
    reasoning: string;
  };
}
```

**Example UI**:
```
PBI-001: Customer Order Tracking Portal

Detected Risks:
🔴 CRITICAL: License capacity insufficient
   ✓ Confirmed - this is a real blocker

🟡 MEDIUM: Performance risk with large datasets
   ❌ Should be HIGH - we've had production incidents before
   [Adjust Severity]

Missed Risks (add below):
[+ Add Missed Risk]

╔════════════════════════════════════════════════════════╗
║ Add Missed Risk                                        ║
╠════════════════════════════════════════════════════════╣
║ Risk Type:                                             ║
║ ● Security/Compliance                                  ║
║ ○ Technical Complexity                                 ║
║ ○ Resource Constraint                                  ║
║ ○ Dependency                                           ║
║                                                        ║
║ Severity: ● CRITICAL  ○ HIGH  ○ MEDIUM  ○ LOW         ║
║                                                        ║
║ Description:                                           ║
║ "Customer PII exposure risk - portal shows order data  ║
║  but we haven't defined data retention policy for      ║
║  external users. GDPR violation risk."                 ║
║                                                        ║
║ Why did system miss this?                              ║
║ "System should check for PII/GDPR whenever 'external   ║
║  user access' is mentioned"                            ║
║                                                        ║
║ Where should system have found this?                   ║
║ ☑ Past similar work (PBI-2023-045 had same issue)     ║
║ ☑ Confluence: GDPR Compliance Checklist                ║
║ ☐ Meeting transcript                                   ║
║                                                        ║
║ [Cancel]  [Add Risk]                                  ║
╚════════════════════════════════════════════════════════╝

Complexity Score:
System: 8.5/10  →  Your Score: 9.5/10
Reason: "Experience Cloud licenses are hard to get approved quickly,
         adds 2-3 week delay minimum"

[Submit Feedback]
```

**How system learns**:
- Builds team-specific risk patterns (e.g., "always check GDPR for external users")
- Learns severity calibration (what's CRITICAL for your team vs just MEDIUM)
- Discovers risk indicators from past incidents
- Creates risk detection rules: "IF (external_users AND personal_data) THEN check_gdpr_compliance"

---

### Step 6: Generate Questions & Proposals
**What can go wrong**: Generates irrelevant questions, misses critical unknowns, routes to wrong stakeholder

**HITL Feedback Interface**:
```typescript
interface QuestionGenerationFeedback {
  pbi_id: string;
  generated_questions: {
    id: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    question: string;
    proposed_answer: string;
    assigned_to: string;  // Role
  }[];
  corrections: {
    question_id?: string;
    type: 'irrelevant' | 'wrong_priority' | 'wrong_stakeholder' | 'missed_question';
    details: {
      // Irrelevant
      why_irrelevant?: string;

      // Wrong priority
      correct_priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      priority_reasoning?: string;

      // Wrong stakeholder
      correct_stakeholder?: string;
      routing_reasoning?: string;

      // Missed question
      new_question?: {
        priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        question: string;
        why_critical?: string;
        assign_to: string;
      };
    };
  }[];
}
```

**Example UI**:
```
PBI-001: Customer Order Tracking Portal

Generated Questions (12):

🔴 CRITICAL: "Do we have budget approval for 700 additional licenses?"
   Assigned to: Sarah (Product Owner)
   ✓ Confirmed - this is critical

🟡 HIGH: "What caching strategy should we use?"
   Assigned to: Lisa (Developer)
   ❌ Wrong stakeholder - should be "Tech Lead/Architect"
   [Reassign]

🟢 MEDIUM: "Should we support IE11?"
   ❌ Irrelevant - IE11 is deprecated, remove this
   [Mark Irrelevant]

Missed Questions:
[+ Add Critical Question]

╔════════════════════════════════════════════════════════╗
║ Add Missed Question                                    ║
╠════════════════════════════════════════════════════════╣
║ Priority: ● CRITICAL  ○ HIGH  ○ MEDIUM  ○ LOW         ║
║                                                        ║
║ Question:                                              ║
║ "Have we verified that Experience Cloud supports our   ║
║  custom Order object with 150+ fields?"                ║
║                                                        ║
║ Why is this critical?                                  ║
║ "Similar project (Partner Portal) hit Governor limits  ║
║  with complex objects. This is a blocker."             ║
║                                                        ║
║ Assign to:                                             ║
║ ● Tech Lead/Architect                                  ║
║ ○ Product Owner                                        ║
║ ○ Developer                                            ║
║                                                        ║
║ Suggested answer (optional):                           ║
║ "Check with Salesforce support, reference case #12345  ║
║  from Partner Portal project"                          ║
║                                                        ║
║ [Cancel]  [Add Question]                              ║
╚════════════════════════════════════════════════════════╝

[Submit Feedback]
```

**How system learns**:
- Learns team-specific critical questions (always ask about licenses, performance, GDPR)
- Improves stakeholder routing (Tech Lead for architecture, PO for business decisions)
- Builds question templates per PBI type (portal PBIs → ask about performance, licenses, security)

---

### Step 7: Run Readiness Checker
**What can go wrong**: Incorrectly classifies as READY when blockers exist, or too conservative

**HITL Feedback Interface**:
```typescript
interface ReadinessCheckFeedback {
  pbi_id: string;
  system_readiness: 'READY_FOR_SPRINT' | 'NOT_READY' | 'NEEDS_REFINEMENT' |
                    'DEFERRED' | 'FUTURE_PHASE';
  correct_readiness: 'READY_FOR_SPRINT' | 'NOT_READY' | 'NEEDS_REFINEMENT' |
                     'DEFERRED' | 'FUTURE_PHASE';
  reasoning: string;
  checklist_overrides: {
    criterion: string;
    system_result: 'PASS' | 'FAIL' | 'WARN';
    correct_result: 'PASS' | 'FAIL' | 'WARN';
    reasoning: string;
  }[];
}
```

**Example UI**:
```
PBI-001: Customer Order Tracking Portal

System Classification: READY FOR SPRINT ❌
Your Classification: NOT READY

Definition of Ready Checklist:

✓ Clear business value          [PASS]
✓ Acceptance criteria defined   [PASS]
❌ Dependencies resolved         [FAIL - license approval pending]
✓ Estimated by team             [PASS]
⚠️  Technical approach agreed    [WARN]
   System: WARN → Should be: FAIL
   Reason: "No performance design = can't start development"

⚠️  No blocking unknowns         [WARN]
   System: WARN → Should be: FAIL
   Reason: "GDPR data retention policy is a blocker"

Why is this NOT READY?
"Two critical blockers:
 1. License budget approval required (4-6 week process)
 2. GDPR data retention policy undefined (legal review needed)

 Cannot start sprint until both resolved."

[Submit Classification]
```

**How system learns**:
- Calibrates team-specific Definition of Ready
- Learns which criteria are "nice-to-have" vs "must-have"
- Adjusts readiness thresholds (your team may be stricter/looser than default)

---

### Step 8: Final Output
**What can go wrong**: Formatting issues, missing required fields, wrong destination format

**HITL Feedback Interface**:
```typescript
interface OutputFormatFeedback {
  pbi_id: string;
  destination: 'devops' | 'obsidian' | 'confluence';
  issues: {
    type: 'missing_field' | 'incorrect_format' | 'wrong_mapping';
    field_name: string;
    expected_value: string;
    actual_value: string;
    fix_description: string;
  }[];
}
```

**Example UI**:
```
PBI-001 → Azure DevOps

Preview:
╔════════════════════════════════════════════════════════╗
║ Title: Customer Self-Service Order Portal             ║
║ Description: Enable B2B and B2C customers to...        ║
║ Acceptance Criteria: [6 criteria listed]              ║
║ Tags: portal, experience-cloud, b2b                    ║
║ Priority: High                                         ║
║ Effort: Not estimated                                  ║
║ Status: NOT READY                                      ║
╚════════════════════════════════════════════════════════╝

Issues:
❌ Missing field: "Area Path" (required by our DevOps setup)
   Should be: "CustomerPortal\\Frontend"

❌ Wrong mapping: Priority "High" → DevOps "2"
   Should be: Priority "High" → DevOps "1" (we use 1=High, not 2)

[Fix & Regenerate] [Submit Feedback]
```

**How system learns**:
- Stores team-specific field mappings
- Learns required vs optional fields per destination
- Discovers custom fields and their expected values

---

## Training Data Storage

### File Structure
```
/training-data/
├── event-detection/
│   ├── corrections.jsonl          # Corrected event classifications
│   └── few-shot-examples.json     # Best examples for prompts
├── extraction/
│   ├── missed-pbis.jsonl          # PBIs system failed to extract
│   ├── incorrect-splits.jsonl     # PBIs wrongly split/merged
│   └── few-shot-examples.json
├── scoring/
│   ├── score-corrections.jsonl    # Corrected confidence scores
│   ├── team-rubric.yaml           # Team-specific scoring criteria
│   └── few-shot-examples.json
├── enrichment/
│   ├── context-corrections.jsonl  # Missed/irrelevant context
│   ├── search-queries.jsonl       # Better search queries
│   ├── context-sources.yaml       # Learned context locations
│   └── few-shot-examples.json
├── risk-detection/
│   ├── missed-risks.jsonl
│   ├── false-positives.jsonl
│   ├── risk-patterns.yaml         # Team-specific risk rules
│   └── few-shot-examples.json
├── questions/
│   ├── question-corrections.jsonl
│   ├── stakeholder-routing.yaml   # Role assignment rules
│   └── few-shot-examples.json
├── readiness/
│   ├── classification-corrections.jsonl
│   ├── definition-of-ready.yaml   # Team's DoR criteria
│   └── few-shot-examples.json
└── output/
    ├── format-corrections.jsonl
    └── field-mappings.yaml        # DevOps/Confluence field mappings
```

### Example Training Data Record

**File**: `training-data/scoring/score-corrections.jsonl`
```json
{
  "timestamp": "2025-11-18T15:30:00Z",
  "pbi_id": "PBI-001",
  "pbi_title": "Customer Order Tracking Portal",
  "pipeline_step": "score_confidence",
  "original_output": {
    "hasAllRequirements": {
      "score": 85,
      "reasoning": "Comprehensive technical requirements with clear integration",
      "evidence": ["Specific technical approach", "Performance optimization mentioned"]
    }
  },
  "correction": {
    "hasAllRequirements": {
      "score": 60,
      "reasoning": "License capacity unknown - CRITICAL blocker",
      "evidence": ["No confirmation of 1200 Experience Cloud licenses", "Cost approval not obtained"]
    }
  },
  "feedback_metadata": {
    "corrected_by": "sarah.jones@company.com",
    "corrected_by_role": "Product Owner",
    "correction_reason": "System missed critical business blocker",
    "learning": "Always check license capacity for Experience Cloud portals - this is ALWAYS a blocker if not confirmed"
  }
}
```

---

## Adaptive Learning Mechanisms

### Level 1: Few-Shot Prompt Engineering (Immediate)

**How it works**: After each correction, add it to the next prompt as an example

**Example**:
```typescript
// Before feedback
const prompt = `
Score this PBI for hasAllRequirements (0-100):
${JSON.stringify(pbi)}
`;

// After 3 corrections about license capacity
const prompt = `
Score this PBI for hasAllRequirements (0-100):

IMPORTANT: Based on past feedback, always check:
- License capacity for Experience Cloud (CRITICAL blocker if not confirmed)
- Cost approval status for license purchases
- GDPR compliance for external user access

Examples from this team:

Example 1:
PBI: "Partner Portal Implementation"
Score: 40/100 (not 75/100)
Reason: "License capacity not confirmed - 500 available but 1200 needed"

Example 2:
PBI: "Customer Self-Service Portal"
Score: 60/100 (not 85/100)
Reason: "Cost approval for licenses not obtained"

Now score this PBI:
${JSON.stringify(pbi)}
`;
```

**Trigger**: After 3 corrections of same pattern
**Update frequency**: Real-time

---

### Level 2: Custom Configuration Files (Weekly)

**How it works**: Generate team-specific YAML configs from accumulated feedback

**Example**: `training-data/scoring/team-rubric.yaml`
```yaml
team_id: "salesforce-platform-team"
updated_at: "2025-11-18"

scoring_adjustments:
  hasAllRequirements:
    critical_checks:
      - pattern: "portal|experience cloud"
        check: "license_capacity_confirmed"
        weight: 30  # 30 points deduction if missing
        evidence_required:
          - "License count confirmed"
          - "Budget approval obtained"

      - pattern: "external user|b2b|b2c"
        check: "gdpr_compliance_verified"
        weight: 25
        evidence_required:
          - "Data retention policy defined"
          - "Legal team sign-off"

      - pattern: "integration|api"
        check: "api_limits_verified"
        weight: 15
        evidence_required:
          - "Daily API limit checked"
          - "Bulk API usage estimated"

  isEstimable:
    complexity_factors:
      - pattern: "experience cloud"
        complexity_multiplier: 1.5
        reasoning: "Team historically underestimates portal projects by 50%"

      - pattern: "gdpr|compliance"
        complexity_multiplier: 1.3
        reasoning: "Legal reviews add 2-3 week delays"

definition_of_ready:
  required_criteria:
    - name: "License capacity confirmed"
      applies_when: "experience cloud|portal"
      severity: "BLOCKING"

    - name: "GDPR compliance verified"
      applies_when: "external user|personal data"
      severity: "BLOCKING"

    - name: "API limits checked"
      applies_when: "integration|api"
      severity: "WARNING"
```

**Trigger**: Weekly batch processing of feedback
**Update frequency**: Every Sunday night

---

### Level 3: Learned Context Sources (Weekly)

**How it works**: Build a map of where to find context for different PBI patterns

**Example**: `training-data/enrichment/context-sources.yaml`
```yaml
team_id: "salesforce-platform-team"
updated_at: "2025-11-18"

learned_sources:
  - pbi_pattern: "portal|experience cloud"
    context_sources:
      - type: "confluence"
        space: "TECH"
        search_query: "Experience Cloud performance caching"
        priority: 1
        success_rate: 85%  # Found relevant context 85% of time

      - type: "devops"
        query: "WorkItemType = 'User Story' AND Tags CONTAINS 'portal'"
        priority: 2
        success_rate: 78%

      - type: "confluence"
        page_id: "12345"
        title: "Experience Cloud Architecture Guide"
        always_include: true
        reasoning: "Always relevant for portal PBIs"

  - pbi_pattern: "gdpr|compliance|external user"
    context_sources:
      - type: "confluence"
        space: "LEGAL"
        search_query: "GDPR compliance checklist"
        priority: 1
        success_rate: 95%

      - type: "slack"
        channel: "#legal-compliance"
        search_query: "data retention policy"
        priority: 2
        success_rate: 60%
        note: "Check for past legal discussions"

  - pbi_pattern: "integration|api"
    context_sources:
      - type: "confluence"
        space: "TECH"
        search_query: "Salesforce API limits best practices"
        priority: 1

      - type: "devops"
        query: "Tags CONTAINS 'integration' AND State = 'Done'"
        priority: 2
        success_rate: 70%
```

**How to use**:
```typescript
async function findContextSources(pbi: PBI): Promise<ContextSource[]> {
  const learnedSources = loadLearnedSources('team-rubric.yaml');

  // Match PBI against patterns
  for (const pattern of learnedSources.learned_sources) {
    if (pbi.title.match(pattern.pbi_pattern) ||
        pbi.description.match(pattern.pbi_pattern)) {
      return pattern.context_sources.sort((a, b) => a.priority - b.priority);
    }
  }

  return defaultContextSources;
}
```

---

### Level 4: Fine-Tuned Models (Future - V2)

**How it works**: Once 100+ corrected examples collected, fine-tune Claude

**Datasets to collect**:
1. **Confidence Scoring**: 100+ PBIs with corrected scores
2. **Risk Detection**: 100+ PBIs with team-specific risks
3. **Question Generation**: 100+ PBIs with critical questions

**Example fine-tuning dataset**:
```jsonl
{"prompt": "Score hasAllRequirements for this Salesforce portal PBI:\n{...pbi...}", "completion": "Score: 60/100. CRITICAL: License capacity not confirmed. Evidence required: [...]"}
{"prompt": "Score hasAllRequirements for this Salesforce portal PBI:\n{...pbi...}", "completion": "Score: 40/100. BLOCKING: GDPR compliance not verified. Evidence required: [...]"}
...
```

**ROI calculation**:
- Fine-tuning cost: ~$100-500 (one-time)
- Inference cost reduction: 30-50% (smaller, faster model)
- Accuracy improvement: 15-25%

**Trigger**: After 100+ corrections per dimension
**Update frequency**: Quarterly

---

## Implementation Roadmap

### Phase 1: Basic Feedback Collection (Week 1-2)
**Goal**: Capture corrections in structured format

- [ ] Build feedback UI components for each step
- [ ] Store corrections in JSONL files
- [ ] Add "Submit Feedback" buttons to pipeline output

**Success Criteria**: Can collect and store feedback for all 8 steps

---

### Phase 2: Few-Shot Learning (Week 3-4)
**Goal**: Use feedback immediately in next run

- [ ] Implement few-shot example injection into prompts
- [ ] Build "golden examples" selector (picks best 3-5 examples)
- [ ] Add feedback→prompt pipeline

**Success Criteria**: Prompts include team-specific examples

---

### Phase 3: Configuration Generation (Week 5-6)
**Goal**: Auto-generate team-specific configs weekly

- [ ] Build YAML config generator from feedback
- [ ] Implement config-driven scoring adjustments
- [ ] Create learned context source mapper

**Success Criteria**: System uses team rubric automatically

---

### Phase 4: Active Learning UI (Week 7-8)
**Goal**: Proactively ask for feedback when uncertain

- [ ] Add confidence scores to AI outputs
- [ ] Surface "low confidence" predictions for review
- [ ] Implement "Review Queue" for borderline PBIs

**Success Criteria**: Users review only uncertain predictions

---

### Phase 5: Analytics Dashboard (Week 9-10)
**Goal**: Show improvement over time

- [ ] Build training analytics dashboard
- [ ] Track: feedback volume, accuracy trends, common correction patterns
- [ ] Generate weekly "learning report"

**Success Criteria**: Product Owner can see system improvement

---

## Feedback Loop Visualization

```
┌─────────────────────────────────────────────────────────────┐
│  WEEK 1: Initial Run (No Training Data)                     │
│  Confidence Scoring Accuracy: 60%                           │
│  User corrects 15 PBIs                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  WEEK 2: Few-Shot Examples Added                            │
│  Confidence Scoring Accuracy: 72% (+12%)                    │
│  User corrects 8 PBIs (fewer corrections needed!)           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  WEEK 3: Team Rubric Generated                              │
│  Confidence Scoring Accuracy: 81% (+9%)                     │
│  System auto-checks license capacity, GDPR compliance       │
│  User corrects 3 PBIs                                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  WEEK 4+: Learned Context Sources Active                    │
│  Confidence Scoring Accuracy: 88% (+7%)                     │
│  Context enrichment finds relevant docs 90% of time         │
│  User trusts system, minimal corrections                    │
└─────────────────────────────────────────────────────────────┘
```

---

## CLI Commands for Training

### Collect Feedback
```bash
# Interactive feedback mode after processing
backlog-chef process --feedback-mode transcript.json

# Review specific PBI
backlog-chef review PBI-001 --step scoring

# Batch review multiple PBIs
backlog-chef review-batch --pbis PBI-001,PBI-002,PBI-003
```

### View Training Data
```bash
# Show all corrections for a step
backlog-chef training show --step scoring

# Show learning progress
backlog-chef training stats

# Export training data for analysis
backlog-chef training export --format csv --output training-stats.csv
```

### Generate Configs
```bash
# Manually trigger config generation
backlog-chef training generate-config

# Preview what configs would be generated
backlog-chef training preview-config

# Test config impact
backlog-chef training test-config --pbi PBI-001
```

---

## Metrics to Track

### Accuracy Metrics
- **Confidence Score MAE** (Mean Absolute Error): Average difference between system scores and human scores
- **Readiness Classification Accuracy**: % of PBIs correctly classified as READY/NOT_READY
- **Context Relevance Score**: % of found context marked as "relevant" by users
- **Risk Detection Recall**: % of actual risks detected by system

### Efficiency Metrics
- **Corrections per PBI**: Number of corrections needed per PBI (should decrease over time)
- **Review Time**: Time spent by users reviewing/correcting outputs
- **Feedback Adoption Rate**: % of user feedback successfully incorporated into next run

### Business Metrics
- **PBIs Entering Sprint with Blockers**: Should decrease as system improves
- **Sprint Planning Rework**: Time spent in planning clarifying unclear PBIs
- **Team Confidence in AI Output**: Survey score (1-10)

---

## Example: Complete Training Workflow

### Scenario: Training the System to Check License Capacity

**Week 1 - Initial Feedback**:
```
User processes PBI-001 (Portal project)
System scores hasAllRequirements: 85/100
User corrects to 60/100: "License capacity not confirmed"
→ Stored in training-data/scoring/corrections.jsonl
```

**Week 2 - Few-Shot Learning**:
```
User processes PBI-015 (Another portal project)
System prompt now includes:
  "IMPORTANT: For portal PBIs, always verify license capacity"
  Example: PBI-001 was 60/100 because licenses not confirmed
System scores hasAllRequirements: 65/100 ✓ (learned!)
User confirms: "Correct - licenses are still uncertain"
→ System is learning
```

**Week 3 - Pattern Recognition**:
```
System has seen 5 corrections about license capacity
Weekly config generation runs
→ Creates rule in team-rubric.yaml:
  "pattern: portal → check: license_capacity_confirmed → weight: 30"

Next portal PBI automatically deducts 30 points if licenses not mentioned
System scores hasAllRequirements: 55/100 (auto-detected issue!)
User confirms: "Perfect - this IS a blocker"
→ No correction needed
```

**Week 4 - Proactive Detection**:
```
User processes PBI-025 (New portal project)
System:
  1. Detects "portal" keyword
  2. Applies license_capacity rule
  3. Searches for "license" in meeting transcript
  4. Finds: "Sarah: We'll check license availability next week"
  5. Scores: 45/100
  6. Flags: CRITICAL - License capacity not confirmed
  7. Generates question: "How many Experience Cloud licenses are available?"

User: "Exactly right! No corrections needed."
→ System now autonomously checks licenses for portal PBIs
```

---

## Privacy & Security

### Feedback Data
- **PII Redaction**: Automatically redact customer names, emails from training data
- **Access Control**: Only team members can see/correct their team's feedback
- **Data Retention**: Training data stored for 2 years, then anonymized

### Model Training
- **Local Training**: Team-specific configs stay local (not shared across orgs)
- **Opt-out**: Teams can opt out of centralized model improvements
- **Audit Trail**: Track who provided which corrections and when

---

## Summary

The HITL training system transforms Backlog Chef from a **generic AI tool** into **your team's intelligent assistant** that understands:

✅ Your Definition of Ready
✅ Your domain-specific risks (Salesforce licenses, GDPR, API limits)
✅ Your historical patterns (estimation accuracy, common mistakes)
✅ Your context sources (where to find relevant past work)
✅ Your team structure (who to route questions to)

**Key Benefits**:
- **Immediate**: Few-shot learning improves next run
- **Adaptive**: Learns your patterns over weeks
- **Transparent**: Shows what it learned and why
- **Measurable**: Tracks accuracy improvement over time

**Expected Improvement Timeline**:
- Week 1: 60% accuracy (many corrections needed)
- Week 4: 80% accuracy (occasional corrections)
- Week 8: 90% accuracy (rare corrections, high trust)
