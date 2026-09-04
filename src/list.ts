import { getMcpAgentConfig, getMcpAgentTypes } from "./agents.ts";
import { agentConfigStore } from "./config-store.ts";
import { parseServerConfig } from "./parse-server-config.ts";
import type { ListedMcpServer, McpAgentType, McpScopeOptions } from "./types.ts";

export interface ListInstalledMcpServersOptions extends McpScopeOptions {
  agents?: McpAgentType[];
}

export const listInstalledMcpServers = (
  options: ListInstalledMcpServersOptions = {},
): ListedMcpServer[] => {
  const agentTypes = options.agents ?? getMcpAgentTypes();
  const collected: ListedMcpServer[] = [];

  for (const agentType of agentTypes) {
    const agent = getMcpAgentConfig(agentType);
    const { path, exists, servers } = agentConfigStore.listServers(agent, options);
    if (!exists) continue;

    for (const [serverName, rawConfig] of Object.entries(servers)) {
      collected.push({
        serverName,
        agent: agentType,
        path,
        config: rawConfig,
        serverConfig: parseServerConfig(rawConfig),
      });
    }
  }

  return collected;
};
