import { getMcpAgentConfig, getMcpAgentTypes } from "./agents.ts";
import { agentConfigStore } from "./config-store.ts";
import { parseServerConfig } from "./parse-server-config.ts";
import type {
  GroupedInstalledServer,
  ListedMcpServer,
  McpAgentType,
  McpScopeOptions,
} from "./types.ts";

export { parseServerConfig as normalizeServerConfig };
export type { GroupedInstalledServer };

export interface ListInstalledMcpServersOptions extends McpScopeOptions {
  agents?: McpAgentType[];
}

/**
 * Deep module query: Lists installed MCP servers across agents,
 * caching file reads for co-hosted agents sharing the same physical configuration file.
 */
export const listInstalledMcpServers = (
  options: ListInstalledMcpServersOptions = {},
): ListedMcpServer[] => {
  const agentTypes = options.agents ?? getMcpAgentTypes();
  const collected: ListedMcpServer[] = [];
  const readCache = new Map<string, { path: string; exists: boolean; servers: Record<string, unknown> }>();

  for (const agentType of agentTypes) {
    const agent = getMcpAgentConfig(agentType);
    const descriptor = agentConfigStore.resolveDescriptor(agent, options);
    const cacheKey = `${descriptor.filePath}::${descriptor.dottedKey ?? ""}`;

    let cached = readCache.get(cacheKey);
    if (!cached) {
      cached = agentConfigStore.listServers(agent, options);
      readCache.set(cacheKey, cached);
    }

    if (!cached.exists) continue;

    for (const [serverName, rawConfig] of Object.entries(cached.servers)) {
      collected.push({
        serverName,
        agent: agentType,
        path: cached.path,
        config: rawConfig,
        serverConfig: parseServerConfig(rawConfig),
      });
    }
  }

  return collected;
};

/**
 * Groups a flat array of ListedMcpServer entries by serverName,
 * aggregating all agents and config paths where the server is installed,
 * and checking whether configurations diverge across agents.
 */
export const groupInstalledServersByName = (
  installed: ListedMcpServer[],
): Map<string, GroupedInstalledServer> => {
  const grouped = new Map<string, GroupedInstalledServer>();

  for (const item of installed) {
    const itemConfig = item.serverConfig ?? parseServerConfig(item.config);
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

/**
 * High-level query combining server listing and grouping in a single call.
 */
export const queryGroupedInstalledServers = (
  options: ListInstalledMcpServersOptions = {},
): Map<string, GroupedInstalledServer> => {
  const installed = listInstalledMcpServers(options);
  return groupInstalledServersByName(installed);
};
