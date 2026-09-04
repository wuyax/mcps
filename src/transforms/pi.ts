import type { McpServerConfig } from "../types.ts";

export const transformPiServerConfig = (config: McpServerConfig): unknown => {
  if (config.url) {
    const remote: Record<string, unknown> = {
      transport: config.type === "sse" ? "sse" : "streamable-http",
      url: config.url,
    };
    if (config.headers && Object.keys(config.headers).length > 0) {
      remote.headers = config.headers;
    }
    return remote;
  }

  const stdio: Record<string, unknown> = {
    command: config.command,
    args: config.args || [],
    transport: "stdio",
  };
  if (config.env && Object.keys(config.env).length > 0) {
    stdio.env = config.env;
  }
  return stdio;
};
