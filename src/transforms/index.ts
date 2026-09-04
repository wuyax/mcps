import { GOOSE_TIMEOUT_SECONDS } from "../constants.ts";
import type {
  McpAgentConfig,
  McpServerConfig,
  ServerConfigDialect,
  ServerConfigDialectName,
  ServerConfigDialectOptions,
} from "../types.ts";

const DIALECT_PRESETS: Record<ServerConfigDialectName, ServerConfigDialectOptions> = {
  vscode: {
    stdioTransport: "type-stdio",
    remoteTransport: "type-http-sse",
  },
  augment: {
    stdioTransport: "none",
    remoteTransport: "type-http-sse",
  },
  amp: {
    stdioTransport: "none",
    remoteTransport: "none",
  },
  trae: {
    stdioTransport: "none",
    remoteTransport: "sse-only-type",
  },
  grok: {
    stdioTransport: "none",
    remoteTransport: "sse-only-type",
  },
  cline: {
    stdioTransport: "none",
    remoteTransport: "streamableHttp",
  },
  goose: {
    stdioTransport: "type-stdio",
    remoteTransport: "streamable_http",
    commandField: "cmd",
    envField: "envs",
    urlField: "uri",
    defaultEnvEmpty: true,
    defaultHeadersEmpty: true,
    includeServerName: true,
    timeoutSeconds: GOOSE_TIMEOUT_SECONDS,
    extraFields: {
      description: "",
      enabled: true,
    },
  },
  "kimi-code": {
    stdioTransport: "none",
    remoteTransport: "sse-only-transport",
  },
  kiro: {
    stdioTransport: "none",
    remoteTransport: "none",
  },
  opencode: {
    stdioTransport: "type-local",
    remoteTransport: "remote-type",
    commandArray: true,
    envField: "environment",
    defaultEnvEmpty: true,
    extraFields: {
      enabled: true,
    },
  },
  pi: {
    stdioTransport: "transport-stdio",
    remoteTransport: "streamable-http",
  },
  "qwen-code": {
    stdioTransport: "none",
    remoteTransport: "qwen",
  },
  zed: {
    stdioTransport: "none",
    remoteTransport: "type-http-sse",
    wrapper: { source: "custom" },
    defaultEnvEmpty: true,
    defaultHeadersEmpty: true,
  },
};

const resolveDialectOptions = (dialect: ServerConfigDialect): ServerConfigDialectOptions => {
  if (typeof dialect === "string") {
    const preset = DIALECT_PRESETS[dialect];
    if (!preset) {
      throw new Error(`Unknown server config dialect: "${dialect}"`);
    }
    return preset;
  }
  return dialect;
};

const transformRemoteConfig = (
  serverName: string,
  config: McpServerConfig,
  options: ServerConfigDialectOptions,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  if (options.wrapper) {
    Object.assign(result, options.wrapper);
  }

  if (options.includeServerName) {
    result.name = serverName;
  }

  if (options.extraFields) {
    Object.assign(result, options.extraFields);
  }

  const remoteTransport = options.remoteTransport ?? "type-http-sse";
  const urlField = options.urlField ?? "url";

  switch (remoteTransport) {
    case "type-http-sse":
      result.type = config.type || "http";
      result[urlField] = config.url;
      break;
    case "sse-only-type":
      result[urlField] = config.url;
      if (config.type === "sse") {
        result.type = "sse";
      }
      break;
    case "sse-only-transport":
      result[urlField] = config.url;
      if (config.type === "sse") {
        result.transport = "sse";
      }
      break;
    case "none":
      result[urlField] = config.url;
      break;
    case "streamableHttp":
      result.type = config.type === "sse" ? "sse" : "streamableHttp";
      result[urlField] = config.url;
      break;
    case "streamable-http":
      result.transport = config.type === "sse" ? "sse" : "streamable-http";
      result[urlField] = config.url;
      break;
    case "streamable_http":
      result.type = config.type === "sse" ? "sse" : "streamable_http";
      result[urlField] = config.url;
      break;
    case "remote-type":
      result.type = "remote";
      result[urlField] = config.url;
      break;
    case "qwen":
      if (config.type === "sse") {
        result.url = config.url;
      } else {
        result.httpUrl = config.url;
      }
      break;
  }

  const hasHeaders = config.headers && Object.keys(config.headers).length > 0;
  if (hasHeaders) {
    result.headers = config.headers;
  } else if (options.defaultHeadersEmpty) {
    result.headers = {};
  }

  if (options.timeoutSeconds !== undefined) {
    result.timeout = options.timeoutSeconds;
  }

  return result;
};

const transformStdioConfig = (
  serverName: string,
  config: McpServerConfig,
  options: ServerConfigDialectOptions,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  if (options.wrapper) {
    Object.assign(result, options.wrapper);
  }

  if (options.includeServerName) {
    result.name = serverName;
  }

  if (options.extraFields) {
    Object.assign(result, options.extraFields);
  }

  const stdioTransport = options.stdioTransport ?? "none";
  const commandField = options.commandField ?? "command";
  const argsField = options.argsField ?? "args";
  const envField = options.envField ?? "env";

  switch (stdioTransport) {
    case "type-stdio":
      result.type = "stdio";
      break;
    case "transport-stdio":
      result.transport = "stdio";
      break;
    case "type-local":
      result.type = "local";
      break;
    case "none":
      break;
  }

  if (options.commandArray) {
    result[commandField] = [config.command, ...(config.args || [])];
  } else {
    result[commandField] = config.command;
    result[argsField] = config.args || [];
  }

  const hasEnv = config.env && Object.keys(config.env).length > 0;
  if (hasEnv) {
    result[envField] = config.env;
  } else if (options.defaultEnvEmpty) {
    result[envField] = {};
  }

  if (options.timeoutSeconds !== undefined) {
    result.timeout = options.timeoutSeconds;
  }

  return result;
};

/**
 * Deep module: Transforms standard McpServerConfig into an Agent-specific configuration shape
 * driven by declarative dialects.
 */
export const transformServerConfig = (
  serverName: string,
  config: McpServerConfig,
  dialect: ServerConfigDialect,
  _context?: { global?: boolean },
): unknown => {
  const options = resolveDialectOptions(dialect);

  if (config.url) {
    return transformRemoteConfig(serverName, config, options);
  }

  return transformStdioConfig(serverName, config, options);
};

/**
 * Factory creating an agent-bound transform function from a declarative dialect.
 */
export const createAgentTransform = (
  dialect: ServerConfigDialect,
): ((serverName: string, config: McpServerConfig, context: { global: boolean }) => unknown) => {
  return (serverName, config, context) =>
    transformServerConfig(serverName, config, dialect, context);
};

/**
 * Transforms an MCP server config for a given Agent, checking custom transformConfig
 * or falling back to declarative transformDialect.
 */
export const transformServerConfigForAgent = (
  agent: McpAgentConfig,
  serverName: string,
  config: McpServerConfig,
  context: { global: boolean } = { global: false },
): unknown => {
  if (agent.transformConfig) {
    return agent.transformConfig(serverName, config, context);
  }
  if (agent.transformDialect) {
    return transformServerConfig(serverName, config, agent.transformDialect, context);
  }
  return config;
};
