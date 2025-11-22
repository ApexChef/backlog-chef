/**
 * Simple logger utility
 *
 * Provides consistent logging across the application
 * In production, this would integrate with a proper logging framework
 *
 * Control verbosity with environment variables:
 * - VERBOSE=true - Show all INFO messages
 * - DEBUG=true - Show all DEBUG messages
 */

const VERBOSE = process.env.VERBOSE === 'true';
const DEBUG = process.env.DEBUG === 'true';

export function logInfo(message: string, ...args: any[]): void {
  // Only show INFO messages when VERBOSE is enabled
  if (VERBOSE) {
    console.log(`[INFO] ${message}`, ...args);
  }
}

export function logWarn(message: string, ...args: any[]): void {
  console.warn(`[WARN] ${message}`, ...args);
}

export function logError(message: string, ...args: any[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}

export function logDebug(message: string, ...args: any[]): void {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}
