import type { McpServerConfig } from "../types.ts";

export const transformCodexServerConfig = (config: McpServerConfig): unknown => {
  if (config.url) {
    const remoteConfig: Record<string, unknown> = {
      type: config.type || "http",
      url: config.url,
    };
    if (config.headers && Object.keys(config.headers).length > 0) {
      remoteConfig.headers = config.headers;
    }
    return remoteConfig;
  }

  const stdioConfig: Record<string, unknown> = {
    command: config.command,
    args: config.args || [],
  };
  if (config.env && Object.keys(config.env).length > 0) stdioConfig.env = config.env;
  return stdioConfig;
};
