/**
 * API Cost Tracking Utility
 * Tracks token usage and calculates costs for Claude API calls
 */

import { logger } from './logger';

/**
 * Claude API pricing (as of Nov 2024)
 * https://www.anthropic.com/api
 */
const PRICING = {
  'claude-3-5-haiku-20241022': {
    input: 0.80 / 1_000_000,  // $0.80 per million input tokens
    output: 4.00 / 1_000_000,  // $4.00 per million output tokens
  },
  'claude-3-5-sonnet-20241022': {
    input: 3.00 / 1_000_000,  // $3.00 per million input tokens
    output: 15.00 / 1_000_000, // $15.00 per million output tokens
  },
};

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface CostBreakdown {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
  api_calls: number;
}

export class CostTracker {
  private model: string;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;
  private apiCalls: number = 0;

  constructor(model: string) {
    this.model = model;
  }

  /**
   * Track a single API call's token usage
   */
  trackUsage(usage: TokenUsage): void {
    this.totalInputTokens += usage.input_tokens;
    this.totalOutputTokens += usage.output_tokens;
    this.apiCalls++;

    logger.debug('Token usage tracked', {
      input: usage.input_tokens,
      output: usage.output_tokens,
      cumulative_input: this.totalInputTokens,
      cumulative_output: this.totalOutputTokens,
      calls: this.apiCalls,
    });
  }

  /**
   * Get current cost breakdown
   */
  getCostBreakdown(): CostBreakdown {
    const pricing = PRICING[this.model as keyof typeof PRICING];

    if (!pricing) {
      logger.warn(`No pricing data for model: ${this.model}, using Haiku pricing as fallback`);
      const fallbackPricing = PRICING['claude-3-5-haiku-20241022'];
      return this.calculateCost(fallbackPricing);
    }

    return this.calculateCost(pricing);
  }

  /**
   * Calculate costs based on pricing
   */
  private calculateCost(pricing: { input: number; output: number }): CostBreakdown {
    const inputCost = this.totalInputTokens * pricing.input;
    const outputCost = this.totalOutputTokens * pricing.output;

    return {
      total_input_tokens: this.totalInputTokens,
      total_output_tokens: this.totalOutputTokens,
      total_tokens: this.totalInputTokens + this.totalOutputTokens,
      input_cost_usd: inputCost,
      output_cost_usd: outputCost,
      total_cost_usd: inputCost + outputCost,
      api_calls: this.apiCalls,
    };
  }

  /**
   * Format cost breakdown for display
   */
  formatCostSummary(): string {
    const cost = this.getCostBreakdown();

    const lines = [
      '\n' + '='.repeat(60),
      'API COST SUMMARY',
      '='.repeat(60),
      `Model: ${this.model}`,
      `Total API Calls: ${cost.api_calls}`,
      '',
      'Token Usage:',
      `  Input Tokens:  ${cost.total_input_tokens.toLocaleString()}`,
      `  Output Tokens: ${cost.total_output_tokens.toLocaleString()}`,
      `  Total Tokens:  ${cost.total_tokens.toLocaleString()}`,
      '',
      'Costs (USD):',
      `  Input Cost:    $${cost.input_cost_usd.toFixed(4)}`,
      `  Output Cost:   $${cost.output_cost_usd.toFixed(4)}`,
      `  Total Cost:    $${cost.total_cost_usd.toFixed(4)}`,
      '',
      `Average tokens per call: ${Math.round(cost.total_tokens / cost.api_calls).toLocaleString()}`,
      `Average cost per call:   $${(cost.total_cost_usd / cost.api_calls).toFixed(4)}`,
      '='.repeat(60),
    ];

    return lines.join('\n');
  }

  /**
   * Log cost summary
   */
  logCostSummary(): void {
    const cost = this.getCostBreakdown();
    const summary = this.formatCostSummary();

    console.log(summary);

    // Log detailed cost breakdown to log file
    logger.info('API cost summary', {
      model: this.model,
      api_calls: cost.api_calls,
      token_usage: {
        input_tokens: cost.total_input_tokens,
        output_tokens: cost.total_output_tokens,
        total_tokens: cost.total_tokens,
      },
      costs_usd: {
        input_cost: parseFloat(cost.input_cost_usd.toFixed(4)),
        output_cost: parseFloat(cost.output_cost_usd.toFixed(4)),
        total_cost: parseFloat(cost.total_cost_usd.toFixed(4)),
      },
      averages: {
        tokens_per_call: Math.round(cost.total_tokens / cost.api_calls),
        cost_per_call: parseFloat((cost.total_cost_usd / cost.api_calls).toFixed(4)),
      },
    });
  }

  /**
   * Save cost breakdown to a CSV file for historical tracking
   */
  async saveCostToFile(outputDir: string, runId?: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const cost = this.getCostBreakdown();
    const timestamp = new Date().toISOString();
    const id = runId || timestamp;

    // Create costs directory if it doesn't exist
    const costsDir = path.join(outputDir, 'costs');
    await fs.mkdir(costsDir, { recursive: true });

    // Define CSV file path
    const csvFile = path.join(costsDir, 'cost-history.csv');

    // Check if file exists to determine if we need headers
    let fileExists = false;
    try {
      await fs.access(csvFile);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    // Prepare CSV row
    const row = [
      timestamp,
      id,
      this.model,
      cost.api_calls,
      cost.total_input_tokens,
      cost.total_output_tokens,
      cost.total_tokens,
      cost.input_cost_usd.toFixed(6),
      cost.output_cost_usd.toFixed(6),
      cost.total_cost_usd.toFixed(6),
    ].join(',');

    // Prepare CSV content
    let csvContent = '';
    if (!fileExists) {
      // Add header if file doesn't exist
      const header = [
        'timestamp',
        'run_id',
        'model',
        'api_calls',
        'input_tokens',
        'output_tokens',
        'total_tokens',
        'input_cost_usd',
        'output_cost_usd',
        'total_cost_usd',
      ].join(',');
      csvContent = header + '\n' + row + '\n';
    } else {
      csvContent = row + '\n';
    }

    // Append to file
    await fs.appendFile(csvFile, csvContent, 'utf-8');

    logger.info(`Cost data saved to ${csvFile}`);
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.apiCalls = 0;
  }

  /**
   * Get totals
   */
  getTotals(): { inputTokens: number; outputTokens: number; apiCalls: number } {
    return {
      inputTokens: this.totalInputTokens,
      outputTokens: this.totalOutputTokens,
      apiCalls: this.apiCalls,
    };
  }
}
