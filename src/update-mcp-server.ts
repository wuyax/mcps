import { agentConfigStore } from "./config-store.ts";
import { listInstalledMcpServers } from "./list.ts";
import { resolveTargetAgents } from "./resolve-target-agents.ts";
import {
  detectUpdateTransition,
  sanitizeUpdatedServerConfig,
  toRemoteServerConfig,
  toStdioServerConfig,
  type UpdateTransitionType,
} from "./server-config.ts";
import type {
  McpInstallResultForAgent,
  McpServerConfig,
  McpTransportType,
  UpdateMcpServerOptions,
  UpdateMcpServerResult,
} from "./types.ts";

export {
  detectUpdateTransition,
  sanitizeUpdatedServerConfig,
  toRemoteServerConfig,
  toStdioServerConfig,
  type UpdateTransitionType,
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
  const compatibleAgents = allAgents.filter((agent) => !incompatibleMap.has(agent));

  const installedResults = agentConfigStore.writeServers(
    compatibleAgents,
    options.serverName,
    serverConfig,
    { global: isGlobal, cwd },
  );
  const installedMap = new Map(installedResults.map((r) => [r.agent, r]));

  const results: McpInstallResultForAgent[] = allAgents.map((agent) => {
    const incompatibleReason = incompatibleMap.get(agent);
    if (incompatibleReason) {
      return {
        agent,
        success: false,
        path: "",
        error: incompatibleReason,
      };
    }

    return installedMap.get(agent)!;
  });

  return {
    serverName: options.serverName,
    config: serverConfig,
    results,
    incompatible,
  };
};
