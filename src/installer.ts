import { toErrorMessage } from "./utils/to-error-message.ts";
import { getMcpAgentConfig } from "./agents.ts";
import { agentConfigStore } from "./config-store.ts";
import { getCoHostedAgents, resolveConfigClusters } from "./resolve-config-clusters.ts";
import { transformServerConfigForAgent } from "./transforms/index.ts";
import type {
  McpAgentType,
  McpInstallResultForAgent,
  McpScopeOptions,
  McpServerConfig,
} from "./types.ts";

export type InstallMcpServerForAgentOptions = McpScopeOptions;

export const installMcpServerForAgent = (
  serverName: string,
  serverConfig: McpServerConfig,
  agentType: McpAgentType,
  options: InstallMcpServerForAgentOptions = {},
): McpInstallResultForAgent => {
  const agent = getMcpAgentConfig(agentType);
  const isGlobal = options.global ?? false;
  const { target } = agentConfigStore.resolveTarget(agent, options);
  const coHosted = getCoHostedAgents(agentType, options);

  try {
    const transformed = transformServerConfigForAgent(agent, serverName, serverConfig, {
      global: isGlobal,
    });
    agentConfigStore.writeServer(agent, serverName, transformed, options);
    return {
      agent: agentType,
      success: true,
      path: target.configPath,
      coConfiguredAgents: coHosted.length > 0 ? coHosted : undefined,
    };
  } catch (error) {
    return {
      agent: agentType,
      success: false,
      path: target.configPath,
      coConfiguredAgents: coHosted.length > 0 ? coHosted : undefined,
      error: toErrorMessage(error),
    };
  }
};

export const installMcpServerForAgents = (
  serverName: string,
  serverConfig: McpServerConfig,
  agentTypes: McpAgentType[],
  options: InstallMcpServerForAgentOptions = {},
): McpInstallResultForAgent[] => {
  const clusters = resolveConfigClusters(agentTypes, options);
  const resultsByAgent = new Map<McpAgentType, McpInstallResultForAgent>();
  const isGlobal = options.global ?? false;

  for (const cluster of clusters) {
    const primaryAgentType = cluster.targetAgents[0]!;
    const primaryAgent = getMcpAgentConfig(primaryAgentType);

    try {
      const transformed = transformServerConfigForAgent(primaryAgent, serverName, serverConfig, {
        global: isGlobal,
      });
      agentConfigStore.writeServer(primaryAgent, serverName, transformed, options);

      for (const agentType of cluster.targetAgents) {
        resultsByAgent.set(agentType, {
          agent: agentType,
          success: true,
          path: cluster.configPath,
          coConfiguredAgents:
            cluster.coHostedAgents.length > 0 ? cluster.coHostedAgents : undefined,
        });
      }
    } catch (error) {
      const errorMsg = toErrorMessage(error);
      for (const agentType of cluster.targetAgents) {
        resultsByAgent.set(agentType, {
          agent: agentType,
          success: false,
          path: cluster.configPath,
          error: errorMsg,
        });
      }
    }
  }

  return agentTypes.map((agentType) => resultsByAgent.get(agentType)!);
};
