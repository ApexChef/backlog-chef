import { MockPBI } from '../types';

// Mock DevOps repository with historical PBIs
export const mockDevOpsPBIs: MockPBI[] = [
  {
    id: 'PBI-2023-156',
    title: 'Partner Portal Implementation',
    description: 'Implement a self-service portal for partners using Salesforce Experience Cloud',
    tags: ['portal', 'experience-cloud', 'b2b', 'self-service', 'partner'],
    estimated_effort: 13,
    actual_effort: 21,
    learnings: [
      'Experience Cloud licenses were bottleneck - needed to purchase additional licenses mid-project',
      'Performance issues with > 1000 records per user - implemented pagination and caching',
      'Initial estimate 13 points, actual 21 points due to security requirements',
      'Caching strategy saved 70% API calls and improved response times'
    ],
    technologies: ['Salesforce', 'Experience Cloud', 'Lightning Web Components', 'Apex'],
    completion_date: '2023-08-15',
    status: 'Completed'
  },
  {
    id: 'PBI-2024-089',
    title: 'Localize Product Categories',
    description: 'Implement multi-language support for product category labels',
    tags: ['localization', 'labels', 'multi-language', 'ui'],
    estimated_effort: 2,
    actual_effort: 2,
    learnings: [
      'Used Custom Labels for multi-language support',
      'Created translation spreadsheet workflow for business users',
      '2 points, completed in 1 day',
      'Reusable pattern for future localization needs'
    ],
    technologies: ['Salesforce', 'Custom Labels', 'Translation Workbench'],
    completion_date: '2024-03-10',
    status: 'Completed'
  },
  {
    id: 'PBI-2023-234',
    title: 'Customer Order History Dashboard',
    description: 'Build a dashboard showing customer order history with filters and export',
    tags: ['dashboard', 'orders', 'customer', 'reporting', 'analytics'],
    estimated_effort: 8,
    actual_effort: 12,
    learnings: [
      'Complex permission model required custom sharing rules',
      'Performance optimization needed for large data volumes',
      'Export functionality required scheduled batch job',
      'Users requested real-time updates - implemented push topics'
    ],
    technologies: ['Salesforce', 'Lightning Dashboard', 'SOQL', 'Batch Apex'],
    completion_date: '2023-11-20',
    status: 'Completed'
  },
  {
    id: 'PBI-2024-045',
    title: 'B2B User Permission Framework',
    description: 'Implement role-based access control for B2B commerce users',
    tags: ['b2b', 'permissions', 'security', 'access-control', 'gdpr'],
    estimated_effort: 5,
    actual_effort: 8,
    learnings: [
      'GDPR compliance added complexity to permission model',
      'Required custom permission sets for each role',
      'Account-based sharing rules were more complex than expected',
      'Legal review added 2 weeks to timeline'
    ],
    technologies: ['Salesforce', 'Permission Sets', 'Sharing Rules', 'Apex'],
    completion_date: '2024-02-28',
    status: 'Completed'
  },
  {
    id: 'PBI-2023-301',
    title: 'API Rate Limit Optimization',
    description: 'Optimize API usage to stay within Salesforce governor limits',
    tags: ['api', 'optimization', 'performance', 'limits', 'caching'],
    estimated_effort: 5,
    actual_effort: 3,
    learnings: [
      'Implemented Redis caching layer reduced API calls by 80%',
      'Batch processing for bulk operations',
      'Async processing for non-critical updates',
      'Platform events for real-time updates without polling'
    ],
    technologies: ['Salesforce', 'Redis', 'Platform Events', 'Queueable Apex'],
    completion_date: '2023-09-30',
    status: 'Completed'
  },
  {
    id: 'PBI-2024-112',
    title: 'Order Status Workflow Automation',
    description: 'Automate order status updates based on external system events',
    tags: ['orders', 'workflow', 'automation', 'integration', 'status'],
    estimated_effort: 8,
    actual_effort: 10,
    learnings: [
      'Platform events provided reliable event-driven architecture',
      'Error handling and retry logic was critical',
      'Status mapping between systems required business rules engine',
      'Monitoring and alerting essential for production'
    ],
    technologies: ['Salesforce', 'Platform Events', 'Flow', 'Apex Triggers'],
    completion_date: '2024-04-15',
    status: 'Completed'
  },
  {
    id: 'PBI-2023-198',
    title: 'Customer Portal SSO Integration',
    description: 'Implement Single Sign-On for customer portal using SAML',
    tags: ['sso', 'portal', 'authentication', 'saml', 'security'],
    estimated_effort: 5,
    actual_effort: 7,
    learnings: [
      'SAML configuration required multiple iterations with identity provider',
      'Just-in-time provisioning simplified user management',
      'Custom login flow for better user experience',
      'Session timeout settings needed careful tuning'
    ],
    technologies: ['Salesforce', 'SAML', 'SSO', 'Identity Provider'],
    completion_date: '2023-07-22',
    status: 'Completed'
  }
];

export function searchDevOpsPBIs(keywords: string[]): MockPBI[] {
  // Simple keyword matching for POC
  return mockDevOpsPBIs.filter(pbi => {
    const searchText = `${pbi.title} ${pbi.description} ${pbi.tags.join(' ')} ${pbi.technologies.join(' ')}`.toLowerCase();
    return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
  });
}