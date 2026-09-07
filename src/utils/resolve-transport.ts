import type { McpRemoteTransport } from "../types.ts";

/**
 * Validates and resolves remote transport string into McpRemoteTransport.
 */
export const resolveTransport = (input: string | undefined): McpRemoteTransport | undefined => {
  if (!input) return undefined;
  if (input === "http" || input === "sse") return input;
  throw new Error(`Unsupported transport "${input}" (expected: http, sse)`);
};
