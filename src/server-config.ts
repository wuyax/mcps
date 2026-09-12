import {
  DEFAULT_REMOTE_TRANSPORT,
  NPX_COMMAND,
  NPX_DASH_Y,
} from "./constants.ts";
import type {
  McpRemoteTransport,
  McpServerConfig,
  ParsedMcpSource,
} from "./types.ts";

export type UpdateTransitionType =
  | "switch-to-remote"
  | "switch-to-stdio"
  | "merge-remote"
  | "merge-stdio";

// ---------------------------------------------------------------------------
// Typed Server Config shapes & Type Guards
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Construction & Source Parsing
// ---------------------------------------------------------------------------

export interface BuildMcpServerConfigOptions {
  transport?: McpRemoteTransport;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  args?: string[];
}

/**
 * Deep module builder: Constructs a typed standard McpServerConfig from parsed MCP source.
 */
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

// ---------------------------------------------------------------------------
// Deserialization & Normalization
// ---------------------------------------------------------------------------

/**
 * Parses and normalizes any unknown raw configuration object from agent config files
 * into a typed standard McpServerConfig domain model.
 */
export const parseServerConfig = (raw: unknown): McpServerConfig => {
  if (!raw || typeof raw !== "object") return {};
  const data = raw as Record<string, unknown>;

  // Remote server (HTTP / SSE)
  const rawUrl =
    typeof data.url === "string" && data.url.trim().length > 0 ? data.url.trim() : undefined;
  const rawHttpUrl =
    typeof data.httpUrl === "string" && data.httpUrl.trim().length > 0
      ? data.httpUrl.trim()
      : undefined;
  const remoteUrl = rawHttpUrl ?? rawUrl;

  if (remoteUrl) {
    const transport: McpRemoteTransport =
      data.type === "sse" || data.transport === "sse" ? "sse" : "http";
    const headers =
      data.headers && typeof data.headers === "object"
        ? (data.headers as Record<string, string>)
        : undefined;

    return {
      type: transport,
      url: remoteUrl,
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

// ---------------------------------------------------------------------------
// Protocol Sanitization & Conversion
// ---------------------------------------------------------------------------

/**
 * Transforms a server configuration into a clean remote configuration,
 * stripping stdio-exclusive fields (command, args, env).
 */
export const toRemoteServerConfig = (
  config: McpServerConfig,
  defaultTransport: McpRemoteTransport = "http",
): McpServerConfig => {
  const {
    command: _droppedCommand,
    args: _droppedArgs,
    env: _droppedEnv,
    ...remoteConfig
  } = config;
  return {
    ...remoteConfig,
    type: remoteConfig.type ?? defaultTransport,
  };
};

/**
 * Transforms a server configuration into a clean stdio configuration,
 * stripping remote-exclusive fields (url, type, headers).
 */
export const toStdioServerConfig = (config: McpServerConfig): McpServerConfig => {
  const {
    url: _droppedUrl,
    type: _droppedType,
    headers: _droppedHeaders,
    ...stdioConfig
  } = config;
  return stdioConfig;
};

/**
 * Determines the transition category when updating an MCP server configuration.
 */
export const detectUpdateTransition = (
  incoming: McpServerConfig,
  previous?: McpServerConfig,
): UpdateTransitionType => {
  if (!previous) {
    return incoming.url ? "switch-to-remote" : "switch-to-stdio";
  }
  if (incoming.url && !incoming.command) {
    return "switch-to-remote";
  }
  if (incoming.command && !incoming.url) {
    return "switch-to-stdio";
  }
  if (incoming.url || (!incoming.command && previous.url)) {
    return "merge-remote";
  }
  return "merge-stdio";
};

/**
 * Strips obsolete fields when switching between stdio and remote protocols.
 * When switching to remote (url is provided), stdio fields (command, args, env) are removed.
 * When switching to stdio (command is provided), remote fields (url, type, headers) are removed.
 */
export const sanitizeUpdatedServerConfig = (
  incoming: McpServerConfig,
  previous?: McpServerConfig,
): McpServerConfig => {
  const transition = detectUpdateTransition(incoming, previous);
  const targetTransport = incoming.type ?? previous?.type ?? "http";

  switch (transition) {
    case "switch-to-remote": {
      const cleanBase = previous ? toRemoteServerConfig(previous, targetTransport) : {};
      return toRemoteServerConfig({ ...cleanBase, ...incoming }, targetTransport);
    }
    case "switch-to-stdio": {
      const cleanBase = previous ? toStdioServerConfig(previous) : {};
      return toStdioServerConfig({ ...cleanBase, ...incoming });
    }
    case "merge-remote": {
      return toRemoteServerConfig({ ...previous, ...incoming }, targetTransport);
    }
    case "merge-stdio":
    default: {
      return toStdioServerConfig({ ...previous, ...incoming });
    }
  }
};

// ---------------------------------------------------------------------------
// Delta Application & Mutual Exclusion Validation
// ---------------------------------------------------------------------------

export interface ServerConfigDeltaOptions {
  command?: string;
  args?: string[];
  clearArgs?: boolean;
  env?: Record<string, string>;
  clearEnv?: boolean;
  url?: string;
  transport?: McpRemoteTransport;
  headers?: Record<string, string>;
  clearHeaders?: boolean;
}

export interface ApplyServerConfigDeltaResult {
  config: McpServerConfig;
  transition: UpdateTransitionType;
  protocol: "remote" | "stdio";
  ignoredFlags: string[];
}

/**
 * Deep domain operation: Applies modification flags to an existing configuration,
 * validates command vs url mutual exclusion, determines the target protocol,
 * identifies ignored incompatible flags, and produces a clean, sanitized configuration.
 */
export const applyServerConfigDelta = (
  previousConfig: McpServerConfig | undefined,
  options: ServerConfigDeltaOptions,
): ApplyServerConfigDeltaResult => {
  if (options.url !== undefined && options.command !== undefined) {
    throw new Error('Cannot specify both "--url" (remote) and "--command" (stdio) simultaneously.');
  }

  const isCurrentRemote = Boolean(previousConfig?.url && previousConfig.url.length > 0);
  const willBeRemote =
    options.url !== undefined ? true : options.command !== undefined ? false : isCurrentRemote;

  const protocol = willBeRemote ? "remote" : "stdio";
  const ignoredFlags: string[] = [];

  if (willBeRemote) {
    if (options.env !== undefined) ignoredFlags.push("--env");
    if (options.clearEnv) ignoredFlags.push("--clear-env");
    if (options.args !== undefined) ignoredFlags.push("--args");
    if (options.clearArgs) ignoredFlags.push("--clear-args");
  } else {
    if (options.headers !== undefined) ignoredFlags.push("--header");
    if (options.clearHeaders) ignoredFlags.push("--clear-headers");
    if (options.transport !== undefined) ignoredFlags.push("--transport");
  }

  const incomingDelta: McpServerConfig = {};

  if (options.command !== undefined) {
    incomingDelta.command = options.command;
  }
  if (options.clearArgs) {
    incomingDelta.args = undefined;
  }
  if (options.args !== undefined) {
    incomingDelta.args = options.args;
  }
  if (options.url !== undefined) {
    incomingDelta.url = options.url;
  }
  if (options.transport !== undefined) {
    incomingDelta.type = options.transport;
  }
  if (options.clearEnv) {
    incomingDelta.env = undefined;
  }
  if (options.env !== undefined) {
    const baseEnv = options.clearEnv ? {} : (previousConfig?.env ?? {});
    incomingDelta.env = { ...baseEnv, ...options.env };
  }
  if (options.clearHeaders) {
    incomingDelta.headers = undefined;
  }
  if (options.headers !== undefined) {
    const baseHeaders = options.clearHeaders ? {} : (previousConfig?.headers ?? {});
    incomingDelta.headers = { ...baseHeaders, ...options.headers };
  }

  const transition = detectUpdateTransition(incomingDelta, previousConfig);
  const cleanConfig = sanitizeUpdatedServerConfig(incomingDelta, previousConfig);

  return {
    config: cleanConfig,
    transition,
    protocol,
    ignoredFlags,
  };
};
