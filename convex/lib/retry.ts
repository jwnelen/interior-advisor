/**
 * Retry utility with exponential backoff
 * Useful for handling transient failures in external API calls
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;

  /**
   * Base delay in milliseconds before first retry
   */
  baseDelay: number;

  /**
   * Maximum delay in milliseconds between retries
   */
  maxDelay?: number;
}

/**
 * Determines if an error is retryable
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Retry on network errors and timeouts
    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("enotfound") ||
      message.includes("etimedout") ||
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("503") ||
      message.includes("504")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number = 30000
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const delay = baseDelay * Math.pow(2, attempt);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;

  return Math.min(delay + jitter, maxDelay);
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay = 30000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryable(error)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, baseDelay, maxDelay);
      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms delay`,
        error instanceof Error ? error.message : String(error)
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  throw lastError;
}
