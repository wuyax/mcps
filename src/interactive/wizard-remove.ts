import { checkbox, confirm, select } from "@inquirer/prompts";
import pc from "picocolors";

import { getMcpAgentConfig } from "../agents.ts";
import { listInstalledMcpServers } from "../list.ts";
import { removeMcpServer } from "../remove.ts";
import type { McpAgentType, McpScopeOptions } from "../types.ts";
import { logger } from "../utils/logger.ts";

import { promptScope } from "./prompts/scope.ts";
import { groupInstalledServersByName } from "./utils/group-installed-servers.ts";

export interface WizardRemoveOptions extends McpScopeOptions {
  name?: string;
  agents?: McpAgentType[];
}

export const wizardRemove = async (options: WizardRemoveOptions = {}): Promise<boolean> => {
  const cwd = options.cwd ?? process.cwd();

  const isGlobal = await promptScope({
    cwd,
    defaultGlobal: options.global,
    message: "Select scope to remove MCP server from:",
  });

  const installed = listInstalledMcpServers({ global: isGlobal, cwd });

  if (installed.length === 0) {
    logger.warn(`No installed MCP servers found in ${isGlobal ? "global" : "project"} scope`);
    return false;
  }

  const serverMap = groupInstalledServersByName(installed);

  let serverName = options.name;
  if (!serverName) {
    const choices = Array.from(serverMap.values()).map((g) => ({
      name: `${pc.bold(g.serverName)} ${pc.dim(`(installed in: ${g.agents.map((a) => getMcpAgentConfig(a).displayName).join(", ")})`)}`,
      value: g.serverName,
    }));

    serverName = await select({
      message: "Select MCP server to remove:",
      choices,
    });
  }

  const installedAgents = serverMap.get(serverName)?.agents || [];
  if (installedAgents.length === 0) {
    logger.warn(`No agents found with [${serverName}] installed`);
    return false;
  }

  let targetAgents = options.agents;

  if (!targetAgents || targetAgents.length === 0) {
    targetAgents = await checkbox<McpAgentType>({
      message: `Select agents to remove [${serverName}] from:`,
      choices: installedAgents.map((agent) => ({
        name: `${getMcpAgentConfig(agent)?.displayName ?? agent} (${agent})`,
        value: agent,
        checked: true,
      })),
      validate: (ans) => (ans.length === 0 ? "Please select at least one agent" : true),
    });
  } else {
    const validAgents = targetAgents.filter((agent) => installedAgents.includes(agent));
    if (validAgents.length === 0) {
      logger.warn(`None of the specified agents (${targetAgents.join(", ")}) have [${serverName}] installed`);
      return false;
    }
    targetAgents = validAgents;
  }

  const confirmed = await confirm({
    message: `Confirm removing MCP server [${serverName}] from ${targetAgents.join(", ")}?`,
    default: true,
  });

  if (!confirmed) {
    logger.warn("Operation cancelled");
    return false;
  }

  const results = removeMcpServer({
    name: serverName,
    agents: targetAgents,
    global: isGlobal,
    cwd,
  });

  let removedCount = 0;
  for (const res of results) {
    if (res.removed) {
      logger.success(`${pc.cyan(res.agent)}: Successfully removed from ${pc.dim(res.path)}`);
      removedCount++;
    } else if (res.error) {
      logger.error(`${pc.cyan(res.agent)}: Failed to remove - ${res.error}`);
    }
  }

  if (removedCount > 0) {
    logger.success(`Successfully removed [${serverName}] from ${removedCount} agent(s)`);
    return true;
  }

  logger.warn(`Failed to remove [${serverName}] from specified agents`);
  return false;
};
