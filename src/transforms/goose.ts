import { GOOSE_TIMEOUT_SECONDS } from "../constants.ts";
import type { McpServerConfig } from "../types.ts";

export const transformGooseServerConfig = (
  serverName: string,
  config: McpServerConfig,
): unknown => {
  if (config.url) {
    const gooseType = config.type === "sse" ? "sse" : "streamable_http";
    return {
      name: serverName,
      description: "",
      type: gooseType,
      uri: config.url,
      headers: config.headers || {},
      enabled: true,
      timeout: GOOSE_TIMEOUT_SECONDS,
    };
  }

  return {
    name: serverName,
    description: "",
    cmd: config.command,
    args: config.args || [],
    enabled: true,
    envs: config.env || {},
    type: "stdio",
    timeout: GOOSE_TIMEOUT_SECONDS,
  };
};
