# STEP 5: Check Risks & Conflicts

**Input:**
```yaml
candidates: [enriched PBI-001, PBI-002, PBI-003, PBI-004]
active_backlog: [from DevOps]
```

**Process:**
```yaml
for each candidate:
  detect_scope_creep()
  detect_dependencies()
  detect_conflicts()
  analyze_complexity()
  check_resource_constraints()
```

**Output:**
```yaml
risk_analysis:
  
  - id: "PBI-001"
    title: "Customer Order Tracking Portal"
    
    risks:
      CRITICAL:
        - type: "BLOCKING_DEPENDENCY"
          description: "License capacity insufficient"
          detail: |
            Current capacity: 500 login-based licenses
            Estimated need: 1200+ customers
            Gap: 700 licenses (~€21,000 annual cost)
          action_required: "Confirm budget approval before starting"
          assigned_to: "Sarah (PO)"
        
        - type: "UNRESOLVED_DECISION"
          description: "GDPR compliance not verified"
          detail: "B2B order visibility requires legal approval"
          action_required: "Get legal sign-off on permission model"
          assigned_to: "Sarah (PO)"
        
        - type: "SCOPE_CREEP_RISK"
          description: "Multiple integration points mentioned"
          detail: |
            Mentioned but not scoped:
            - Notification system (email on status change)
            - Mobile app version
            - Order invoice download
          action_required: "Explicitly document out-of-scope items"
          assigned_to: "Mark (BA)"
      
      HIGH:
        - type: "TECHNICAL_COMPLEXITY"
          description: "Performance at scale not designed"
          detail: |
            Unknown: Average orders per customer
            Risk: B2B customers may have 1000+ orders
            Previous portal had timeout issues at 500+ records
          action_required: "Design pagination and caching strategy"
          assigned_to: "Lisa (Dev)"
        
        - type: "DEPENDENCY_ON_INFLIGHT_WORK"
          description: "Depends on PBI-004 (Status Labels)"
          detail: "Portal should use friendly labels from PBI-004"
          action_required: "Sequence: PBI-004 must complete first"
          assigned_to: "Tom (SM)"
      
      MEDIUM:
        - type: "ESTIMATION_UNCERTAINTY"
          description: "High variance in similar past work"
          detail: "Partner Portal: estimated 13pts, actual 21pts (+61%)"
          action_required: "Add buffer to estimate, consider spike story"
          assigned_to: "Team"
    
    conflicts:
      - type: "EXISTING_WORK"
        description: "PBI-2025-023 'Customer Login System' in progress"
        detail: "Same authentication mechanism needed"
        resolution: "Verify if login flow can be reused"
        assigned_to: "Lisa (Dev)"
    
    complexity_score: 8.5/10
    recommended_split: true
    split_suggestion: |
      Consider splitting into:
      1. "Portal Login & Basic Order List" (MVP)
      2. "Order Dashboard & Statistics"
      3. "Order Cancellation Feature"

  - id: "PBI-004"
    title: "Customer-Friendly Order Status Labels"
    
    risks:
      LOW:
        - type: "MISSING_STAKEHOLDER"
          description: "UX designer not in refinement meeting"
          detail: "Label copy needs UX approval"
          action_required: "Schedule UX review session"
          assigned_to: "Tom (SM)"
    
    conflicts:
      - type: "DATA_INCONSISTENCY"
        description: "More status values exist than discussed"
        detail: |
          Meeting mentioned: 5 statuses
          Actual system: 8 statuses (see Confluence)
          Missing: Awaiting_Payment, In_Transit, Refunded
        resolution: "Update scope to cover all statuses"
        assigned_to: "Mark (BA)"
    
    complexity_score: 2/10
    recommended_split: false
```
