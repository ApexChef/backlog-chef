/**
 * Cost Tracker - Monitor and enforce API cost limits
 *
 * Tracks costs across all AI provider usage with:
 * - Daily spending limits
 * - Per-run spending limits
 * - Alert thresholds
 * - Detailed cost breakdown by provider
 */

import { AIResponse } from '../providers/base';
import { logInfo, logWarn, logError } from '../../utils/logger';

/**
 * Cost management configuration
 */
export interface CostManagementConfig {
  daily_limit_usd?: number;
  per_run_limit_usd?: number;
  alert_threshold_usd?: number;
}

/**
 * Cost statistics
 */
export interface CostStatistics {
  total_cost_usd: number;
  total_requests: number;
  cost_by_provider: Record<string, number>;
  requests_by_provider: Record<string, number>;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  average_cost_per_request: number;
  started_at: string;
  duration_ms: number;
}

/**
 * Cost tracker class
 */
export class CostTracker {
  private config: CostManagementConfig;
  private totalCostUSD = 0;
  private costByProvider: Map<string, number> = new Map();
  private requestsByProvider: Map<string, number> = new Map();
  private totalRequests = 0;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private startTime = Date.now();
  private lastAlertTime = 0;
  private alertCooldownMs = 60000; // Only alert once per minute

  constructor(config: CostManagementConfig) {
    this.config = config;
    logInfo('[CostTracker] Initialized with config:', config);
  }

  /**
   * Check if we can afford a request
   * @param estimatedCostUSD Estimated cost in USD
   * @returns true if within limits
   */
  canAfford(estimatedCostUSD: number): boolean {
    const { daily_limit_usd, per_run_limit_usd } = this.config;

    // Check per-run limit
    if (per_run_limit_usd && this.totalCostUSD + estimatedCostUSD > per_run_limit_usd) {
      logError(
        `[CostTracker] Per-run limit exceeded! Current: $${this.totalCostUSD.toFixed(4)}, ` +
          `Estimated: $${estimatedCostUSD.toFixed(4)}, Limit: $${per_run_limit_usd}`
      );
      return false;
    }

    // Check daily limit (simplified - in production, track per calendar day)
    if (daily_limit_usd && this.totalCostUSD + estimatedCostUSD > daily_limit_usd) {
      logError(
        `[CostTracker] Daily limit exceeded! Current: $${this.totalCostUSD.toFixed(4)}, ` +
          `Estimated: $${estimatedCostUSD.toFixed(4)}, Limit: $${daily_limit_usd}`
      );
      return false;
    }

    return true;
  }

  /**
   * Record actual cost from a response
   * @param response AI response with cost information
   */
  record(response: AIResponse): void {
    const { provider, cost, usage } = response;

    // Update totals
    this.totalCostUSD += cost;
    this.totalRequests++;
    this.totalInputTokens += usage.inputTokens;
    this.totalOutputTokens += usage.outputTokens;

    // Update provider-specific tracking
    this.costByProvider.set(provider, (this.costByProvider.get(provider) || 0) + cost);
    this.requestsByProvider.set(provider, (this.requestsByProvider.get(provider) || 0) + 1);

    // Log the cost
    logInfo(
      `[CostTracker] Request recorded: ${provider} - $${cost.toFixed(6)} ` +
        `(${usage.inputTokens} in + ${usage.outputTokens} out tokens)`
    );

    // Check alert threshold
    if (this.config.alert_threshold_usd) {
      this.checkAlertThreshold();
    }

    // Log milestone costs
    this.checkMilestones();
  }

  /**
   * Check if alert threshold has been reached
   * @private
   */
  private checkAlertThreshold(): void {
    const { alert_threshold_usd } = this.config;
    if (!alert_threshold_usd) return;

    // Only alert once per cooldown period
    const now = Date.now();
    if (now - this.lastAlertTime < this.alertCooldownMs) return;

    if (this.totalCostUSD >= alert_threshold_usd) {
      logWarn(
        `[CostTracker] ⚠️  ALERT: Cost threshold reached! ` +
          `Current: $${this.totalCostUSD.toFixed(4)}, Threshold: $${alert_threshold_usd}`
      );
      this.lastAlertTime = now;
    }
  }

  /**
   * Log milestone costs for visibility
   * @private
   */
  private checkMilestones(): void {
    const milestones = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0];

    for (const milestone of milestones) {
      const prevCost = this.totalCostUSD - (this.costByProvider.get('latest') || 0);
      if (prevCost < milestone && this.totalCostUSD >= milestone) {
        logInfo(`[CostTracker] 💰 Milestone reached: $${milestone.toFixed(2)}`);
      }
    }
  }

  /**
   * Get cost statistics
   * @returns Cost statistics object
   */
  getStatistics(): CostStatistics {
    const duration_ms = Date.now() - this.startTime;

    return {
      total_cost_usd: this.totalCostUSD,
      total_requests: this.totalRequests,
      cost_by_provider: Object.fromEntries(this.costByProvider),
      requests_by_provider: Object.fromEntries(this.requestsByProvider),
      total_input_tokens: this.totalInputTokens,
      total_output_tokens: this.totalOutputTokens,
      total_tokens: this.totalInputTokens + this.totalOutputTokens,
      average_cost_per_request:
        this.totalRequests > 0 ? this.totalCostUSD / this.totalRequests : 0,
      started_at: new Date(this.startTime).toISOString(),
      duration_ms,
    };
  }

  /**
   * Reset tracking (e.g., for new run or new day)
   */
  reset(): void {
    logInfo('[CostTracker] Resetting cost tracking');
    this.totalCostUSD = 0;
    this.costByProvider.clear();
    this.requestsByProvider.clear();
    this.totalRequests = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.startTime = Date.now();
    this.lastAlertTime = 0;
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    const stats = this.getStatistics();

    console.log('\n' + '='.repeat(80));
    console.log('AI API COST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Cost:           $${stats.total_cost_usd.toFixed(6)}`);
    console.log(`Total Requests:       ${stats.total_requests}`);
    console.log(`Average Cost/Request: $${stats.average_cost_per_request.toFixed(6)}`);
    console.log(`Total Tokens:         ${stats.total_tokens.toLocaleString()}`);
    console.log(`  Input:              ${stats.total_input_tokens.toLocaleString()}`);
    console.log(`  Output:             ${stats.total_output_tokens.toLocaleString()}`);
    console.log(`Duration:             ${(stats.duration_ms / 1000).toFixed(2)}s`);

    if (Object.keys(stats.cost_by_provider).length > 0) {
      console.log('\nCost by Provider:');
      for (const [provider, cost] of Object.entries(stats.cost_by_provider)) {
        const requests = stats.requests_by_provider[provider] || 0;
        console.log(`  ${provider.padEnd(15)} $${cost.toFixed(6)} (${requests} requests)`);
      }
    }

    // Show limits if configured
    if (this.config.per_run_limit_usd) {
      const percentage = (stats.total_cost_usd / this.config.per_run_limit_usd) * 100;
      console.log(
        `\nPer-Run Limit:        $${this.config.per_run_limit_usd} (${percentage.toFixed(1)}% used)`
      );
    }

    if (this.config.daily_limit_usd) {
      const percentage = (stats.total_cost_usd / this.config.daily_limit_usd) * 100;
      console.log(
        `Daily Limit:          $${this.config.daily_limit_usd} (${percentage.toFixed(1)}% used)`
      );
    }

    console.log('='.repeat(80) + '\n');
  }
}
