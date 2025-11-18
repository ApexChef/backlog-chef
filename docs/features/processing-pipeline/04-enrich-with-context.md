# STEP 4: Enrich with Context

**Input:**
```yaml
candidates: [scored PBI-001, PBI-002, PBI-003, PBI-004]
context_sources:
  - devops_backlog
  - confluence_docs
  - previous_meetings
```

**Process:**
```yaml
for each candidate:
  search_similar_work:
    query: semantic_similarity(candidate.description)
    sources: [devops, confluence]
  
  search_past_decisions:
    query: extract_key_concepts(candidate)
    sources: [meeting_transcripts, confluence]
  
  search_technical_docs:
    query: extract_components(candidate.technical_notes)
    sources: [confluence, sharepoint]
```

**Output:**
```yaml
enriched_candidates:
  
  - id: "PBI-001"
    title: "Customer Order Tracking Portal"
    [... previous data ...]
    
    context_enrichment:
      similar_work:
        - ref: "PBI-2023-156"
          title: "Partner Portal Implementation"
          similarity: 78%
          learnings:
            - "Experience Cloud licenses were bottleneck"
            - "Performance issues with > 1000 records per user"
            - "Initial estimate 13 points, actual 21 points"
            - "Caching strategy saved 70% API calls"
          link: "https://devops.company.com/PBI-2023-156"
        
        - ref: "CONF-Portal-Architecture"
          title: "Experience Cloud Architecture Guide"
          similarity: 65%
          learnings:
            - "Recommended patterns for guest vs authenticated users"
            - "API limit best practices documented"
            - "Security model for external users"
          link: "https://confluence.company.com/portal-arch"
      
      past_decisions:
        - ref: "Meeting-2024-10-15"
          title: "Q4 Architecture Review"
          decision: "Standardize on Experience Cloud for all customer portals"
          rationale: "Consolidate licenses and expertise"
          constraints: "Current license pool: 500 login-based licenses"
        
        - ref: "Meeting-2024-09-20"
          title: "GDPR Compliance Review"
          decision: "B2B users can see company data only with explicit permission model"
          rationale: "Legal requirement for data isolation"
          assigned_architect: "Maria (Security)"
      
      technical_docs:
        - ref: "CONF-Order-Object"
          title: "Order Object Data Model"
          relevant_sections:
            - "Custom fields: Estimated_Delivery_Date__c, Customer_Status__c"
            - "Sharing rules: Private to Account"
            - "Record types: B2B_Order, B2C_Order"
          link: "https://confluence.company.com/order-model"
      
      risk_flags:
        - type: "SIMILAR_WORK_UNDERESTIMATED"
          severity: "HIGH"
          message: "Similar portal project took 60% more effort than estimated"
        
        - type: "LICENSE_CAPACITY"
          severity: "HIGH"
          message: "Only 500 licenses available, customer base is 1200+"
        
        - type: "PERFORMANCE_RISK"
          severity: "MEDIUM"
          message: "Previous portal had performance issues with large datasets"

  - id: "PBI-004"
    title: "Customer-Friendly Order Status Labels"
    [... previous data ...]
    
    context_enrichment:
      similar_work:
        - ref: "PBI-2024-089"
          title: "Localize Product Categories"
          similarity: 55%
          learnings:
            - "Used Custom Labels for multi-language support"
            - "Created translation spreadsheet workflow"
            - "2 points, completed in 1 day"
          link: "https://devops.company.com/PBI-2024-089"
      
      technical_docs:
        - ref: "CONF-Status-Picklist"
          title: "Order Status Picklist Values"
          content: |
            Current values:
            - New
            - Processing
            - Awaiting_Payment
            - Shipped
            - In_Transit
            - Delivered
            - Cancelled
            - Refunded
          note: "More statuses exist than discussed in meeting!"
          link: "https://confluence.company.com/order-status"
      
      suggestions:
        - "Consider using Custom Labels for easy translation"
        - "UX team has existing guidelines for status terminology"
        - "Map to existing 'Customer Communication Style Guide'"
```
