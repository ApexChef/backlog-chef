/**
 * Input Validation Utilities
 */

import { RiskAnalysisInput, StakeholderRegistry, Priority, QuestionCategory } from '../types';
import { logger } from './logger';

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Validators {
  /**
   * Validate risk analysis input from Step 5
   */
  static validateRiskAnalysisInput(input: any): RiskAnalysisInput {
    logger.debug('Validating risk analysis input');

    if (!input || typeof input !== 'object') {
      throw new ValidationError('Invalid input: must be an object');
    }

    if (!Array.isArray(input.risk_analysis)) {
      throw new ValidationError('Invalid input: risk_analysis must be an array');
    }

    if (!input.metadata || typeof input.metadata !== 'object') {
      throw new ValidationError('Invalid input: metadata must be an object');
    }

    // Validate each PBI
    input.risk_analysis.forEach((pbi: any, index: number) => {
      if (!pbi.id) {
        throw new ValidationError(`PBI at index ${index} missing required field: id`);
      }

      if (!pbi.title) {
        throw new ValidationError(`PBI ${pbi.id} missing required field: title`);
      }

      if (!pbi.risks || typeof pbi.risks !== 'object') {
        throw new ValidationError(`PBI ${pbi.id} missing required field: risks`);
      }

      // Validate risk structure
      const requiredRiskLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      requiredRiskLevels.forEach(level => {
        if (!Array.isArray(pbi.risks[level])) {
          throw new ValidationError(
            `PBI ${pbi.id} risks.${level} must be an array`
          );
        }
      });
    });

    logger.debug('Risk analysis input validation successful');
    return input as RiskAnalysisInput;
  }

  /**
   * Validate stakeholder registry
   */
  static validateStakeholderRegistry(registry: any): StakeholderRegistry {
    logger.debug('Validating stakeholder registry');

    if (!registry || typeof registry !== 'object') {
      throw new ValidationError('Invalid registry: must be an object');
    }

    if (!Array.isArray(registry.roles)) {
      throw new ValidationError('Invalid registry: roles must be an array');
    }

    // Validate each role
    registry.roles.forEach((role: any, index: number) => {
      if (!role.id) {
        throw new ValidationError(`Role at index ${index} missing required field: id`);
      }

      if (!role.title) {
        throw new ValidationError(`Role ${role.id} missing required field: title`);
      }

      if (!Array.isArray(role.domains)) {
        throw new ValidationError(`Role ${role.id} domains must be an array`);
      }

      if (!role.default_assignee || !role.default_assignee.name || !role.default_assignee.email) {
        throw new ValidationError(`Role ${role.id} missing valid default_assignee`);
      }

      // Validate email format
      if (!this.isValidEmail(role.default_assignee.email)) {
        throw new ValidationError(
          `Role ${role.id} default_assignee has invalid email: ${role.default_assignee.email}`
        );
      }

      if (role.backup_assignee && !this.isValidEmail(role.backup_assignee.email)) {
        throw new ValidationError(
          `Role ${role.id} backup_assignee has invalid email: ${role.backup_assignee.email}`
        );
      }
    });

    if (!registry.domain_mapping || typeof registry.domain_mapping !== 'object') {
      throw new ValidationError('Invalid registry: domain_mapping must be an object');
    }

    if (!registry.escalation_rules || typeof registry.escalation_rules !== 'object') {
      throw new ValidationError('Invalid registry: escalation_rules must be an object');
    }

    logger.debug('Stakeholder registry validation successful');
    return registry as StakeholderRegistry;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate priority value
   */
  static isValidPriority(priority: string): priority is Priority {
    return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priority);
  }

  /**
   * Validate question category
   */
  static isValidCategory(category: string): boolean {
    const validCategories = [
      'Business',
      'Technical',
      'Security',
      'UX',
      'UI',
      'Data',
      'Performance',
      'Testing',
      'Legal',
      'GDPR',
      'Compliance',
      'Budget',
      'Salesforce',
      'Integration',
      'Logistics',
      'Process',
      'Architecture'
    ];

    // Allow single categories
    if (validCategories.includes(category)) {
      return true;
    }

    // Allow compound categories (e.g., "Business/Security")
    const parts = category.split('/');
    return parts.length === 2 &&
           parts.every(part => validCategories.includes(part.trim()));
  }

  /**
   * Sanitize string for safe processing
   */
  static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove control characters and excessive whitespace
    return input
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Validate JSON structure
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Validate file path exists
   */
  static async fileExists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}