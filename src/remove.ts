import { existsSync } from "node:fs";

import { toErrorMessage } from "./utils/to-error-message.ts";
import { getMcpAgentConfig, getMcpAgentTypes } from "./agents.ts";
import { removeServerFromConfigFile } from "./formats/index.ts";
import { resolveMcpConfigTarget } from "./resolve-config-target.ts";
import type { McpAgentType, RemoveMcpServerOptions, RemoveMcpServerResult } from "./types.ts";

export const removeMcpServerFromAgent = (
  serverName: string,
  agentType: McpAgentType,
  options: { global?: boolean; cwd?: string } = {},
): RemoveMcpServerResult => {
  const agent = getMcpAgentConfig(agentType);
  const { configPath, configKey } = resolveMcpConfigTarget(agent, options);

  if (!existsSync(configPath)) {
    return { agent: agentType, path: configPath, removed: false };
  }

  try {
    const removed = removeServerFromConfigFile(configPath, agent.format, configKey, serverName);
    return { agent: agentType, path: configPath, removed };
  } catch (error) {
    return {
      agent: agentType,
      path: configPath,
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
