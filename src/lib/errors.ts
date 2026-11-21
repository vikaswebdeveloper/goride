export type ErrorCode =
  | "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"
  | "RATE_LIMITED" | "UNAVAILABLE" | "PAYMENT_ERROR" | "BAD_REQUEST" | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
  RATE_LIMITED: 429, UNAVAILABLE: 409, PAYMENT_ERROR: 402, BAD_REQUEST: 400, INTERNAL: 500,
};

/** Errors safe to show to API clients. Anything else becomes a generic 500. */
export class AppError extends Error {
  readonly status: number;
  constructor(public readonly code: ErrorCode, message: string, public readonly details?: unknown) {
    super(message);
    this.status = STATUS[code];
  }
}
