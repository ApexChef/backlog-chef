import chalk from 'chalk';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private logLevel: LogLevel;

  constructor(level: string = 'info') {
    this.logLevel = this.parseLogLevel(level);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  error(message: string, error?: Error): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(chalk.red('✖ ERROR:'), message);
      if (error) {
        console.error(chalk.red('  Details:'), error.message);
        if (process.env.LOG_LEVEL === 'debug') {
          console.error(chalk.gray('  Stack:'), error.stack);
        }
      }
    }
  }

  warn(message: string): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(chalk.yellow('⚠ WARNING:'), message);
    }
  }

  info(message: string): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(chalk.blue('ℹ INFO:'), message);
    }
  }

  debug(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.log(chalk.gray('⚙ DEBUG:'), message);
      if (data) {
        console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
      }
    }
  }

  success(message: string): void {
    console.log(chalk.green('✔ SUCCESS:'), message);
  }
}

export const logger = new Logger(process.env.LOG_LEVEL || 'info');