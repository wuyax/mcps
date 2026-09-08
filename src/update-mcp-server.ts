import { installMcpServerForAgents } from "./installer.ts";
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

export type UpdateTransitionType =
  | "switch-to-remote"
  | "switch-to-stdio"
  | "merge-remote"
  | "merge-stdio";

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
    case "merge-stdio": {
      return toStdioServerConfig({ ...previous, ...incoming });
    }
  }
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
  const compatibleAgents = allAgents.filter((a) => !incompatibleMap.has(a));
  const installedResults = installMcpServerForAgents(options.serverName, serverConfig, compatibleAgents, {
    global: isGlobal,
    cwd,
  });
  const installedMap = new Map(installedResults.map((r) => [r.agent, r]));

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

    return installedMap.get(agentType)!;
  });

  return {
    serverName: options.serverName,
    config: serverConfig,
    results,
    incompatible,
  };
};
