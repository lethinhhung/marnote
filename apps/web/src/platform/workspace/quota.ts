export class QuotaExceededError extends Error {
  constructor(message = "Storage quota exceeded") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export function isQuotaError(error: unknown): error is DOMException {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
}
