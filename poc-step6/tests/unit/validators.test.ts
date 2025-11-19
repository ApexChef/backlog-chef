/**
 * Unit tests for validators
 */

import { Validators, ValidationError } from '../../src/utils/validators';

describe('Validators', () => {
  describe('validateRiskAnalysisInput', () => {
    it('should validate correct risk analysis input', () => {
      const validInput = {
        risk_analysis: [
          {
            id: 'PBI-001',
            title: 'Test PBI',
            risks: {
              CRITICAL: [],
              HIGH: [],
              MEDIUM: [],
              LOW: []
            },
            conflicts: [],
            complexity_score: 5,
            recommended_split: false,
            analysis_confidence: 0.8,
            analyzed_at: '2024-01-01T00:00:00Z'
          }
        ],
        metadata: {
          analyzed_at: '2024-01-01T00:00:00Z',
          total_analyzed: 1
        }
      };

      expect(() => Validators.validateRiskAnalysisInput(validInput)).not.toThrow();
    });

    it('should throw error for missing risk_analysis array', () => {
      const invalidInput = {
        metadata: {}
      };

      expect(() => Validators.validateRiskAnalysisInput(invalidInput)).toThrow(
        'Invalid input: risk_analysis must be an array'
      );
    });

    it('should throw error for PBI missing required fields', () => {
      const invalidInput = {
        risk_analysis: [
          {
            title: 'Test PBI' // missing id
          }
        ],
        metadata: {}
      };

      expect(() => Validators.validateRiskAnalysisInput(invalidInput)).toThrow(
        'PBI at index 0 missing required field: id'
      );
    });
  });

  describe('validateStakeholderRegistry', () => {
    it('should validate correct stakeholder registry', () => {
      const validRegistry = {
        roles: [
          {
            id: 'product_owner',
            title: 'Product Owner',
            domains: ['Business'],
            default_assignee: {
              name: 'John Doe',
              email: 'john@example.com'
            }
          }
        ],
        domain_mapping: {
          Business: ['product_owner']
        },
        escalation_rules: {
          CRITICAL: ['product_owner']
        }
      };

      expect(() => Validators.validateStakeholderRegistry(validRegistry)).not.toThrow();
    });

    it('should throw error for invalid email format', () => {
      const invalidRegistry = {
        roles: [
          {
            id: 'product_owner',
            title: 'Product Owner',
            domains: ['Business'],
            default_assignee: {
              name: 'John Doe',
              email: 'invalid-email' // invalid email
            }
          }
        ],
        domain_mapping: {},
        escalation_rules: {}
      };

      expect(() => Validators.validateStakeholderRegistry(invalidRegistry)).toThrow(
        /invalid email/i
      );
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(Validators.isValidEmail('user@example.com')).toBe(true);
      expect(Validators.isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(Validators.isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(Validators.isValidEmail('invalid')).toBe(false);
      expect(Validators.isValidEmail('@example.com')).toBe(false);
      expect(Validators.isValidEmail('user@')).toBe(false);
      expect(Validators.isValidEmail('user@.com')).toBe(false);
    });
  });

  describe('isValidPriority', () => {
    it('should validate correct priority values', () => {
      expect(Validators.isValidPriority('CRITICAL')).toBe(true);
      expect(Validators.isValidPriority('HIGH')).toBe(true);
      expect(Validators.isValidPriority('MEDIUM')).toBe(true);
      expect(Validators.isValidPriority('LOW')).toBe(true);
    });

    it('should reject invalid priority values', () => {
      expect(Validators.isValidPriority('URGENT')).toBe(false);
      expect(Validators.isValidPriority('critical')).toBe(false);
      expect(Validators.isValidPriority('')).toBe(false);
    });
  });

  describe('isValidCategory', () => {
    it('should validate single categories', () => {
      expect(Validators.isValidCategory('Business')).toBe(true);
      expect(Validators.isValidCategory('Technical')).toBe(true);
      expect(Validators.isValidCategory('Security')).toBe(true);
    });

    it('should validate compound categories', () => {
      expect(Validators.isValidCategory('Business/Security')).toBe(true);
      expect(Validators.isValidCategory('Technical/Performance')).toBe(true);
    });

    it('should reject invalid categories', () => {
      expect(Validators.isValidCategory('InvalidCategory')).toBe(false);
      expect(Validators.isValidCategory('Business/Technical/Security')).toBe(false);
      expect(Validators.isValidCategory('Business/')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00World\x1F';
      expect(Validators.sanitizeString(input)).toBe('HelloWorld');
    });

    it('should normalize whitespace', () => {
      const input = 'Hello    World\n\t  Test';
      expect(Validators.sanitizeString(input)).toBe('Hello World Test');
    });

    it('should handle empty or invalid input', () => {
      expect(Validators.sanitizeString('')).toBe('');
      expect(Validators.sanitizeString(null as any)).toBe('');
      expect(Validators.sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('isValidJSON', () => {
    it('should validate correct JSON', () => {
      expect(Validators.isValidJSON('{"key": "value"}')).toBe(true);
      expect(Validators.isValidJSON('[]')).toBe(true);
      expect(Validators.isValidJSON('"string"')).toBe(true);
    });

    it('should reject invalid JSON', () => {
      expect(Validators.isValidJSON('{key: value}')).toBe(false);
      expect(Validators.isValidJSON('undefined')).toBe(false);
      expect(Validators.isValidJSON('')).toBe(false);
    });
  });
});