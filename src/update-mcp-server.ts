import { installMcpServerForAgent } from "./installer.ts";
import { listInstalledMcpServers } from "./list.ts";
import { resolveTargetAgents } from "./resolve-target-agents.ts";
import type {
  McpInstallResultForAgent,
  McpRemoteTransport,
  McpServerConfig,
  McpTransportType,
  UpdateMcpServerOptions,
  UpdateMcpServerResult,
} from "./types.ts";

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
 * Strips obsolete fields when switching between stdio and remote protocols.
 * When switching to remote (url is provided), stdio fields (command, args, env) are removed.
 * When switching to stdio (command is provided), remote fields (url, type, headers) are removed.
 */
export const sanitizeUpdatedServerConfig = (
  incoming: McpServerConfig,
  previous?: McpServerConfig,
): McpServerConfig => {
  if (!previous) {
    if (incoming.url) {
      return toRemoteServerConfig(incoming);
    }
    return toStdioServerConfig(incoming);
  }

  const isSwitchingToRemote = Boolean(incoming.url) && !incoming.command;
  const isSwitchingToStdio = Boolean(incoming.command) && !incoming.url;

  if (isSwitchingToRemote) {
    const cleanPrevious = toRemoteServerConfig(previous, incoming.type ?? previous.type);
    const merged = { ...cleanPrevious, ...incoming };
    return toRemoteServerConfig(merged, incoming.type ?? previous.type);
  }

  if (isSwitchingToStdio) {
    const cleanPrevious = toStdioServerConfig(previous);
    const merged = { ...cleanPrevious, ...incoming };
    return toStdioServerConfig(merged);
  }

  const merged = { ...previous, ...incoming };
  if (merged.url && !incoming.command) {
    return toRemoteServerConfig(merged, incoming.type ?? previous.type);
  }
  if (merged.command && !incoming.url) {
    return toStdioServerConfig(merged);
  }

  return merged;
};

/**
 * Core Orchestration: Updates an existing MCP server across specified or installed coding agents,
 * sanitizing protocol dirty fields and validating transport capabilities.
 */
export const updateMcpServer = (options: UpdateMcpServerOptions): UpdateMcpServerResult => {
  const isGlobal = options.global ?? false;
  const cwd = options.cwd ?? process.cwd();

  let previousConfig = options.previousConfig;
  if (!previousConfig) {
    const existing = listInstalledMcpServers({
      global: isGlobal,
      cwd,
      agents: options.agents,
    });
    const found = existing.find((s) => s.serverName === options.serverName && s.serverConfig);
    if (found) {
      previousConfig = found.serverConfig;
    }
  }

  const serverConfig = sanitizeUpdatedServerConfig(options.config, previousConfig);

  let targetAgents = options.agents;
  if (!targetAgents || targetAgents.length === 0) {
    const existing = listInstalledMcpServers({ global: isGlobal, cwd });
    targetAgents = existing
      .filter((s) => s.serverName === options.serverName)
      .map((s) => s.agent);
  }

  const requestedTransport: McpTransportType = serverConfig.url
    ? (serverConfig.type ?? "http")
    : "stdio";

  const { allAgents, incompatible } = resolveTargetAgents({
    requested: targetAgents,
    global: isGlobal,
    cwd,
    transport: requestedTransport,
  });

  const incompatibleMap = new Map(incompatible.map((item) => [item.agent, item.reason]));

  const results: McpInstallResultForAgent[] = allAgents.map((agentType) => {
    const incompatibleReason = incompatibleMap.get(agentType);
    if (incompatibleReason) {
      return {
        agent: agentType,
        success: false,
        path: "",
        error: incompatibleReason,
      };
    }

    return installMcpServerForAgent(options.serverName, serverConfig, agentType, {
      global: isGlobal,
      cwd,
    });
  });

  return {
    serverName: options.serverName,
    config: serverConfig,
    results,
    incompatible,
  };
};
