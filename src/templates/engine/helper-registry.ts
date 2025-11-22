/**
 * Handlebars Helper Registry
 *
 * Manages built-in and custom Handlebars helper functions
 */

import Handlebars from 'handlebars';

export type HelperFunction = (...args: any[]) => any;

export class HelperRegistry {
  private helpers: Map<string, HelperFunction>;

  constructor() {
    this.helpers = new Map();
    this.registerBuiltInHelpers();
  }

  /**
   * Register all built-in helpers
   */
  private registerBuiltInHelpers(): void {
    // String manipulation
    this.register('uppercase', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : str;
    });

    this.register('lowercase', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : str;
    });

    this.register('truncate', (str: string, length: number, suffix = '...') => {
      if (typeof str !== 'string') return str;
      if (str.length <= length) return str;
      return str.substring(0, length) + suffix;
    });

    this.register('capitalize', (str: string) => {
      if (typeof str !== 'string') return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Date formatting
    this.register('formatDate', (date: string | Date, format = 'YYYY-MM-DD') => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!(d instanceof Date) || isNaN(d.getTime())) {
        return date;
      }

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes);
    });

    // Number formatting
    this.register('round', (num: number, decimals = 0) => {
      if (typeof num !== 'number') return num;
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    });

    this.register('percentage', (num: number, decimals = 0) => {
      if (typeof num !== 'number') return num;
      return `${this.helpers.get('round')!(num, decimals)}%`;
    });

    // Array operations
    this.register('join', (array: any[], separator = ', ') => {
      if (!Array.isArray(array)) return array;
      return array.join(separator);
    });

    this.register('length', (array: any) => {
      if (Array.isArray(array)) return array.length;
      if (typeof array === 'string') return array.length;
      if (typeof array === 'object' && array !== null) return Object.keys(array).length;
      return 0;
    });

    this.register('first', (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return null;
      return array[0];
    });

    this.register('last', (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return null;
      return array[array.length - 1];
    });

    // Math helpers
    this.register('add', (a: number, b: number) => {
      return (a || 0) + (b || 0);
    });

    this.register('subtract', (a: number, b: number) => {
      return (a || 0) - (b || 0);
    });

    this.register('multiply', (a: number, b: number) => {
      return (a || 0) * (b || 0);
    });

    this.register('divide', (a: number, b: number) => {
      if (!b) return 0;
      return a / b;
    });

    // Conditional helpers
    this.register('eq', (a: any, b: any) => {
      return a === b;
    });

    this.register('ne', (a: any, b: any) => {
      return a !== b;
    });

    this.register('gt', (a: any, b: any) => {
      return a > b;
    });

    this.register('gte', (a: any, b: any) => {
      return a >= b;
    });

    this.register('lt', (a: any, b: any) => {
      return a < b;
    });

    this.register('lte', (a: any, b: any) => {
      return a <= b;
    });

    this.register('and', (...args: any[]) => {
      // Remove options object (last argument in Handlebars)
      const values = args.slice(0, -1);
      return values.every((v) => !!v);
    });

    this.register('or', (...args: any[]) => {
      // Remove options object (last argument in Handlebars)
      const values = args.slice(0, -1);
      return values.some((v) => !!v);
    });

    this.register('not', (value: any) => {
      return !value;
    });

    // PBI-specific helpers
    this.register('riskIcon', (severity: string) => {
      const icons: Record<string, string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      };
      return icons[severity?.toLowerCase()] || '⚪';
    });

    this.register('readinessIcon', (status: string) => {
      const icons: Record<string, string> = {
        'READY FOR SPRINT': '✅',
        'NOT READY': '❌',
        'NEEDS REFINEMENT': '🟡',
        DEFERRED: '⏸️',
        'FUTURE PHASE': '🔮',
      };
      return icons[status] || '⚪';
    });

    this.register('scoreColor', (score: number) => {
      if (score >= 90) return '🟢';
      if (score >= 75) return '🟡';
      if (score >= 60) return '🟠';
      return '🔴';
    });

    // DevOps-specific helpers
    this.register('devopsState', (readiness: any) => {
      if (readiness.sprint_ready) {
        return 'Committed';
      } else if (readiness.readiness_score >= 60) {
        return 'Approved';
      } else {
        return 'New';
      }
    });

    this.register('devopsPriority', (readiness: any) => {
      const score = readiness.readiness_score;
      if (score >= 85) return 1;
      if (score >= 60) return 2;
      return 3;
    });

    this.register('devopsPriorityNumber', (readiness: any) => {
      const score = readiness.readiness_score;
      if (score >= 85) return 1;
      if (score >= 60) return 2;
      return 3;
    });

    this.register('devopsTags', (pbi: any) => {
      const tags: string[] = [];

      // Readiness tag
      if (pbi.readiness.sprint_ready) {
        tags.push('ready-for-sprint');
      } else if (pbi.readiness.readiness_score >= 60) {
        tags.push('needs-refinement');
      } else {
        tags.push('not-ready');
      }

      // Blocker tag
      if (pbi.readiness.blocking_issues && pbi.readiness.blocking_issues.length > 0) {
        tags.push('has-blockers');
      }

      // Risk level tag
      if (pbi.risks) {
        tags.push(`risk-${pbi.risks.overall_risk_level}`);
      }

      return tags.join('; ');
    });

    // Confluence-specific helpers
    this.register('confluenceRiskColor', (severity: string) => {
      const colors: Record<string, string> = {
        critical: '#ff0000',
        high: '#ff6600',
        medium: '#ff9900',
        low: '#00aa00',
      };
      return colors[severity?.toLowerCase()] || '#666666';
    });

    this.register('confluenceStatusPanel', (readiness: any) => {
      let panelColor = '#ff0000'; // red for not ready
      let bgColor = '#fff5f5';

      if (readiness.sprint_ready) {
        panelColor = '#00aa00';
        bgColor = '#f0fff0';
      } else if (readiness.readiness_score >= 60) {
        panelColor = '#ff9900';
        bgColor = '#fffef5';
      }

      return { panelColor, bgColor };
    });

    this.register('confluenceStatusIcon', (readiness: any) => {
      if (readiness.sprint_ready) {
        return '(/) READY';
      } else if (readiness.readiness_score >= 60) {
        return '(!) NEEDS REFINEMENT';
      } else {
        return '(x) NOT READY';
      }
    });

    this.register('checklistItem', (checked: boolean, text: string) => {
      const checkbox = checked ? '[x]' : '[ ]';
      return `- ${checkbox} ${text}`;
    });

    this.register('effortHours', (minutes: number) => {
      if (typeof minutes !== 'number') return minutes;
      if (minutes < 60) return `${minutes} minutes`;
      const hours = Math.round((minutes / 60) * 10) / 10;
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    });

    // Markdown helpers
    this.register('markdown', (level: number, text: string) => {
      const hashes = '#'.repeat(Math.max(1, Math.min(6, level)));
      return `${hashes} ${text}`;
    });

    this.register('link', (text: string, url: string) => {
      return `[${text}](${url})`;
    });

    this.register('code', (text: string, lang = '') => {
      return `\`\`\`${lang}\n${text}\n\`\`\``;
    });

    this.register('inlineCode', (text: string) => {
      return `\`${text}\``;
    });

    this.register('bold', (text: string) => {
      return `**${text}**`;
    });

    this.register('italic', (text: string) => {
      return `*${text}*`;
    });

    // JSON helpers
    this.register('json', (obj: any, pretty = false) => {
      try {
        return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
      } catch (e) {
        return String(obj);
      }
    });

    this.register('jsonPretty', (obj: any) => {
      return this.helpers.get('json')!(obj, true);
    });

    // Advanced array helpers
    this.register('filter', (array: any[], ...args: any[]) => {
      if (!Array.isArray(array)) return [];

      // Remove options object (last argument in Handlebars)
      const filterArgs = args.slice(0, -1);

      // If no filter args, return original array
      if (filterArgs.length === 0) return array;

      // Filter by property values
      return array.filter((item) => {
        // Check all filter conditions (property: value pairs)
        for (let i = 0; i < filterArgs.length; i += 2) {
          const prop = filterArgs[i];
          const value = filterArgs[i + 1];

          if (item[prop] !== value) {
            return false;
          }
        }
        return true;
      });
    });

    this.register('map', (array: any[], ...args: any[]) => {
      if (!Array.isArray(array)) return [];

      // Remove options object (last argument in Handlebars)
      const mapArgs = args.slice(0, -1);

      // If no map args, return original array
      if (mapArgs.length === 0) return array;

      // Map to extract property values (tries each property in order until one exists)
      return array.map((item) => {
        for (const prop of mapArgs) {
          if (item[prop] !== undefined && item[prop] !== null) {
            return item[prop];
          }
        }
        return '';
      });
    });
  }

  /**
   * Register a custom helper
   */
  register(name: string, fn: HelperFunction): void {
    this.helpers.set(name, fn);
  }

  /**
   * Register multiple helpers at once
   */
  registerMany(helpers: Record<string, HelperFunction>): void {
    Object.entries(helpers).forEach(([name, fn]) => {
      this.register(name, fn);
    });
  }

  /**
   * Get a helper function
   */
  get(name: string): HelperFunction | undefined {
    return this.helpers.get(name);
  }

  /**
   * Check if a helper exists
   */
  has(name: string): boolean {
    return this.helpers.has(name);
  }

  /**
   * Get all helper names
   */
  list(): string[] {
    return Array.from(this.helpers.keys()).sort();
  }

  /**
   * Register all helpers with a Handlebars instance
   */
  registerWithHandlebars(handlebars: typeof Handlebars): void {
    this.helpers.forEach((fn, name) => {
      handlebars.registerHelper(name, fn);
    });
  }
}
