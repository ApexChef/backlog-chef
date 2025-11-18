# 📋 FIREFLIES SUMMARY

Meeting Summary
- Duration: 12 minutes
- Key Topics: Customer self-service portal for order tracking

## Action Items

- Mark: Research which account types should have portal access
- Mark: Define permission model for B2B vs B2C users
- Mark: Lookup average number of orders per customer
- Mark: Create customer-friendly status labels
- Sarah: Verify GDPR requirements for B2B order visibility with legal team
- Sarah: Confirm with stakeholders if manual "expected delivery date" is acceptable for v1
- Lisa: Check Experience Cloud license capacity
- Lisa: Research API limits for Experience Cloud
- Lisa: Design performance strategy for large order volumes

## Questions Raised

- Which account types get portal access?
- Can B2B users see all company orders or only their own?
- Are current Experience Cloud licenses sufficient?
- What are API call limits for Experience Cloud?
- Should we use custom labels for order statuses?
- Do we need real-time tracking integration with shipping providers?
- Should customers be able to modify delivery addresses?
- How many orders does an average customer have?

## Decisions Made

- Scope limited to product orders (not service appointments) for v1
- Use Salesforce Experience Cloud for the portal
- Show orders from last 12 months only
- Enable order cancellation only for non-shipped orders
- Postpone tracking provider integration to later phase
- Postpone delivery address modification to separate story

## Key Participants & Contributions

- Sarah (Product Owner): Defined business requirements and stakeholder needs
- Mark (Business Analyst): Identified data and permission questions
- Lisa (Developer): Raised technical constraints and performance concerns
- Tom (Scrum Master): Facilitated discussion and scope management
