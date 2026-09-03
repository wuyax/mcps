import type {
  McpRemoteTransport,
  McpServerConfig,
} from "./types.ts";

export interface McpRemoteServerConfig {
  type: McpRemoteTransport;
  url: string;
  headers?: Record<string, string>;
}

export interface McpStdioServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Type guard for remote (HTTP/SSE) server configuration.
 */
export const isRemoteServerConfig = (
  config: McpServerConfig,
): config is McpRemoteServerConfig =>
  typeof config.url === "string" && config.url.length > 0;

/**
 * Type guard for local (stdio command/script) server configuration.
 */
export const isStdioServerConfig = (
  config: McpServerConfig,
): config is McpStdioServerConfig =>
  typeof config.command === "string" && config.command.length > 0;

/**
 * Parses and normalizes any unknown raw configuration object from agent config files
 * into a typed standard McpServerConfig domain model.
 */
export const parseServerConfig = (raw: unknown): McpServerConfig => {
  if (!raw || typeof raw !== "object") return {};
  const data = raw as Record<string, unknown>;

  // Remote server (HTTP / SSE)
  if (typeof data.url === "string" && data.url.trim().length > 0) {
    const transport: McpRemoteTransport =
      data.type === "sse" || data.type === "http" ? data.type : "http";
    const headers =
      data.headers && typeof data.headers === "object"
        ? (data.headers as Record<string, string>)
        : undefined;

    return {
      type: transport,
      url: data.url.trim(),
      headers,
    };
  }

  // Stdio server (npm command / local command / script)
  if (typeof data.command === "string" && data.command.trim().length > 0) {
    const args = Array.isArray(data.args)
      ? data.args.filter((item): item is string => typeof item === "string")
      : undefined;

    const env =
      data.env && typeof data.env === "object"
        ? (data.env as Record<string, string>)
        : undefined;

    return {
      command: data.command.trim(),
      args,
      env,
    };
  }

  return {};
};
