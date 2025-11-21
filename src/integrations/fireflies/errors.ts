/**
 * Fireflies API Error Classes
 *
 * Custom error types for Fireflies integration
 */

/**
 * Base error for Fireflies API operations
 */
export class FirefliesAPIError extends Error {
  public readonly statusCode?: number;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode?: number,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'FirefliesAPIError';
    this.statusCode = statusCode;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirefliesAPIError);
    }
  }

  /**
   * Get a formatted error message with context
   */
  toFormattedString(): string {
    let msg = `${this.name}: ${this.message}`;

    if (this.statusCode) {
      msg += `\n  Status Code: ${this.statusCode}`;
    }

    if (this.context) {
      msg += `\n  Context: ${JSON.stringify(this.context, null, 2)}`;
    }

    return msg;
  }
}

/**
 * Error for missing or invalid API key
 */
export class FirefliesAuthError extends FirefliesAPIError {
  constructor(message: string = 'Fireflies API key is missing or invalid') {
    super(message, 401);
    this.name = 'FirefliesAuthError';
  }
}

/**
 * Error for meeting not found
 */
export class FirefliesMeetingNotFoundError extends FirefliesAPIError {
  constructor(meetingId: string) {
    super(`Fireflies meeting not found: ${meetingId}`, 404, { meetingId });
    this.name = 'FirefliesMeetingNotFoundError';
  }
}

/**
 * Error for rate limit exceeded
 */
export class FirefliesRateLimitError extends FirefliesAPIError {
  constructor(retryAfter?: number) {
    super('Fireflies API rate limit exceeded', 429, { retryAfter });
    this.name = 'FirefliesRateLimitError';
  }
}

/**
 * Error for invalid GraphQL response
 */
export class FirefliesGraphQLError extends FirefliesAPIError {
  constructor(errors: any[]) {
    super(`Fireflies GraphQL errors: ${JSON.stringify(errors)}`, undefined, { errors });
    this.name = 'FirefliesGraphQLError';
  }
}
