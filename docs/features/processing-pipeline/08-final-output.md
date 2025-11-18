# STEP 8: Final Output

**Input:**
```yaml
ready_pbis: [PBI-001, PBI-004]
outputs_config:
  - obsidian
  - devops
  - confluence
```

**Process:**
```yaml
for each destination:
  transform(pbi, destination_adapter)
  output(transformed_pbi)
```

**Output:**

## 📊 FINAL PBI BACKLOG

### Summary Statistics
```yaml
Total Candidates Extracted: 4
├─ Ready for Sprint: 1 (PBI-004)
├─ Needs Refinement: 1 (PBI-001)
├─ Deferred: 1 (PBI-003)
└─ Future Phase: 1 (PBI-002)

Critical Blockers: 3
High Priority Questions: 5
Documentation Gaps: 2
```







### PBI-001: Customer Order Tracking Portal
**Status**: 🔴 NOT READY FOR SPRINT  
**Readiness Score**: 35/100  
**Confidence**: LOW  

**Description**:
Enable customers to self-service check their order status without contacting support. Customers (Contacts in Salesforce) can log into a portal to view their current and historical product orders.

**Acceptance Criteria**:
- ✅ Customers can log into the portal using email/credentials
- ✅ Dashboard shows overview of customer's orders
- ✅ List displays: order number, date, status, items
- ✅ Customers can view orders from last 12 months
- ✅ Order statuses use customer-friendly language (from PBI-004)
- ✅ Customers can cancel orders that are not yet shipped

**🚨 BLOCKING ISSUES** (Must resolve before sprint):
1. **License Capacity**: Need 800 licenses, have 500 (€15k budget approval needed)
2. **GDPR Compliance**: B2B permission model requires legal sign-off
3. **Data Unknown**: Customer order volume not analyzed (impacts design)

**⚠️ CRITICAL QUESTIONS** (3):
- **Q001**: Which account types get portal access? → Assigned to: Sarah (PO)
- **Q002**: B2B permission model - all orders or own only? → Sarah + Maria (Security)
- **Q003**: License procurement approved? → Sarah (PO)

**⚠️ HIGH PRIORITY QUESTIONS** (2):
- **Q004**: Average orders per customer? Max volume? → Mark (BA) - SQL query
- **Q005**: Customer-friendly status labels? → Emma (UX) - Covered by PBI-004

**💡 PROPOSALS PROVIDED**:
- Permission model: Role-based (Admin sees all, User sees own)
- License strategy: Phased rollout (300 → 800 users)
- Performance: Pagination + caching (based on data analysis results)

**🔗 SIMILAR WORK**:
- PBI-2023-156 (Partner Portal): 13pt estimated, 21pt actual (+61% overrun)
  - Lesson: Performance issues with >1000 records
  - Solution: Implement caching (saved 70% API calls)

**📦 DEPENDENCIES**:
- Depends on: PBI-004 (Status Labels) - must complete first
- Blocked by: Budget approval, Legal approval

**🎯 RECOMMENDED SPLIT**:
Consider breaking into 3 sprints:
1. **MVP**: Login + Basic Order List (8 points)
2. **Dashboard**: Statistics & Overview (5 points)
3. **Actions**: Order Cancellation (3 points)

**📅 SPRINT READINESS ETA**: 2-3 weeks  
**Next Refinement Needed**: Yes  

**Actions Before Sprint**:
1. Sarah: Secure €15k license budget (2-3 days)
2. Sarah: Get legal GDPR sign-off (1 week)
3. Mark: Run data analysis query (1 hour)
4. Lisa: Design pagination approach (4 hours)
5. Team: Refinement session #2 (1 hour)

---

### PBI-002: Shipment Tracking Integration
- **Status**: 🔵 FUTURE PHASE (Phase 2)
- **Readiness Score**: 20/100
- **Confidence**: VERY LOW
- **Description**:
Integrate with shipping providers (DHL, PostNL) to show real-time tracking.
Why Deferred:

No existing integration with DHL/PostNL APIs
Significant technical complexity
Team agreed: not needed for MVP
Should be separate epic with proper research

When to Refine:
After PBI-001 is live and we have user feedback on v1 portal.
Estimated Research Needed:

API documentation review: 4-8 hours
Cost analysis: DHL/PostNL API pricing
Security review: External API integration
Proof of concept: 1-2 days


- - -

### PBI-003: Order Delivery Address Modification
- **Status**: 🟡 DEFERRED
- **Readiness Score**: 25/100
- **Confidence**: LOW
- **Description**:
Allow customers to change delivery address for non-shipped orders.
Why Deferred:

Complex: Requires validation, cost recalculation, order update workflow
Team recognized during meeting: "too complex for current scope"
Better as separate story after portal MVP

When to Refine:
Q1 2026, after portal v1 is stable.


 - - -
### PBI-004: Customer-Friendly Order Status Labels
**Status**: 🟢 READY FOR SPRINT  
**Readiness Score**: 85/100  
**Confidence**: HIGH  

**Description**:
Replace technical order statuses with customer-friendly labels in the portal.

**Acceptance Criteria**:
- ✅ Define mapping: technical status → customer label (8 statuses)
- ✅ All portal pages use friendly labels
- ✅ Backend maintains technical statuses
- ✅ Configuration via Custom Labels (supports localization)

**Proposed Status Mappings**:
```
New              → "Being Processed" ⏳
Processing       → "Preparing Your Order" 📦
Awaiting_Payment → "Awaiting Payment" 💳
Shipped          → "On Its Way" 🚚
In_Transit       → "In Transit" 🚚
Delivered        → "Delivered" ✅
Cancelled        → "Cancelled" ❌
Refunded         → "Refunded" 💰
```
