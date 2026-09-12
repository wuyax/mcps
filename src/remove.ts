import { getMcpAgentConfig } from "./agents.ts";
import { agentConfigStore } from "./config-store.ts";
import { resolveTargetAgents } from "./resolve-target-agents.ts";
import type { McpAgentType, RemoveMcpServerOptions, RemoveMcpServerResult } from "./types.ts";
import { toErrorMessage } from "./utils/to-error-message.ts";

export const removeMcpServerFromAgent = (
  serverName: string,
  agentType: McpAgentType,
  options: { global?: boolean; cwd?: string } = {},
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
