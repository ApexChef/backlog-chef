# STEP 6: Generate Questions + Proposals

**Input:**
```yaml
candidates: [risk-analyzed PBI-001, PBI-004]
stakeholder_registry: "config/stakeholders.yaml"
```

**Process:**
```yaml
for each candidate:
  identify_unanswered_questions()
  classify_question_by_domain()
  route_to_stakeholder()
  generate_proposed_answers()
  search_documentation_for_answers()
```

**Output:**
```yaml
questions_and_proposals:
  
  - pbi_id: "PBI-001"
    title: "Customer Order Tracking Portal"
    
    unanswered_questions:
      
      # CRITICAL - Must answer before starting
      critical:
        - id: "Q001"
          question: "Which account types should have portal access?"
          category: "Business"
          stakeholder:
            role: "ProductOwner"
            name: "Sarah van der Berg"
            email: "sarah.vdberg@company.nl"
          
          proposed_answer:
            confidence: "MEDIUM"
            suggestion: |
              Based on similar portal implementations, recommend:
              - All B2B accounts with "Active" status
              - B2C customers with orders in last 24 months
              - Exclude: Prospects, Inactive, Test accounts
            
            rationale: |
              Previous "Partner Portal" used similar criteria.
              Balances user experience with license costs.
            
            alternatives:
              - "All customers (highest cost, 1200+ licenses)"
              - "Opt-in only (lowest cost, estimated 300 licenses)"
              - "Tiered: Premium customers first, rollout by segment"
          
          documentation_search:
            found: true
            sources:
              - title: "Customer Segmentation Strategy 2024"
                excerpt: "Tier 1: >€50k annual revenue, Tier 2: €10-50k..."
                link: "https://sharepoint.company.com/customer-segments"
              - title: "Account Classification Rules"
                excerpt: "Active account criteria: order in last 18 months..."
                link: "https://confluence.company.com/account-rules"
        
        - id: "Q002"
          question: "What is the permission model for B2B users? Can they see all company orders or only their own?"
          category: "Business/Security"
          stakeholders:
            - role: "ProductOwner"
              name: "Sarah van der Berg"
              email: "sarah.vdberg@company.nl"
            - role: "SecurityArchitect"
              name: "Maria Janssen"
              email: "maria.janssen@company.nl"
          
          proposed_answer:
            confidence: "HIGH"
            suggestion: |
              Implement role-based access:
              
              **Admin Role** (Purchasing Manager):
              - See all orders for their Account
              - Can cancel any company order
              - Access to company-wide statistics
              
              **Standard User**:
              - See only orders where they are listed as Contact
              - Can cancel only their own orders
              - Personal statistics only
              
              **Implementation**:
              - Use Salesforce Permission Sets
              - Add checkbox on Contact: "Order_Admin__c"
              - Sharing rules: Order OWD = Private, share via Contact lookup
            
            rationale: |
              This model found in past GDPR compliance review.
              Balances usability with data privacy requirements.
              Standard Salesforce patterns, easier to maintain.
            
            legal_considerations:
              - "GDPR Article 6: Must have legitimate interest or consent"
              - "Recommendation: Add consent checkbox during portal registration"
              - "Log all order access for audit trail (GDPR Article 30)"
          
          documentation_search:
            found: true
            sources:
              - title: "GDPR Compliance - B2B Data Access"
                excerpt: "Employee access to company data: requires documented business need..."
                link: "https://confluence.company.com/gdpr-b2b"
                relevance: 95%
        
        - id: "Q003"
          question: "Are current Experience Cloud licenses sufficient for expected user base?"
          category: "Technical/Budget"
          stakeholders:
            - role: "ProductOwner"
              name: "Sarah van der Berg"
              email: "sarah.vdberg@company.nl"
            - role: "SalesforceAdmin"
              name: "Peter de Vries"
              email: "peter.devries@company.nl"
          
          proposed_answer:
            confidence: "LOW"
            suggestion: |
              **Current State**:
              - License type: Experience Cloud Login-Based
              - Capacity: 500 licenses
              - Cost per license: ~€30/year
              
              **Estimated Need**:
              - Total customers: 1,200
              - Active customers (order in 12mo): ~800
              - Expected adoption rate: 60%
              - Needed licenses: ~480
              
              **Assessment**: JUST SUFFICIENT for initial rollout
              
              **Risks**:
              - No buffer for growth
              - If adoption > 60%, need more licenses (12-week procurement)
              - B2B multi-user accounts could spike usage
              
              **Recommendation**:
              - Phase 1: Invite-only to 300 key customers
              - Monitor adoption rate
              - Procure additional 500 licenses for Phase 2
            
            alternatives:
              - "Buy 500 more licenses upfront (€15k/year)"
              - "Use Member-Based licenses (cheaper but limited features)"
              - "Implement waitlist if capacity reached"
          
          documentation_search:
            found: true
            sources:
              - title: "Salesforce License Inventory Q4 2024"
                excerpt: "Experience Cloud: 500 login licenses, 482 active users..."
                link: "https://sharepoint.company.com/sf-licenses"
                note: "⚠️ Already at 96% capacity!"
      
      # HIGH - Should answer before sprint
      high:
        - id: "Q004"
          question: "What is the average number of orders per customer? How many have >500 orders?"
          category: "Data/Performance"
          stakeholder:
            role: "BusinessAnalyst"
            name: "Mark Hendriksen"
            email: "mark.hendriksen@company.nl"
          
          proposed_answer:
            confidence: "MEDIUM"
            suggestion: |
              Request SQL query to run:
```sql
              SELECT 
                COUNT(*) as customer_count,
                AVG(order_count) as avg_orders,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY order_count) as median,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY order_count) as p95,
                MAX(order_count) as max_orders
              FROM (
                SELECT AccountId, COUNT(*) as order_count
                FROM Order
                WHERE CreatedDate >= LAST_N_MONTHS:24
                GROUP BY AccountId
              )
```

              Expected results (hypothesis):
              - Median: 5-10 orders
              - 95th percentile: 50-100 orders
              - Max: 500-2000 orders
              
              Based on these, recommend:
              - If median < 20: Simple list view OK
              - If p95 > 100: Need pagination (20 per page)
              - If max > 500: Need search/filter + caching
            
            performance_recommendations:
              - "< 50 orders: Load all, no pagination needed"
              - "50-200 orders: Server-side pagination required"
              - "> 200 orders: Add search/filter + lazy loading"
          
          documentation_search:
            found: false
            note: "No existing analysis found. Needs new data query."
        
        - id: "Q005"
          question: "What are the customer-friendly labels for each order status?"
          category: "UX/Content"
          stakeholders:
            - role: "UXDesigner"
              name: "Emma Visser"
              email: "emma.visser@company.nl"
            - role: "ProductOwner"
              name: "Sarah van der Berg"
              email: "sarah.vdberg@company.nl"
          
          proposed_answer:
            confidence: "HIGH"
            suggestion: |
              Proposed mapping (based on customer communication guidelines):
              
              Technical → Customer Label:
              - New → "Being Processed"
              - Processing → "Preparing Your Order"
              - Awaiting_Payment → "Awaiting Payment"
              - Shipped → "On Its Way"
              - In_Transit → "In Transit"
              - Delivered → "Delivered"
              - Cancelled → "Cancelled"
              - Refunded → "Refunded"
              
              With icons:
              - Being Processed: ⏳
              - Preparing Your Order: 📦
              - On Its Way: 🚚
              - Delivered: ✅
            
            rationale: |
              Aligns with "Customer Communication Style Guide"
              User testing showed customers prefer action-oriented language
              Icons improve scannability
            
            localization_note: |
              Dutch translations also needed:
              - "Being Processed" → "Wordt Verwerkt"
              - "On Its Way" → "Onderweg"
              etc.
          
          documentation_search:
            found: true
            sources:
              - title: "Customer Communication Style Guide"
                excerpt: "Use active voice. Avoid jargon. Be specific about timing..."
                link: "https://confluence.company.com/style-guide"
              - title: "UX Pattern Library - Status Messages"
                excerpt: "Status indicators should use: verb + object + icon..."
                link: "https://confluence.company.com/ux-patterns"
      
      # MEDIUM - Can defer but impacts quality
      medium:
        - id: "Q006"
          question: "Should we show expected delivery date? If yes, how is it calculated?"
          category: "Business/Technical"
          stakeholders:
            - role: "ProductOwner"
              name: "Sarah van der Berg"
              email: "sarah.vdberg@company.nl"
            - role: "LogisticsManager"
              name: "Johan Bakker"
              email: "johan.bakker@company.nl"
          
          proposed_answer:
            confidence: "MEDIUM"
            suggestion: |
              **Option 1: Manual Entry (MVP)**
              - Sales rep enters estimated date when order ships
              - Field: Estimated_Delivery_Date__c (already exists!)
              - Pro: Simple, no integration needed
              - Con: May be inaccurate, relies on manual input
              
              **Option 2: Business Rules**
              - Calculate based on shipping method + destination
              - Example: NL domestic = Ship date + 2 days, EU = + 5 days
              - Pro: Automatic, consistent
              - Con: Doesn't account for delays
              
              **Option 3: Live Tracking (Phase 2)**
              - Integrate with DHL/PostNL API
              - Show real-time ETA
              - Pro: Most accurate
              - Con: Complex integration (moved to PBI-002)
              
              **Recommendation for v1**: Option 2 (Business Rules)
              - Add Process Builder or Flow
              - Update Estimated_Delivery_Date__c on ship
              - Display with caveat: "Estimated, subject to carrier delays"
            
            risk: |
              If we show inaccurate dates, impacts customer trust.
              Consider: "We'll email you when it's delivered" instead.
          
          documentation_search:
            found: true
            sources:
              - title: "Shipping & Logistics Process"
                excerpt: "Standard delivery: NL 1-2 days, EU 3-5 days, Outside EU 7-14 days"
                link: "https://sharepoint.company.com/logistics"
        
        - id: "Q007"
          question: "What happens if a customer tries to cancel an order that's already shipped?"
          category: "Business Logic"
          stakeholder:
            role: "ProductOwner"
            name: "Sarah van der Berg"
            email: "sarah.vdberg@company.nl"
          
          proposed_answer:
            confidence: "HIGH"
            suggestion: |
              Recommended user flow:
              
              **If status IN ('Shipped', 'In_Transit', 'Delivered')**:
              - Hide "Cancel Order" button
              - Show message: "This order has been shipped and cannot be cancelled."
              - Offer alternative: "Contact Support for Returns" (link to support page)
              
              **If status = 'New' or 'Processing'**:
              - Show "Cancel Order" button
              - Click → Confirmation dialog:
                "Are you sure you want to cancel this order?"
                [Cancel Order] [Keep Order]
              - On confirm → Update Status = 'Cancelled'
              - Send confirmation email
              - Trigger refund process (if payment captured)
              
              **Edge case**: Order shipped between page load and cancel click
              - Add server-side validation
              - Check status again before cancelling
              - Return error: "Order status changed, cannot cancel"
            
            technical_implementation:
              - "Apex validation rule on Order update"
              - "Lightning component: disable button based on status"
              - "Email template: Order_Cancelled_Confirmation"
              - "Flow: Trigger_Refund_Process"
          
          documentation_search:
            found: true
            sources:
              - title: "Order Cancellation Policy"
                excerpt: "Customers can cancel up until shipping. After shipping, returns process applies..."
                link: "https://sharepoint.company.com/policies/cancellation"
      
      # LOW - Nice to have clarification
      low:
        - id: "Q008"
          question: "Should mobile users have a different UI/UX than desktop?"
          category: "UX"
          stakeholder:
            role: "UXDesigner"
            name: "Emma Visser"
            email: "emma.visser@company.nl"
          
          proposed_answer:
            confidence: "HIGH"
            suggestion: |
              **Recommendation**: Responsive design, not separate UX
              
              - Use Experience Cloud's responsive templates
              - Mobile adaptations:
                * Stack cards vertically instead of grid
                * Larger touch targets (min 44px)
                * Hamburger menu for navigation
                * Swipe gestures for order details
              - Same components, different layout
              
              **Do NOT build separate mobile app** (out of scope)
            
            rationale: "Faster time to market, easier maintenance"
          
          documentation_search:
            found: true
            sources:
              - title: "Mobile Design Standards"
                excerpt: "All customer-facing features must be mobile-responsive..."
                link: "https://confluence.company.com/mobile-standards"
```
