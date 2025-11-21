/**
 * Retry utility with exponential backoff
 *
 * Handles transient failures when calling Fireflies API
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: string[]; // Error codes/names that should be retried
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
  onRetry: () => {}, // No-op by default
};

/**
 * Retry an async function with exponential backoff
 *
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result of successful function call
 * @throws Last error if all attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = shouldRetry(lastError, opts.retryableErrors);

      // Don't retry if this was the last attempt or error is not retryable
      if (attempt >= opts.maxAttempts || !isRetryable) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(2, attempt - 1),
        opts.maxDelayMs
      );

      // Call retry callback
      opts.onRetry(attempt, lastError);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never happen, but TypeScript needs it
  throw lastError || new Error('withRetry: Unexpected error');
}

/**
 * Check if an error should be retried
 */
function shouldRetry(error: Error, retryableErrors: string[]): boolean {
  // Check error code (for Node.js errors like ECONNRESET)
  const errorCode = (error as any).code;
  if (errorCode && retryableErrors.includes(errorCode)) {
    return true;
  }

  // Check error name
  if (retryableErrors.includes(error.name)) {
    return true;
  }

  // Check for specific error messages
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection')
  ) {
    return true;
  }

  // Rate limit (429) - should be retried with backoff
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }

  // Server errors (5xx) - transient failures
  if (message.includes('500') || message.includes('503') || message.includes('502')) {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
