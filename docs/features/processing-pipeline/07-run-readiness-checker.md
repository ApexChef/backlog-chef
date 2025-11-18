# STEP 7: Run Readiness Checker

**Input:**
```yaml
candidates: [PBI-001 with questions, PBI-004 with questions]
definition_of_ready: "config/definition_of_ready.yaml"
```

**Process:**
```yaml
for each candidate:
  evaluate_readiness_criteria()
  categorize_gaps(blocking, warning, suggestion)
  calculate_readiness_score()
  recommend_next_actions()
```

**Output:**
```yaml
readiness_assessment:
  
  - pbi_id: "PBI-001"
    title: "Customer Order Tracking Portal"
    
    readiness_status: "🔴 NOT READY"
    readiness_score: 35/100
    
    definition_of_ready_checklist:
      
      ✅ PASSED:
        - has_clear_business_value:
            status: "PASS"
            evidence: "Customer pain point clearly articulated"
        
        - has_acceptance_criteria:
            status: "PASS"
            evidence: "6 AC defined (needs refinement)"
        
        - scope_is_defined:
            status: "PASS"
            evidence: "In/out of scope discussed"
        
        - has_technical_approach:
            status: "PASS"
            evidence: "Experience Cloud agreed upon"
      
      ❌ BLOCKING FAILURES:
        - dependencies_resolved:
            status: "FAIL"
            severity: "BLOCKING"
            issues:
              - "License capacity insufficient (500 available, 800+ needed)"
              - "GDPR approval not obtained"
              - "Depends on PBI-004 completion"
            action_required: |
              1. PO must secure budget for 500 additional licenses (€15k/year)
              2. PO must get legal sign-off on B2B permission model
              3. SM must sequence: PBI-004 → PBI-001
        
        - key_questions_answered:
            status: "FAIL"
            severity: "BLOCKING"
            issues:
              - "3 critical questions unanswered (Q001, Q002, Q003)"
            action_required: |
              Must answer before sprint commitment:
              - Which account types get access?
              - B2B permission model?
              - License procurement approval?
        
        - estimable_by_team:
            status: "FAIL"
            severity: "BLOCKING"
            issues:
              - "Too many unknowns (35% confidence score)"
              - "Performance strategy undefined"
              - "Data volume unknown"
            action_required: |
              1. BA must run data analysis query (Q004)
              2. Dev must design pagination/caching approach
              3. Consider technical spike story first
      
      ⚠️  WARNINGS:
        - small_enough_for_sprint:
            status: "WARNING"
            issue: "High complexity (8.5/10), may exceed sprint capacity"
            recommendation: |
              Consider splitting into:
              - Sprint 1: Login + Basic Order List (MVP)
              - Sprint 2: Dashboard + Statistics
              - Sprint 3: Order Cancellation
        
        - design_approved:
            status: "WARNING"
            issue: "No UX mockups reviewed"
            recommendation: "Schedule design review before sprint"
        
        - performance_baseline:
            status: "WARNING"
            issue: "No performance requirements defined"
            recommendation: "Define: max page load time, API timeout limits"
      
      💡 SUGGESTIONS:
        - has_test_strategy:
            status: "SUGGESTION"
            note: "No testing approach discussed"
            suggestion: "Define: unit tests, integration tests, UAT plan"
        
        - documentation_complete:
            status: "SUGGESTION"
            note: "No technical design doc created"
            suggestion: "Create Confluence page with architecture diagram"
    
    recommended_next_actions:
      immediate:
        - action: "PO: Secure license budget approval"
          priority: "CRITICAL"
          owner: "Sarah van der Berg"
          estimated_time: "2-3 days"
        
        - action: "PO: Get legal GDPR approval"
          priority: "CRITICAL"
          owner: "Sarah van der Berg"
          estimated_time: "1 week"
        
        - action: "BA: Run customer data analysis query"
          priority: "HIGH"
          owner: "Mark Hendriksen"
          estimated_time: "1 hour"
        
        - action: "Dev: Design performance approach"
          priority: "HIGH"
          owner: "Lisa"
          estimated_time: "4 hours"
      
      before_sprint:
        - action: "Team: Refinement session #2 to answer critical questions"
          priority: "HIGH"
          estimated_time: "1 hour"
        
        - action: "UX: Create portal mockups"
          priority: "MEDIUM"
          owner: "Emma Visser"
          estimated_time: "1 day"
        
        - action: "Consider: Technical spike story (4 hours) to validate approach"
          priority: "MEDIUM"
      
      nice_to_have:
        - action: "Create technical design doc in Confluence"
          priority: "LOW"
          estimated_time: "2 hours"
    
    sprint_readiness_eta: "2-3 weeks"
    confidence_in_eta: "MEDIUM"

  - pbi_id: "PBI-004"
    title: "Customer-Friendly Order Status Labels"
    
    readiness_status: "🟢 READY"
    readiness_score: 85/100
    
    definition_of_ready_checklist:
      
      ✅ PASSED:
        - has_clear_business_value: "PASS"
        - has_acceptance_criteria: "PASS"
        - scope_is_defined: "PASS"
        - has_technical_approach: "PASS"
        - estimable_by_team: "PASS"
        - small_enough_for_sprint: "PASS"
        - dependencies_resolved: "PASS"
        - key_questions_answered: "MOSTLY" (1 minor question)
      
      ⚠️  WARNINGS:
        - design_approved:
            status: "WARNING"
            issue: "UX designer not involved in refinement"
            recommendation: "Quick 15-min review with Emma before starting"
      
      💡 SUGGESTIONS:
        - data_accuracy:
            status: "SUGGESTION"
            note: "Meeting mentioned 5 statuses, system has 8"
            suggestion: "Update scope to include all 8 status values"
    
    recommended_next_actions:
      immediate:
        - action: "BA: Confirm all 8 status values in scope"
          priority: "HIGH"
          owner: "Mark Hendriksen"
          estimated_time: "15 minutes"
        
        - action: "UX: Quick review of proposed labels"
          priority: "MEDIUM"
          owner: "Emma Visser"
          estimated_time: "15 minutes"
      
      sprint_ready: true
      can_start: "After BA confirms scope update"
    
    sprint_readiness_eta: "Ready now (after 30-min follow-up)"
    confidence_in_eta: "HIGH"
    
    estimation_guidance:
      similar_work: "PBI-2024-089 (Localize Categories) = 2 points, 1 day"
      complexity_factors:
        - "Simple configuration change"
        - "No API integration"
        - "Proven pattern (Custom Labels)"
      recommended_estimate: "2 story points"
      confidence: "HIGH"
```
