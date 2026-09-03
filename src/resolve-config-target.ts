import { join } from "node:path";

import type { McpAgentConfig } from "./types.ts";

export interface McpConfigTarget {
  configPath: string;
  configKey: string;
}

export interface ResolveMcpConfigTargetOptions {
  global?: boolean;
  cwd?: string;
}

export const resolveMcpConfigTarget = (
  agent: McpAgentConfig,
  options: ResolveMcpConfigTargetOptions = {},
): McpConfigTarget => {
  const isGlobal = options.global ?? false;
  const cwd = options.cwd ?? process.cwd();

  const configPath = agent.resolveConfigPath
    ? agent.resolveConfigPath({ global: isGlobal, cwd })
    : !isGlobal && agent.projectConfigPath
      ? join(cwd, agent.projectConfigPath)
      : agent.globalConfigPath;

  const configKey = !isGlobal && agent.projectConfigKey ? agent.projectConfigKey : agent.configKey;

  return { configPath, configKey };
};
