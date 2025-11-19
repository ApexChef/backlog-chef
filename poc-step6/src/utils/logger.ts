/**
 * Logging Utility for POC Step 6
 * Uses Winston for both console and file logging
 */

import winston from 'winston';
import path from 'path';
import { appConfig } from '../config/app.config';

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: appConfig.enableDebugLogging ? 'debug' : 'info',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport - all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'poc-step6.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport - errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'poc-step6-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  private getElapsed(): string {
    return ((Date.now() - this.startTime) / 1000).toFixed(2);
  }

  debug(message: string, meta?: any): void {
    winstonLogger.debug(message, { elapsed: this.getElapsed(), ...meta });
  }

  info(message: string, meta?: any): void {
    winstonLogger.info(message, { elapsed: this.getElapsed(), ...meta });
  }

  warn(message: string, meta?: any): void {
    winstonLogger.warn(message, { elapsed: this.getElapsed(), ...meta });
  }

  error(message: string, error?: any): void {
    const meta: any = { elapsed: this.getElapsed() };

    if (error) {
      if (error instanceof Error) {
        meta.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      } else {
        meta.error = error;
      }
    }

    winstonLogger.error(message, meta);
  }

  success(message: string, meta?: any): void {
    // Success is logged as info with success flag
    winstonLogger.info(message, { elapsed: this.getElapsed(), success: true, ...meta });
  }

  section(title: string): void {
    const line = '='.repeat(60);
    this.info(`\n${line}\n  ${title}\n${line}`);
  }

  subsection(title: string): void {
    this.info(`\n--- ${title} ---`);
  }

  progress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    this.info(`Progress: ${percentage}% - ${message}`, {
      current,
      total,
      percentage,
    });
  }

  table(headers: string[], rows: string[][]): void {
    this.info('Table output', {
      headers,
      rows,
    });

    // Also print to console in formatted way
    console.log('\n');
    const columnWidths = headers.map((header, index) => {
      const maxWidth = Math.max(
        header.length,
        ...rows.map(row => (row[index] || '').length)
      );
      return Math.min(maxWidth, 40);
    });

    const headerRow = headers
      .map((header, index) => header.padEnd(columnWidths[index]))
      .join(' | ');
    console.log(headerRow);
    console.log('-'.repeat(headerRow.length));

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
    console.log('\n');
  }

  json(data: any, title?: string): void {
    if (title) {
      this.info(title, { json_data: data });
    } else {
      this.info('JSON output', { json_data: data });
    }
  }
}

export const logger = new Logger();
