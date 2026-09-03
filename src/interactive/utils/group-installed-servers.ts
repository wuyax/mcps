import type { ListedMcpServer, McpAgentType, McpServerConfig } from "../../types.ts";

export interface GroupedInstalledServer {
  serverName: string;
  agents: McpAgentType[];
  paths: string[];
  config: McpServerConfig;
}

import { parseServerConfig } from "../../parse-server-config.ts";

export const normalizeServerConfig = parseServerConfig;

/**
 * Groups a flat array of ListedMcpServer entries by serverName.
 */
export const groupInstalledServersByName = (
  installed: ListedMcpServer[],
): Map<string, GroupedInstalledServer> => {
  const grouped = new Map<string, GroupedInstalledServer>();

  for (const item of installed) {
    let entry = grouped.get(item.serverName);
    if (!entry) {
      entry = {
        serverName: item.serverName,
        agents: [],
        paths: [],
        config: normalizeServerConfig(item.config),
      };
      grouped.set(item.serverName, entry);
    }
    if (!entry.agents.includes(item.agent)) {
      entry.agents.push(item.agent);
    }
    if (!entry.paths.includes(item.path)) {
      entry.paths.push(item.path);
    }
  }

  return grouped;
};
