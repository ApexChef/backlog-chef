/**
 * Stakeholder Router Service
 * Routes questions to appropriate stakeholders based on category and priority
 */

import {
  Question,
  Stakeholder,
  StakeholderRegistry,
  Priority,
  QuestionCategory
} from '../types';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { appConfig } from '../config/app.config';
import { Validators } from '../utils/validators';

export class StakeholderRouter {
  private registry: StakeholderRegistry | null = null;

  /**
   * Load stakeholder registry from YAML file
   */
  async loadRegistry(): Promise<void> {
    logger.info('Loading stakeholder registry...');

    try {
      const fileContent = await fs.readFile(appConfig.stakeholderRegistryFile, 'utf-8');
      const parsedYaml = yaml.load(fileContent) as any;

      this.registry = Validators.validateStakeholderRegistry(parsedYaml);
      logger.success(`Loaded ${this.registry.roles.length} stakeholder roles`);
    } catch (error) {
      logger.error('Failed to load stakeholder registry', error);
      throw new Error(`Failed to load stakeholder registry: ${error}`);
    }
  }

  /**
   * Route questions to appropriate stakeholders
   */
  async routeQuestions(questions: Question[]): Promise<Question[]> {
    if (!this.registry) {
      await this.loadRegistry();
    }

    logger.info(`Routing ${questions.length} questions to stakeholders`);

    const routedQuestions = questions.map(question => {
      const stakeholders = this.identifyStakeholders(question);
      return {
        ...question,
        stakeholders
      };
    });

    // Log routing summary
    const uniqueStakeholders = new Set<string>();
    routedQuestions.forEach(q => {
      q.stakeholders.forEach(s => uniqueStakeholders.add(s.email));
    });

    logger.success(
      `Routed questions to ${uniqueStakeholders.size} unique stakeholders`
    );

    return routedQuestions;
  }

  /**
   * Identify stakeholders for a specific question
   */
  private identifyStakeholders(question: Question): Stakeholder[] {
    if (!this.registry) {
      logger.warn('Registry not loaded, returning empty stakeholders');
      return [];
    }

    const stakeholders: Stakeholder[] = [];
    const addedEmails = new Set<string>();

    // First, check category-based routing
    const categoryStakeholders = this.getStakeholdersByCategory(question.category);
    categoryStakeholders.forEach(s => {
      if (!addedEmails.has(s.email)) {
        stakeholders.push(s);
        addedEmails.add(s.email);
      }
    });

    // Add escalation-based stakeholders for critical questions
    if (question.priority === 'CRITICAL') {
      const escalationStakeholders = this.getEscalationStakeholders('CRITICAL');
      escalationStakeholders.forEach(s => {
        if (!addedEmails.has(s.email)) {
          stakeholders.push(s);
          addedEmails.add(s.email);
        }
      });
    }

    // If no stakeholders found, add default (Product Owner)
    if (stakeholders.length === 0) {
      const defaultStakeholder = this.getDefaultStakeholder();
      if (defaultStakeholder) {
        stakeholders.push(defaultStakeholder);
      }
    }

    logger.debug(
      `Routed question "${question.id}" to ${stakeholders.length} stakeholders`
    );

    return stakeholders;
  }

  /**
   * Get stakeholders based on question category
   */
  private getStakeholdersByCategory(category: string): Stakeholder[] {
    if (!this.registry) return [];

    const stakeholders: Stakeholder[] = [];

    // Handle compound categories (e.g., "Business/Security")
    const categories = category.split('/').map(c => c.trim());

    categories.forEach(cat => {
      // Find role IDs for this category
      const roleIds = this.registry!.domain_mapping[cat] || [];

      roleIds.forEach(roleId => {
        const role = this.registry!.roles.find(r => r.id === roleId);
        if (role) {
          stakeholders.push({
            role: role.title,
            name: role.default_assignee.name,
            email: role.default_assignee.email
          });
        }
      });
    });

    return stakeholders;
  }

  /**
   * Get escalation stakeholders based on priority
   */
  private getEscalationStakeholders(priority: Priority): Stakeholder[] {
    if (!this.registry) return [];

    const stakeholders: Stakeholder[] = [];
    const roleIds = this.registry.escalation_rules[priority] || [];

    roleIds.forEach(roleId => {
      const role = this.registry!.roles.find(r => r.id === roleId);
      if (role) {
        stakeholders.push({
          role: role.title,
          name: role.default_assignee.name,
          email: role.default_assignee.email
        });
      }
    });

    return stakeholders;
  }

  /**
   * Get default stakeholder (Product Owner)
   */
  private getDefaultStakeholder(): Stakeholder | null {
    if (!this.registry) return null;

    const productOwner = this.registry.roles.find(r => r.id === 'product_owner');
    if (productOwner) {
      return {
        role: productOwner.title,
        name: productOwner.default_assignee.name,
        email: productOwner.default_assignee.email
      };
    }

    return null;
  }

  /**
   * Get all unique stakeholders from routed questions
   */
  static getUniqueStakeholders(questions: Question[]): string[] {
    const uniqueEmails = new Set<string>();

    questions.forEach(question => {
      question.stakeholders.forEach(stakeholder => {
        uniqueEmails.add(stakeholder.email);
      });
    });

    return Array.from(uniqueEmails);
  }

  /**
   * Generate stakeholder summary
   */
  static generateStakeholderSummary(questions: Question[]): Record<string, number> {
    const summary: Record<string, number> = {};

    questions.forEach(question => {
      question.stakeholders.forEach(stakeholder => {
        const key = `${stakeholder.name} (${stakeholder.role})`;
        summary[key] = (summary[key] || 0) + 1;
      });
    });

    return summary;
  }
}