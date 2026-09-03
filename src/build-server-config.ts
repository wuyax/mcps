import { NPX_COMMAND, NPX_DASH_Y, DEFAULT_REMOTE_TRANSPORT } from "./constants.ts";
import type { McpServerConfig, ParsedMcpSource, McpRemoteTransport } from "./types.ts";

export interface BuildMcpServerConfigOptions {
  transport?: McpRemoteTransport;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  args?: string[];
}

export const buildMcpServerConfig = (
  parsed: ParsedMcpSource,
  options: BuildMcpServerConfigOptions = {},
): McpServerConfig => {
  if (parsed.type === "remote") {
    const config: McpServerConfig = {
      type: options.transport ?? DEFAULT_REMOTE_TRANSPORT,
      url: parsed.value,
    };
    if (options.headers && Object.keys(options.headers).length > 0) {
      config.headers = options.headers;
    }
    return config;
  }

  if (parsed.type === "command") {
    const parts = parsed.value.split(/\s+/);
    const command = parts[0] ?? "";
    const args = parts.slice(1);
    if (options.args && options.args.length > 0) {
      args.push(...options.args);
    }
    const config: McpServerConfig = { command, args };
    if (options.env && Object.keys(options.env).length > 0) {
      config.env = options.env;
    }
    return config;
  }

  const packageArgs = [NPX_DASH_Y, parsed.value];
  if (options.args && options.args.length > 0) {
    packageArgs.push(...options.args);
  }

  const config: McpServerConfig = {
    command: NPX_COMMAND,
    args: packageArgs,
  };
  if (options.env && Object.keys(options.env).length > 0) {
    config.env = options.env;
  }
  return config;
};
