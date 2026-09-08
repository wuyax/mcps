import { toErrorMessage } from "./utils/to-error-message.ts";
import { getMcpAgentConfig } from "./agents.ts";
import { agentConfigStore } from "./config-store.ts";
import { getCoHostedAgents, resolveConfigClusters } from "./resolve-config-clusters.ts";
import { resolveTargetAgents } from "./resolve-target-agents.ts";
import type { McpAgentType, RemoveMcpServerOptions, RemoveMcpServerResult } from "./types.ts";

export const removeMcpServerFromAgent = (
  serverName: string,
  agentType: McpAgentType,
  options: { global?: boolean; cwd?: string } = {},
): RemoveMcpServerResult => {
  const agent = getMcpAgentConfig(agentType);
  const { target } = agentConfigStore.resolveTarget(agent, options);
  const coHosted = getCoHostedAgents(agentType, options);

  try {
    const { removed } = agentConfigStore.removeServer(agent, serverName, options);
    return {
      agent: agentType,
      path: target.configPath,
      removed,
      coAffectedAgents: removed && coHosted.length > 0 ? coHosted : undefined,
    };
  } catch (error) {
    return {
      agent: agentType,
      path: target.configPath,
      removed: false,
      error: toErrorMessage(error),
    };
  }
};

export const removeMcpServer = (options: RemoveMcpServerOptions): RemoveMcpServerResult[] => {
  const { allAgents } = resolveTargetAgents({
    requested: options.agents,
    all: !options.agents,
    global: options.global,
    cwd: options.cwd,
  });

  const clusters = resolveConfigClusters(allAgents, {
    global: options.global,
    cwd: options.cwd,
  });

  const results: RemoveMcpServerResult[] = [];

  for (const cluster of clusters) {
    const primaryAgentType = cluster.targetAgents[0]!;
    const primaryAgent = getMcpAgentConfig(primaryAgentType);

    try {
      const { removed } = agentConfigStore.removeServer(primaryAgent, options.name, {
        global: options.global,
        cwd: options.cwd,
      });

      if (removed) {
        for (const agentType of cluster.targetAgents) {
          results.push({
            agent: agentType,
            path: cluster.configPath,
            removed: true,
            coAffectedAgents:
              cluster.coHostedAgents.length > 0 ? cluster.coHostedAgents : undefined,
          });
        }
      }
    } catch (error) {
      const errorMsg = toErrorMessage(error);
      for (const agentType of cluster.targetAgents) {
        results.push({
          agent: agentType,
          path: cluster.configPath,
          removed: false,
          error: errorMsg,
        });
      }
    }
  }

  return results;
};
