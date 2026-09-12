import { installToCompatibleAgents } from "./install-compat.ts";
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

  const results = installToCompatibleAgents(options.serverName, serverConfig, {
    allAgents,
    incompatible,
    global: isGlobal,
    cwd,
  });

  return {
    serverName: options.serverName,
    config: serverConfig,
    results,
    incompatible,
  };
};
