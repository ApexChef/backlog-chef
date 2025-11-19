import { MockDocument } from '../types';

// Mock Confluence documentation
export const mockConfluenceDocuments: MockDocument[] = [
  {
    id: 'CONF-Portal-Architecture',
    title: 'Experience Cloud Architecture Guide',
    space: 'TECH',
    content: 'Comprehensive guide for implementing Experience Cloud portals with best practices and patterns.',
    sections: [
      {
        title: 'Authentication Patterns',
        content: 'Recommended patterns for guest vs authenticated users. Use SAML for enterprise SSO, OAuth for social login.'
      },
      {
        title: 'API Limits and Best Practices',
        content: 'API limit best practices documented: Implement caching (Redis recommended), use Platform Events for real-time updates, batch operations where possible.'
      },
      {
        title: 'Security Model',
        content: 'Security model for external users: Use External User licenses, implement row-level security with sharing rules, use permission sets for role-based access.'
      },
      {
        title: 'Performance Optimization',
        content: 'Lazy loading for large datasets, implement pagination (25-50 records per page), use Lightning Data Service cache, minimize SOQL queries in loops.'
      }
    ],
    tags: ['portal', 'experience-cloud', 'architecture', 'security', 'performance'],
    last_updated: '2024-10-15',
    type: 'architecture'
  },
  {
    id: 'CONF-Order-Object',
    title: 'Order Object Data Model',
    space: 'TECH',
    content: 'Technical specification for the Order object and related entities.',
    sections: [
      {
        title: 'Custom Fields',
        content: 'Custom fields: Estimated_Delivery_Date__c (Date), Customer_Status__c (Picklist), Tracking_Number__c (Text), Priority__c (Number)'
      },
      {
        title: 'Sharing Rules',
        content: 'Sharing rules: Private to Account by default, Account team members have read access, Service agents have read/write via permission set'
      },
      {
        title: 'Record Types',
        content: 'Record types: B2B_Order (for business customers), B2C_Order (for individual customers), Internal_Order (for internal use)'
      },
      {
        title: 'Validation Rules',
        content: 'Required fields: Account, Order Date, Status. Business rules: Cannot cancel if status is Delivered, B2B orders require PO number'
      }
    ],
    tags: ['orders', 'data-model', 'salesforce', 'schema'],
    last_updated: '2024-09-20',
    type: 'technical'
  },
  {
    id: 'CONF-Status-Picklist',
    title: 'Order Status Picklist Values',
    space: 'TECH',
    content: 'Standard order status values and their meanings.',
    sections: [
      {
        title: 'Current Status Values',
        content: 'Current values: New, Processing, Awaiting_Payment, Payment_Confirmed, Preparing_Shipment, Shipped, In_Transit, Out_for_Delivery, Delivered, Cancelled, Refund_Requested, Refunded, On_Hold, Failed_Delivery'
      },
      {
        title: 'Status Transitions',
        content: 'Valid transitions: New -> Processing, Processing -> Awaiting_Payment or Preparing_Shipment, Shipped -> In_Transit -> Delivered'
      },
      {
        title: 'Customer-Facing Labels',
        content: 'Mapping to customer-friendly labels defined in Custom Labels. Example: Awaiting_Payment -> "Waiting for your payment"'
      }
    ],
    tags: ['orders', 'status', 'picklist', 'configuration'],
    last_updated: '2024-11-01',
    type: 'technical'
  },
  {
    id: 'CONF-GDPR-Guidelines',
    title: 'GDPR Compliance Guidelines',
    space: 'LEGAL',
    content: 'Guidelines for GDPR compliance in Salesforce implementations.',
    sections: [
      {
        title: 'Data Isolation',
        content: 'B2B users can see company data only with explicit permission model. Implement account-based visibility, not user-based.'
      },
      {
        title: 'Consent Management',
        content: 'Track consent for data processing. Implement consent checkboxes, maintain audit trail, provide data export capability.'
      },
      {
        title: 'Right to be Forgotten',
        content: 'Implement data deletion workflows. Anonymize rather than delete for audit purposes, maintain deletion request log.'
      }
    ],
    tags: ['gdpr', 'compliance', 'legal', 'privacy', 'security'],
    last_updated: '2024-08-30',
    type: 'process'
  },
  {
    id: 'CONF-API-Guidelines',
    title: 'Salesforce API Usage Guidelines',
    space: 'TECH',
    content: 'Best practices for API usage and governor limit management.',
    sections: [
      {
        title: 'API Limits',
        content: 'Daily API limit: 15,000 + (user licenses × 1,000). Monitor usage via System Overview page.'
      },
      {
        title: 'Optimization Strategies',
        content: 'Use composite API for multiple operations, implement caching layer, use Platform Events instead of polling, batch similar operations.'
      },
      {
        title: 'Error Handling',
        content: 'Implement exponential backoff for retries, log all API errors, alert on limit approaching (80% threshold).'
      }
    ],
    tags: ['api', 'limits', 'optimization', 'best-practices'],
    last_updated: '2024-10-10',
    type: 'guidelines'
  },
  {
    id: 'CONF-License-Management',
    title: 'Salesforce License Management',
    space: 'ADMIN',
    content: 'Current license inventory and allocation guidelines.',
    sections: [
      {
        title: 'Experience Cloud Licenses',
        content: 'Current pool: 500 login-based licenses, 100 member-based licenses. Average usage: 380 login-based, 45 member-based.'
      },
      {
        title: 'License Allocation',
        content: 'Priority: 1) Paying customers, 2) Partners, 3) Internal users. Request process via ServiceNow ticket.'
      },
      {
        title: 'Cost Optimization',
        content: 'Review unused licenses quarterly, consider member-based for low-frequency users, negotiate bulk discounts annually.'
      }
    ],
    tags: ['licenses', 'experience-cloud', 'administration', 'costs'],
    last_updated: '2024-11-05',
    type: 'process'
  }
];

export function searchConfluenceDocuments(keywords: string[]): MockDocument[] {
  // Simple keyword matching for POC
  return mockConfluenceDocuments.filter(doc => {
    const searchText = `${doc.title} ${doc.content} ${doc.tags.join(' ')} ${doc.sections.map(s => s.content).join(' ')}`.toLowerCase();
    return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
  });
}