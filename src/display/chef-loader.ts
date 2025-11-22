/**
 * ChefLoader - Chef-Themed Loading Indicator
 *
 * Provides fun cooking-themed loading indicators with helpful tips
 * during long-running pipeline operations
 */

import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { getRandomVerb } from './chef-verbs';
import { getRandomTip, formatTip, TipContext } from './tips';

export interface ChefLoaderOptions {
  stepName: string;
  stepNumber?: number;
  totalSteps?: number;
  showTips?: boolean;
  tipRotationSeconds?: number;
  chefTheme?: boolean;
}

/**
 * Chef-themed loading indicator with tips
 */
export class ChefLoader {
  private spinner?: Ora;
  private stepName: string;
  private stepNumber?: number;
  private totalSteps?: number;
  private showTips: boolean;
  private tipRotationSeconds: number;
  private chefTheme: boolean;
  private tipInterval?: NodeJS.Timeout;
  private startTime: number;

  constructor(options: ChefLoaderOptions) {
    this.stepName = options.stepName;
    this.stepNumber = options.stepNumber;
    this.totalSteps = options.totalSteps;
    this.showTips = options.showTips !== false;
    this.tipRotationSeconds = options.tipRotationSeconds || 8;
    this.chefTheme = options.chefTheme !== false;
    this.startTime = Date.now();
  }

  /**
   * Start the loading indicator
   */
  start(): void {
    if (!this.chefTheme) {
      // Boring mode - just show the step name
      const stepPrefix = this.getStepPrefix();
      console.log(`${stepPrefix}${this.stepName}...`);
      return;
    }

    // Get a random cooking verb for this step
    const verb = getRandomVerb(this.stepName);
    const stepPrefix = this.getStepPrefix();
    const message = `${stepPrefix}${verb.emoji}  ${verb.text}...`;

    // Just log the message without spinner to avoid flicker
    process.stdout.write(`${message}`);

    // Don't use ora spinner - it causes too much flicker
    // We'll just show completion when done
  }

  /**
   * Update the loading message
   */
  update(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Stop the loading indicator with success
   */
  succeed(message?: string): void {
    this.stopTipRotation();

    if (!this.chefTheme) {
      if (message) {
        console.log(`✓ ${message}`);
      }
      return;
    }

    const duration = this.getDuration();

    // Clear the line and show success
    process.stdout.write('\r\x1b[K'); // Clear line
    console.log(`${chalk.green('✔')} ${message || ''} ${chalk.gray(`(${duration})`)}`);

    // Show a tip on completion if enabled and duration > 3s
    if (this.showTips && (Date.now() - this.startTime) > 3000) {
      const context = this.stepName as TipContext;
      const tip = getRandomTip(context);
      const formattedTip = formatTip(tip, 'both');
      console.log(`  ${chalk.dim(formattedTip)}`);
    }
  }

  /**
   * Stop the loading indicator with failure
   */
  fail(message?: string): void {
    this.stopTipRotation();
    process.stdout.write('\r\x1b[K'); // Clear line
    console.error(`${chalk.red('✗')} ${message}`);
  }

  /**
   * Stop the loading indicator with warning
   */
  warn(message?: string): void {
    this.stopTipRotation();
    process.stdout.write('\r\x1b[K'); // Clear line
    console.warn(`${chalk.yellow('⚠')} ${message}`);
  }

  /**
   * Stop the loading indicator
   */
  stop(): void {
    this.stopTipRotation();
    process.stdout.write('\r\x1b[K'); // Clear line
  }

  /**
   * Start rotating tips
   */
  private startTipRotation(): void {
    // Show first tip after 3 seconds
    setTimeout(() => {
      this.showTip();

      // Then rotate tips at configured interval
      this.tipInterval = setInterval(() => {
        this.showTip();
      }, this.tipRotationSeconds * 1000);
    }, 3000);
  }

  /**
   * Stop tip rotation
   */
  private stopTipRotation(): void {
    if (this.tipInterval) {
      clearInterval(this.tipInterval);
      this.tipInterval = undefined;
    }
  }

  /**
   * Show a contextual tip
   */
  private showTip(): void {
    if (!this.spinner) return;

    const context = this.stepName as TipContext;
    const tip = getRandomTip(context);
    const formattedTip = formatTip(tip, 'both');

    // Update spinner text to include tip
    const verb = getRandomVerb(this.stepName);
    const stepPrefix = this.getStepPrefix();
    const message = `${stepPrefix}${verb.emoji}  ${verb.text}...\n  ${chalk.dim(formattedTip)}`;

    this.spinner.text = message;
  }

  /**
   * Get step prefix (e.g., "[1/8] ")
   */
  private getStepPrefix(): string {
    if (this.stepNumber !== undefined && this.totalSteps !== undefined) {
      return chalk.bold(`[${this.stepNumber}/${this.totalSteps}] `);
    }
    return '';
  }

  /**
   * Get duration since start
   */
  private getDuration(): string {
    const elapsed = Date.now() - this.startTime;
    if (elapsed < 1000) {
      return `${elapsed}ms`;
    }
    if (elapsed < 60000) {
      return `${(elapsed / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Convenience function to create and start a chef loader
 */
export function createChefLoader(options: ChefLoaderOptions): ChefLoader {
  const loader = new ChefLoader(options);
  loader.start();
  return loader;
}
