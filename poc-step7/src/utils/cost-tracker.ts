import { config } from '../config/app.config';
import { logCost, logInfo } from './logger';
import fs from 'fs';
import path from 'path';

export interface CostEntry {
  timestamp: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  model: string;
}

class CostTracker {
  private entries: CostEntry[] = [];
  private totalCost = 0;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  trackUsage(operation: string, inputTokens: number, outputTokens: number): number {
    const costUsd = this.calculateCost(inputTokens, outputTokens);

    const entry: CostEntry = {
      timestamp: new Date().toISOString(),
      operation,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      model: config.claude.model
    };

    this.entries.push(entry);
    this.totalCost += costUsd;
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;

    logCost(inputTokens, outputTokens, costUsd);

    return costUsd;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * config.pricing.inputTokensPerMillion;
    const outputCost = (outputTokens / 1_000_000) * config.pricing.outputTokensPerMillion;
    return inputCost + outputCost;
  }

  getTotalCost(): number {
    return this.totalCost;
  }

  getTotalInputTokens(): number {
    return this.totalInputTokens;
  }

  getTotalOutputTokens(): number {
    return this.totalOutputTokens;
  }

  getEntries(): CostEntry[] {
    return this.entries;
  }

  getSummary() {
    return {
      total_cost_usd: this.totalCost,
      total_input_tokens: this.totalInputTokens,
      total_output_tokens: this.totalOutputTokens,
      total_tokens: this.totalInputTokens + this.totalOutputTokens,
      api_calls: this.entries.length,
      model: config.claude.model,
      average_cost_per_call: this.entries.length > 0 ? this.totalCost / this.entries.length : 0
    };
  }

  async saveToFile(outputDir: string): Promise<void> {
    const costsDir = path.join(outputDir, 'costs');

    if (!fs.existsSync(costsDir)) {
      fs.mkdirSync(costsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cost-tracking-${timestamp}.json`;
    const filepath = path.join(costsDir, filename);

    const data = {
      summary: this.getSummary(),
      entries: this.entries,
      generated_at: new Date().toISOString()
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    logInfo(`Cost tracking saved to ${filepath}`);

    // Also append to CSV history file
    await this.appendToCsvHistory(costsDir);
  }

  private async appendToCsvHistory(costsDir: string): Promise<void> {
    const csvPath = path.join(costsDir, 'cost-history.csv');
    const summary = this.getSummary();

    const csvLine = [
      new Date().toISOString(),
      config.claude.model,
      summary.api_calls,
      summary.total_input_tokens,
      summary.total_output_tokens,
      summary.total_tokens,
      summary.total_cost_usd.toFixed(6),
      summary.average_cost_per_call.toFixed(6)
    ].join(',');

    // Create CSV with headers if it doesn't exist
    if (!fs.existsSync(csvPath)) {
      const headers = 'timestamp,model,api_calls,input_tokens,output_tokens,total_tokens,total_cost_usd,avg_cost_per_call';
      fs.writeFileSync(csvPath, headers + '\n');
    }

    fs.appendFileSync(csvPath, csvLine + '\n');
  }

  logSummary(): void {
    const summary = this.getSummary();
    logInfo('\n' + '='.repeat(80));
    logInfo('API COST SUMMARY');
    logInfo('='.repeat(80));
    logInfo(`Total API Calls:       ${summary.api_calls}`);
    logInfo(`Total Input Tokens:    ${summary.total_input_tokens.toLocaleString()}`);
    logInfo(`Total Output Tokens:   ${summary.total_output_tokens.toLocaleString()}`);
    logInfo(`Total Tokens:          ${summary.total_tokens.toLocaleString()}`);
    logInfo(`Total Cost (USD):      $${summary.total_cost_usd.toFixed(6)}`);
    logInfo(`Avg Cost per Call:     $${summary.average_cost_per_call.toFixed(6)}`);
    logInfo(`Model:                 ${summary.model}`);
    logInfo('='.repeat(80) + '\n');
  }
}

export const costTracker = new CostTracker();
