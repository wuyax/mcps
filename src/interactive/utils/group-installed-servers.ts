import type { ListedMcpServer, McpAgentType, McpServerConfig } from "../../types.ts";

export interface GroupedInstalledServer {
  serverName: string;
  agents: McpAgentType[];
  paths: string[];
  config: McpServerConfig;
  hasDivergence?: boolean;
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
    const itemConfig = normalizeServerConfig(item.config);
    let entry = grouped.get(item.serverName);
    if (!entry) {
      entry = {
        serverName: item.serverName,
        agents: [],
        paths: [],
        config: itemConfig,
        hasDivergence: false,
      };
      grouped.set(item.serverName, entry);
    } else if (!entry.hasDivergence) {
      if (JSON.stringify(entry.config) !== JSON.stringify(itemConfig)) {
        entry.hasDivergence = true;
      }
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
