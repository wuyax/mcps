import { toErrorMessage } from "./utils/to-error-message.ts";
import { getMcpAgentConfig } from "./agents.ts";
import { writeServerToConfigFile } from "./formats/index.ts";
import { resolveMcpConfigTarget } from "./resolve-config-target.ts";
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
  const { configPath, configKey } = resolveMcpConfigTarget(agent, options);
  const isGlobal = options.global ?? false;

  try {
    const transformed = transformServerConfigForAgent(agent, serverName, serverConfig, {
      global: isGlobal,
    });

    writeServerToConfigFile(configPath, agent.format, configKey, serverName, transformed);
    return { agent: agentType, success: true, path: configPath };
  } catch (error) {
    return {
      agent: agentType,
      success: false,
      path: configPath,
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
