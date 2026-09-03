export const toErrorMessage = (error: unknown, fallback = "Unknown error"): string =>
  error instanceof Error ? error.message : fallback;
