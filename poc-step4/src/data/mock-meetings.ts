import { MockMeeting } from '../types';

// Mock meeting transcripts with decisions
export const mockMeetingTranscripts: MockMeeting[] = [
  {
    id: 'Meeting-2024-10-15',
    title: 'Q4 Architecture Review',
    date: '2024-10-15',
    participants: ['John (CTO)', 'Maria (Security Architect)', 'Alex (Solution Architect)', 'Sarah (Product Manager)'],
    decisions: [
      {
        decision: 'Standardize on Experience Cloud for all customer portals',
        rationale: 'Consolidate licenses and expertise, reduce maintenance overhead',
        constraints: 'Current license pool: 500 login-based licenses',
        assigned_architect: 'Alex'
      },
      {
        decision: 'Implement caching layer for all external APIs',
        rationale: 'Reduce API consumption by 70%, improve performance',
        constraints: 'Redis cluster with 16GB memory allocation'
      }
    ],
    action_items: [
      'Alex to create portal implementation template',
      'Maria to review security requirements for external users',
      'IT to provision Redis cluster by Q4 end'
    ],
    topics: ['portal', 'architecture', 'experience-cloud', 'caching', 'api']
  },
  {
    id: 'Meeting-2024-09-20',
    title: 'GDPR Compliance Review',
    date: '2024-09-20',
    participants: ['Legal Team', 'Maria (Security)', 'Development Team'],
    decisions: [
      {
        decision: 'B2B users can see company data only with explicit permission model',
        rationale: 'Legal requirement for data isolation and GDPR compliance',
        assigned_architect: 'Maria (Security)'
      },
      {
        decision: 'Implement audit trail for all data access',
        rationale: 'Compliance requirement for data processing accountability'
      }
    ],
    action_items: [
      'Update all sharing rules to account-based model',
      'Implement field-level audit trail',
      'Create data retention policy document'
    ],
    topics: ['gdpr', 'compliance', 'security', 'b2b', 'permissions', 'audit']
  },
  {
    id: 'Meeting-2024-11-01',
    title: 'Sprint Planning - Customer Experience',
    date: '2024-11-01',
    participants: ['Product Team', 'Development Team', 'UX Team'],
    decisions: [
      {
        decision: 'Prioritize customer-facing improvements for Q1',
        rationale: 'Customer satisfaction scores below target',
        constraints: 'Limited to 3 sprints of effort'
      },
      {
        decision: 'Use existing UX guidelines for all UI changes',
        rationale: 'Maintain consistency across platform'
      }
    ],
    action_items: [
      'UX team to provide updated style guide',
      'Create customer journey mapping',
      'Define success metrics for improvements'
    ],
    topics: ['customer', 'ux', 'portal', 'experience', 'ui']
  },
  {
    id: 'Meeting-2024-08-12',
    title: 'Technical Debt Review',
    date: '2024-08-12',
    participants: ['Engineering Team', 'Architecture Team'],
    decisions: [
      {
        decision: 'Allocate 20% of sprint capacity to technical debt',
        rationale: 'Accumulated debt impacting delivery velocity'
      },
      {
        decision: 'Refactor order processing module first',
        rationale: 'Highest impact on system performance',
        assigned_architect: 'Senior Engineer Team'
      }
    ],
    action_items: [
      'Create technical debt backlog',
      'Estimate refactoring efforts',
      'Define quality metrics'
    ],
    topics: ['technical-debt', 'refactoring', 'orders', 'performance']
  },
  {
    id: 'Meeting-2024-07-18',
    title: 'API Strategy Session',
    date: '2024-07-18',
    participants: ['API Team', 'Architecture Team', 'Product Managers'],
    decisions: [
      {
        decision: 'Move to event-driven architecture for real-time updates',
        rationale: 'Reduce API polling and improve real-time capabilities',
        constraints: 'Platform Events limit: 250,000 per day'
      },
      {
        decision: 'Implement API gateway for external consumers',
        rationale: 'Centralized rate limiting and monitoring'
      }
    ],
    action_items: [
      'POC for Platform Events implementation',
      'Define event schemas',
      'Create API governance documentation'
    ],
    topics: ['api', 'events', 'real-time', 'platform-events', 'integration']
  },
  {
    id: 'Meeting-2024-06-25',
    title: 'License Optimization Workshop',
    date: '2024-06-25',
    participants: ['Finance', 'IT', 'Product Managers'],
    decisions: [
      {
        decision: 'Reduce Experience Cloud licenses from 750 to 500',
        rationale: 'Cost optimization based on actual usage patterns',
        constraints: 'Must maintain 20% buffer for growth'
      },
      {
        decision: 'Implement license monitoring dashboard',
        rationale: 'Proactive management of license allocation'
      }
    ],
    action_items: [
      'Create monthly license usage report',
      'Identify inactive users for cleanup',
      'Negotiate new contract terms'
    ],
    topics: ['licenses', 'costs', 'experience-cloud', 'optimization']
  }
];

export function searchMeetingTranscripts(keywords: string[]): MockMeeting[] {
  // Simple keyword matching for POC
  return mockMeetingTranscripts.filter(meeting => {
    const searchText = `${meeting.title} ${meeting.topics.join(' ')} ${meeting.decisions.map(d => d.decision + ' ' + d.rationale).join(' ')}`.toLowerCase();
    return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
  });
}