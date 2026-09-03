import { existsSync } from "node:fs";

import { getMcpAgentConfig, getMcpAgentTypes } from "./agents.ts";
import { listServersInConfigFile } from "./formats/index.ts";
import { parseServerConfig } from "./parse-server-config.ts";
import { resolveMcpConfigTarget } from "./resolve-config-target.ts";
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
    const { configPath, configKey } = resolveMcpConfigTarget(agent, options);
    if (!existsSync(configPath)) continue;

    const entries = listServersInConfigFile(configPath, agent.format, configKey);
    for (const [serverName, rawConfig] of Object.entries(entries)) {
      collected.push({
        serverName,
        agent: agentType,
        path: configPath,
        config: rawConfig,
        serverConfig: parseServerConfig(rawConfig),
      });
    }
  }

  return collected;
};
