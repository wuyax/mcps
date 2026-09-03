import type { McpServerConfig } from "../types.ts";

export const transformOpenCodeServerConfig = (config: McpServerConfig): unknown => {
  if (config.url) {
    return {
      type: "remote",
      url: config.url,
      enabled: true,
      headers: config.headers,
    };
  }

  return {
    type: "local",
    command: [config.command, ...(config.args || [])],
    enabled: true,
    environment: config.env || {},
  };
};
