import type { McpServerConfig } from "../types.ts";

export const transformQwenCodeServerConfig = (config: McpServerConfig): unknown => {
  if (config.url) {
    if (config.type === "sse") {
      const sse: Record<string, unknown> = {
        url: config.url,
      };
      if (config.headers && Object.keys(config.headers).length > 0) {
        sse.headers = config.headers;
      }
      return sse;
    }

    const http: Record<string, unknown> = {
      httpUrl: config.url,
    };
    if (config.headers && Object.keys(config.headers).length > 0) {
      http.headers = config.headers;
    }
    return http;
  }

  const stdio: Record<string, unknown> = {
    command: config.command,
    args: config.args || [],
  };
  if (config.env && Object.keys(config.env).length > 0) {
    stdio.env = config.env;
  }
  return stdio;
};
