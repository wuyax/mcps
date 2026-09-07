import { installMcpServerForAgent } from "./installer.ts";
import { listInstalledMcpServers } from "./list.ts";
import { resolveTargetAgents } from "./resolve-target-agents.ts";
import type {
  McpInstallResultForAgent,
  McpServerConfig,
  McpTransportType,
  UpdateMcpServerOptions,
  UpdateMcpServerResult,
} from "./types.ts";

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
      const { command: _c, args: _a, env: _e, ...remoteConfig } = incoming;
      return {
        ...remoteConfig,
        type: remoteConfig.type ?? "http",
      };
    }
    const { url: _u, type: _t, headers: _h, ...stdioConfig } = incoming;
    return stdioConfig;
  }

  const isSwitchingToRemote = Boolean(incoming.url) && !incoming.command;
  const isSwitchingToStdio = Boolean(incoming.command) && !incoming.url;

  if (isSwitchingToRemote) {
    const { command: _c, args: _a, env: _e, ...rest } = previous;
    const merged = { ...rest, ...incoming };
    return {
      ...merged,
      type: incoming.type ?? previous.type ?? "http",
    };
  }

  if (isSwitchingToStdio) {
    const { url: _u, type: _t, headers: _h, ...rest } = previous;
    return {
      ...rest,
      ...incoming,
    };
  }

  const merged = { ...previous, ...incoming };
  if (merged.url && !incoming.command) {
    const { command: _c, args: _a, env: _e, ...remoteConfig } = merged;
    return {
      ...remoteConfig,
      type: remoteConfig.type ?? "http",
    };
  }
  if (merged.command && !incoming.url) {
    const { url: _u, type: _t, headers: _h, ...stdioConfig } = merged;
    return stdioConfig;
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
