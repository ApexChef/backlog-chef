/**
 * Unit tests for Stakeholder Router Service
 */

import { StakeholderRouter } from '../../src/services/stakeholder-router';
import { Question, Priority } from '../../src/types';

describe('StakeholderRouter', () => {
  describe('getUniqueStakeholders', () => {
    it('should extract unique stakeholder emails', () => {
      const questions: Partial<Question>[] = [
        {
          stakeholders: [
            { role: 'Product Owner', name: 'John', email: 'john@example.com' },
            { role: 'Tech Lead', name: 'Jane', email: 'jane@example.com' }
          ]
        },
        {
          stakeholders: [
            { role: 'Product Owner', name: 'John', email: 'john@example.com' },
            { role: 'UX Designer', name: 'Bob', email: 'bob@example.com' }
          ]
        }
      ];

      const uniqueEmails = StakeholderRouter.getUniqueStakeholders(questions as Question[]);

      expect(uniqueEmails).toHaveLength(3);
      expect(uniqueEmails).toContain('john@example.com');
      expect(uniqueEmails).toContain('jane@example.com');
      expect(uniqueEmails).toContain('bob@example.com');
    });

    it('should handle empty questions array', () => {
      const uniqueEmails = StakeholderRouter.getUniqueStakeholders([]);
      expect(uniqueEmails).toHaveLength(0);
    });
  });

  describe('generateStakeholderSummary', () => {
    it('should generate correct stakeholder summary', () => {
      const questions: Partial<Question>[] = [
        {
          stakeholders: [
            { role: 'Product Owner', name: 'John Doe', email: 'john@example.com' }
          ]
        },
        {
          stakeholders: [
            { role: 'Product Owner', name: 'John Doe', email: 'john@example.com' },
            { role: 'Tech Lead', name: 'Jane Smith', email: 'jane@example.com' }
          ]
        },
        {
          stakeholders: [
            { role: 'Tech Lead', name: 'Jane Smith', email: 'jane@example.com' }
          ]
        }
      ];

      const summary = StakeholderRouter.generateStakeholderSummary(questions as Question[]);

      expect(summary['John Doe (Product Owner)']).toBe(2);
      expect(summary['Jane Smith (Tech Lead)']).toBe(2);
    });

    it('should handle questions with no stakeholders', () => {
      const questions: Partial<Question>[] = [
        { stakeholders: [] },
        { stakeholders: [] }
      ];

      const summary = StakeholderRouter.generateStakeholderSummary(questions as Question[]);
      expect(Object.keys(summary)).toHaveLength(0);
    });
  });
});