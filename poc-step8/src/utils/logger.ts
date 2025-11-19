import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/app.config';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = config.paths.logs;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const base = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${base}\n${stack}` : base;
  })
);

// Configure transports
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    ),
    level: config.debug ? 'debug' : 'info'
  }),

  // Rotating file transport for all logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'poc-step7-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '5m',
    maxFiles: '5d',
    format: logFormat,
    level: 'debug'
  }),

  // Rotating file transport for errors only
  new DailyRotateFile({
    filename: path.join(logsDir, 'poc-step7-error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '5m',
    maxFiles: '5d',
    format: logFormat,
    level: 'error'
  })
];

// Create logger instance
export const logger = winston.createLogger({
  level: config.debug ? 'debug' : 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Add helper methods
export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logError = (message: string, error?: Error | any) => {
  if (error instanceof Error) {
    logger.error(message, { error: error.message, stack: error.stack });
  } else if (error) {
    logger.error(message, { error });
  } else {
    logger.error(message);
  }
};

export const logApiCall = (endpoint: string, duration: number, tokens?: { input: number; output: number }) => {
  const message = `API call to ${endpoint} completed in ${duration}ms`;
  if (tokens) {
    logger.info(message, { tokens });
  } else {
    logger.info(message);
  }
};

export const logCost = (inputTokens: number, outputTokens: number, costUsd: number) => {
  logger.info(`API Cost: $${costUsd.toFixed(6)} (Input: ${inputTokens} tokens, Output: ${outputTokens} tokens)`);
};
