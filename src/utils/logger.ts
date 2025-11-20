/**
 * Simple logger utility
 *
 * Provides consistent logging across the application
 * In production, this would integrate with a proper logging framework
 */

export function logInfo(message: string, ...args: any[]): void {
  console.log(`[INFO] ${message}`, ...args);
}

export function logWarn(message: string, ...args: any[]): void {
  console.warn(`[WARN] ${message}`, ...args);
}

export function logError(message: string, ...args: any[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}

export function logDebug(message: string, ...args: any[]): void {
  if (process.env.DEBUG) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}
