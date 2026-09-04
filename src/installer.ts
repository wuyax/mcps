import { toErrorMessage } from "./utils/to-error-message.ts";
import { getMcpAgentConfig } from "./agents.ts";
import { agentConfigStore } from "./config-store.ts";
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

  try {
    const transformed = transformServerConfigForAgent(agent, serverName, serverConfig, {
      global: isGlobal,
    });
    const { path } = agentConfigStore.writeServer(agent, serverName, transformed, options);
    return { agent: agentType, success: true, path };
  } catch (error) {
    const { target } = agentConfigStore.resolveTarget(agent, options);
    return {
      agent: agentType,
      success: false,
      path: target.configPath,
      error: toErrorMessage(error),
    };
  }
};

export const installMcpServerForAgents = (
  serverName: string,
  serverConfig: McpServerConfig,
  agentTypes: McpAgentType[],
  options: InstallMcpServerForAgentOptions = {},
): McpInstallResultForAgent[] =>
  agentTypes.map((agentType) =>
    installMcpServerForAgent(serverName, serverConfig, agentType, options),
  );
