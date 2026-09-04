import { toErrorMessage } from "./utils/to-error-message.ts";
import { getMcpAgentConfig, getMcpAgentTypes } from "./agents.ts";
import { agentConfigStore } from "./config-store.ts";
import type { McpAgentType, RemoveMcpServerOptions, RemoveMcpServerResult } from "./types.ts";

export const removeMcpServerFromAgent = (
  serverName: string,
  agentType: McpAgentType,
  options: { global?: boolean; cwd?: string } = {},
): RemoveMcpServerResult => {
  const agent = getMcpAgentConfig(agentType);

  try {
    const { path, removed } = agentConfigStore.removeServer(agent, serverName, options);
    return { agent: agentType, path, removed };
  } catch (error) {
    const { target } = agentConfigStore.resolveTarget(agent, options);
    return {
      agent: agentType,
      path: target.configPath,
      removed: false,
      error: toErrorMessage(error),
    };
  }
};

export const removeMcpServer = (options: RemoveMcpServerOptions): RemoveMcpServerResult[] => {
  const agentTypes = options.agents ?? getMcpAgentTypes();
  const results: RemoveMcpServerResult[] = [];

  for (const agentType of agentTypes) {
    const result = removeMcpServerFromAgent(options.name, agentType, {
      global: options.global,
      cwd: options.cwd,
    });
    if (result.removed || result.error) results.push(result);
  }

  return results;
};
