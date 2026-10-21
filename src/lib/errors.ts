const GENERIC_MESSAGE =
  "Something went wrong while running the workflow. Check the server logs for details."

// Only errors whose messages this codebase constructs itself may reach the UI.
const SAFE_ERROR_NAMES = new Set(["AppError", "NonRetriableError"])

/**
 * An error with a message that is safe to show to users. Raw provider errors
 * must be wrapped in an AppError (with the original as `cause`) before they
 * leave the server, so logs and banners never expose provider details.
 */
export class AppError extends Error {
  readonly code: string
  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    )
    this.name = "AppError"
    this.code = options?.code ?? "APP_ERROR"
  }
}

export class ContextError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) { super(message, { ...options, code: "CONTEXT_ERROR" }); this.name = "ContextError" }
}

export class UngroundedAnswerError extends AppError {
  constructor() { super("The answer was not supported by a verified context citation.", { code: "UNGROUNDED_ANSWER" }); this.name = "UngroundedAnswerError" }
}

/**
 * Return a message for `error` that is safe to return to users. Walks the
 * cause chain (Inngest wraps errors) looking for an error we know is safe.
 * Anything else collapses to a generic message; raw details stay in server
 * logs only.
 */
export function safeMessage(error: unknown): string {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current != null; depth += 1) {
    if (current instanceof AppError) {
      return current.message
    }
    if (current instanceof Error && SAFE_ERROR_NAMES.has(current.name)) {
      return current.message
    }
    current = (current as { cause?: unknown }).cause
  }
  return GENERIC_MESSAGE
}
