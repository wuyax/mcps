import type { McpServerConfig } from "../types.ts";

export const transformZedServerConfig = (config: McpServerConfig): unknown => {
  if (config.url) {
    return {
      source: "custom",
      type: config.type || "http",
      url: config.url,
      headers: config.headers || {},
    };
  }

  return {
    source: "custom",
    command: config.command,
    args: config.args || [],
    env: config.env || {},
  };
};
