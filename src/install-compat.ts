import { agentConfigStore } from "./config-store.ts";
import type {
  McpAgentType,
  McpInstallResultForAgent,
  McpScopeOptions,
  McpServerConfig,
} from "./types.ts";

export type InstallMcpServerForAgentOptions = McpScopeOptions;

export interface InstallToCompatibleAgentsOptions extends McpScopeOptions {
  allAgents: McpAgentType[];
  incompatible?: Array<{ agent: McpAgentType; reason: string }>;
}

/**
 * Backward-compatible wrapper: installs a server config for a single agent
 * via the deepened AgentConfigStore.
 */
export const installMcpServerForAgent = (
  serverName: string,
  serverConfig: McpServerConfig,
  agentType: McpAgentType,
  options: InstallMcpServerForAgentOptions = {},
): McpInstallResultForAgent => {
  const results = agentConfigStore.writeServers([agentType], serverName, serverConfig, options);
  return results[0]!;
};

/**
 * Backward-compatible wrapper: installs a server config to multiple agents
 * via the deepened AgentConfigStore.
 */
export const installMcpServerForAgents = (
  serverName: string,
  serverConfig: McpServerConfig,
  agentTypes: McpAgentType[],
  options: InstallMcpServerForAgentOptions = {},
): McpInstallResultForAgent[] => {
  return agentConfigStore.writeServers(agentTypes, serverName, serverConfig, options);
};

/**
 * Backward-compatible wrapper: filters out incompatible agents and installs
 * to the remaining compatible ones via the deepened AgentConfigStore.
 */
export const installToCompatibleAgents = (
  serverName: string,
  serverConfig: McpServerConfig,
  options: InstallToCompatibleAgentsOptions,
): McpInstallResultForAgent[] => {
  const { allAgents, incompatible = [], global: isGlobal, cwd } = options;
  const incompatibleMap = new Map(incompatible.map((item) => [item.agent, item.reason]));
  const compatibleAgents = allAgents.filter((a) => !incompatibleMap.has(a));

  const installedResults = agentConfigStore.writeServers(
    compatibleAgents,
    serverName,
    serverConfig,
    {
      global: isGlobal,
      cwd,
    },
  );
  const installedMap = new Map(installedResults.map((r) => [r.agent, r]));

  return allAgents.map((agentType) => {
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
};
