import type { McpServerConfig } from "../types.ts";

export const transformVscodeServerConfig = (config: McpServerConfig): unknown => {
  if (config.url) {
    const remote: Record<string, unknown> = {
      type: config.type || "http",
      url: config.url,
    };
    if (config.headers && Object.keys(config.headers).length > 0) {
      remote.headers = config.headers;
    }
    return remote;
  }

  const stdio: Record<string, unknown> = {
    type: "stdio",
    command: config.command,
    args: config.args || [],
  };
  if (config.env && Object.keys(config.env).length > 0) stdio.env = config.env;
  return stdio;
};
