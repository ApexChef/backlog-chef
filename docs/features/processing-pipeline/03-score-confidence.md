# STEP 3: Score Confidence

**Input:**
```yaml
candidates: [PBI-001, PBI-002, PBI-003, PBI-004]
quality_checklist: "pbi_quality_checklist.yaml"
```

**Process:**
```yaml
for each candidate:
  analyze against checklist:
    - who_and_why_questions
    - what_questions
    - acceptance_questions
    - constraints_questions
    - clarity_questions
  
  calculate scores:
    - isCompletePBI
    - hasAllRequirements
    - isRefinementComplete
    - hasAcceptanceCriteria
    - hasClearScope
    - isEstimable
```

**Output:**
```yaml
scored_candidates:
  
  - id: "PBI-001"
    title: "Customer Order Tracking Portal"
    
    confidenceScores:
      isCompletePBI:
        score: 85
        reasoning: "Clear business value, specific user need, actionable scope"
        evidence: 
          - "Sarah clearly stated customer pain point"
          - "Specific functionality described"
          - "Acceptance criteria defined"
      
      hasAllRequirements:
        score: 45
        reasoning: "Multiple critical questions unanswered"
        evidence:
          - "Account type access rules undefined"
          - "Permission model for B2B/B2C unclear"
          - "License capacity unknown"
          - "Performance strategy not defined"
      
      isRefinementComplete:
        score: 40
        reasoning: "Needs significant additional refinement"
        evidence:
          - "GDPR requirements not verified"
          - "Technical feasibility not confirmed"
          - "Multiple dependencies unresolved"
      
      hasAcceptanceCriteria:
        score: 70
        reasoning: "AC present but incomplete"
        evidence:
          - "6 criteria defined"
          - "Missing: performance requirements"
          - "Missing: error handling scenarios"
          - "Missing: B2B vs B2C behavior differences"
      
      hasClearScope:
        score: 80
        reasoning: "Scope boundaries explicitly discussed"
        evidence:
          - "In-scope clearly defined"
          - "Out-of-scope items identified"
          - "Phase 2 items separated"
      
      isEstimable:
        score: 35
        reasoning: "Too many unknowns to estimate accurately"
        evidence:
          - "License availability unknown"
          - "Permission model undefined"
          - "Performance requirements unclear"
          - "Data volume unknown"
    
    overall_readiness: "NOT_READY"
    blocking_issues: 3
    warning_issues: 2

  - id: "PBI-002"
    title: "Shipment Tracking Integration"
    
    confidenceScores:
      isCompletePBI:
        score: 75
        reasoning: "Clear feature but limited detail"
        evidence: ["Specific integration need identified"]
      
      hasAllRequirements:
        score: 30
        reasoning: "Very high-level, lacks detail"
        evidence:
          - "No API research done"
          - "No error handling discussed"
          - "No cost analysis"
      
      isRefinementComplete:
        score: 20
        reasoning: "Explicitly moved to phase 2, needs full refinement"
        evidence: ["Team agreed to defer"]
      
      hasAcceptanceCriteria:
        score: 40
        reasoning: "Basic AC only, missing technical details"
        evidence: ["3 criteria but all high-level"]
      
      hasClearScope:
        score: 60
        reasoning: "Scope mentioned but not detailed"
        evidence: ["Integration goal clear", "Implementation unclear"]
      
      isEstimable:
        score: 15
        reasoning: "Cannot estimate without API research"
        evidence: ["No integration experience", "Unknown complexity"]
    
    overall_readiness: "FUTURE_PHASE"
    blocking_issues: 5
    warning_issues: 1

  - id: "PBI-003"
    title: "Order Delivery Address Modification"
    
    confidenceScores:
      isCompletePBI:
        score: 70
        reasoning: "Valid feature but explicitly deferred"
        evidence: ["Team recognized complexity", "Moved to separate story"]
      
      hasAllRequirements:
        score: 35
        reasoning: "High-level understanding only"
        evidence:
          - "Validation rules not defined"
          - "Cost recalculation logic unclear"
          - "Update workflow not designed"
      
      isRefinementComplete:
        score: 25
        reasoning: "Deferred for good reason - needs separate refinement"
        evidence: ["Team identified as too complex for current scope"]
      
      hasAcceptanceCriteria:
        score: 50
        reasoning: "AC present but incomplete"
        evidence: ["3 criteria defined", "Missing edge cases"]
      
      hasClearScope:
        score: 70
        reasoning: "Scope understood enough to defer"
        evidence: ["Team understood implications", "Complexity recognized"]
      
      isEstimable:
        score: 40
        reasoning: "Rough sense of effort but too many unknowns"
        evidence: ["Recognized as 'complex'", "No detailed analysis"]
    
    overall_readiness: "DEFERRED"
    blocking_issues: 4
    warning_issues: 1

  - id: "PBI-004"
    title: "Customer-Friendly Order Status Labels"
    
    confidenceScores:
      isCompletePBI:
        score: 90
        reasoning: "Clear, focused enabler story"
        evidence: ["Specific task identified", "Clear purpose"]
      
      hasAllRequirements:
        score: 70
        reasoning: "Most requirements clear, some detail needed"
        evidence:
          - "Current statuses known"
          - "Friendly labels need definition"
          - "Implementation approach clear"
      
      isRefinementComplete:
        score: 65
        reasoning: "Needs UX input but otherwise ready"
        evidence: ["Technical approach known", "Requires UX design"]
      
      hasAcceptanceCriteria:
        score: 75
        reasoning: "Good AC coverage for size of story"
        evidence: ["3 clear criteria", "Testable conditions"]
      
      hasClearScope:
        score: 85
        reasoning: "Narrow, well-defined scope"
        evidence: ["Small, focused change", "Clear boundaries"]
      
      isEstimable:
        score: 80
        reasoning: "Straightforward task, estimable"
        evidence: ["Configuration change", "Known complexity"]
    
    overall_readiness: "MOSTLY_READY"
    blocking_issues: 1
    warning_issues: 0
```
