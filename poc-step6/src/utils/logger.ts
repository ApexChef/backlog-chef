/**
 * Logging Utility for POC Step 6
 */

import * as chalk from 'chalk';
import { appConfig } from '../config/app.config';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

class Logger {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    return `[${timestamp}] [${elapsed}s] [${level}] ${message}`;
  }

  private colorize(level: LogLevel, message: string): string {
    switch (level) {
      case LogLevel.DEBUG:
        return chalk.gray(message);
      case LogLevel.INFO:
        return chalk.blue(message);
      case LogLevel.WARN:
        return chalk.yellow(message);
      case LogLevel.ERROR:
        return chalk.red(message);
      case LogLevel.SUCCESS:
        return chalk.green(message);
      default:
        return message;
    }
  }

  debug(message: string, data?: any): void {
    if (appConfig.enableDebugLogging) {
      console.log(this.colorize(LogLevel.DEBUG, this.formatMessage(LogLevel.DEBUG, message)));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  info(message: string, data?: any): void {
    console.log(this.colorize(LogLevel.INFO, this.formatMessage(LogLevel.INFO, message)));
    if (data && appConfig.enableDebugLogging) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  warn(message: string, data?: any): void {
    console.log(this.colorize(LogLevel.WARN, this.formatMessage(LogLevel.WARN, message)));
    if (data) {
      console.log(chalk.yellow(JSON.stringify(data, null, 2)));
    }
  }

  error(message: string, error?: any): void {
    console.error(this.colorize(LogLevel.ERROR, this.formatMessage(LogLevel.ERROR, message)));
    if (error) {
      if (error instanceof Error) {
        console.error(chalk.red(error.stack || error.message));
      } else {
        console.error(chalk.red(JSON.stringify(error, null, 2)));
      }
    }
  }

  success(message: string, data?: any): void {
    console.log(this.colorize(LogLevel.SUCCESS, this.formatMessage(LogLevel.SUCCESS, message)));
    if (data && appConfig.enableDebugLogging) {
      console.log(chalk.green(JSON.stringify(data, null, 2)));
    }
  }

  section(title: string): void {
    const line = '='.repeat(60);
    console.log('\n' + chalk.cyan(line));
    console.log(chalk.cyan.bold(`  ${title}`));
    console.log(chalk.cyan(line) + '\n');
  }

  subsection(title: string): void {
    console.log('\n' + chalk.magenta(`--- ${title} ---`) + '\n');
  }

  progress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    console.log(
      chalk.cyan(`[${progressBar}] ${percentage}% - ${message} (${current}/${total})`)
    );
  }

  private createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  table(headers: string[], rows: string[][]): void {
    const columnWidths = headers.map((header, index) => {
      const maxWidth = Math.max(
        header.length,
        ...rows.map(row => (row[index] || '').length)
      );
      return Math.min(maxWidth, 40); // Cap at 40 chars
    });

    // Print headers
    const headerRow = headers
      .map((header, index) => header.padEnd(columnWidths[index]))
      .join(' | ');
    console.log(chalk.cyan.bold(headerRow));
    console.log(chalk.cyan('-'.repeat(headerRow.length)));

    // Print rows
    rows.forEach(row => {
      const rowStr = row
        .map((cell, index) => {
          const truncated =
            cell.length > columnWidths[index]
              ? cell.substring(0, columnWidths[index] - 3) + '...'
              : cell;
          return truncated.padEnd(columnWidths[index]);
        })
        .join(' | ');
      console.log(rowStr);
    });
  }

  json(data: any, title?: string): void {
    if (title) {
      console.log(chalk.cyan.bold(`\n${title}:`));
    }
    console.log(JSON.stringify(data, null, 2));
  }
}

export const logger = new Logger();