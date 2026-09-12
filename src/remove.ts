import { agentConfigStore } from "./config-store.ts";
import { resolveTargetAgents } from "./resolve-target-agents.ts";
import type {
  McpAgentType,
  McpScopeOptions,
  RemoveMcpServerOptions,
  RemoveMcpServerResult,
} from "./types.ts";

export const removeMcpServerFromAgent = (
  serverName: string,
  agentType: McpAgentType,
  options: McpScopeOptions = {},
): RemoveMcpServerResult => {
  const results = agentConfigStore.removeServers([agentType], serverName, options);
  return results[0]!;
};

export const removeMcpServer = (options: RemoveMcpServerOptions): RemoveMcpServerResult[] => {
  const { allAgents } = resolveTargetAgents({
    requested: options.agents,
    all: !options.agents,
    global: options.global,
    cwd: options.cwd,
  });

  const storeResults = agentConfigStore.removeServers(allAgents, options.name, {
    global: options.global,
    cwd: options.cwd,
  });

  return storeResults.filter((r) => r.removed || Boolean(r.error));
};
