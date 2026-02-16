/**
 * Structured logging utility for Convex actions
 * Provides consistent, searchable logs with context
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

/**
 * Create a timestamp in ISO format
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message with level, timestamp, and context
 */
function formatLog(
  level: LogLevel,
  operation: string,
  message: string,
  context?: LogContext
): string {
  const logEntry = {
    timestamp: timestamp(),
    level: level.toUpperCase(),
    operation,
    message,
    ...context,
  };

  return JSON.stringify(logEntry);
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private operation: string;
  private baseContext: LogContext;

  constructor(operation: string, baseContext: LogContext = {}) {
    this.operation = operation;
    this.baseContext = baseContext;
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    console.log(formatLog("info", this.operation, message, {
      ...this.baseContext,
      ...context,
    }));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    console.warn(formatLog("warn", this.operation, message, {
      ...this.baseContext,
      ...context,
    }));
  }

  /**
   * Log error message
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorContext = error instanceof Error
      ? {
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name,
        }
      : { error: String(error) };

    console.error(formatLog("error", this.operation, message, {
      ...this.baseContext,
      ...errorContext,
      ...context,
    }));
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(formatLog("debug", this.operation, message, {
        ...this.baseContext,
        ...context,
      }));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(this.operation, {
      ...this.baseContext,
      ...additionalContext,
    });
  }
}

/**
 * Create a logger instance
 */
export function createLogger(operation: string, context?: LogContext): Logger {
  return new Logger(operation, context);
}
