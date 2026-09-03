import { checkbox, confirm, select } from "@inquirer/prompts";
import pc from "picocolors";

import {
  getMcpAgentConfig,
  getMcpAgentsSupportingProjectScope,
  getMcpAgentTypes,
} from "../agents.ts";
import { installMcpServerForAgent } from "../installer.ts";
import { listInstalledMcpServers } from "../list.ts";
import type { McpAgentType, McpScopeOptions, McpServerConfig } from "../types.ts";
import { logger } from "../utils/logger.ts";

import { promptScope } from "./prompts/scope.ts";
import { groupInstalledServersByName } from "./utils/group-installed-servers.ts";
import { isRemoteServerConfig, isStdioServerConfig } from "../parse-server-config.ts";

export type WizardManageOptions = McpScopeOptions;

export const wizardManage = async (options: WizardManageOptions = {}): Promise<void> => {
  const cwd = options.cwd ?? process.cwd();

  const isGlobal = await promptScope({
    cwd,
    defaultGlobal: options.global,
    message: "Select MCP scope to inspect and manage:",
  });

  const installed = listInstalledMcpServers({ global: isGlobal, cwd });

  if (installed.length === 0) {
    logger.warn(`No configured MCP servers found in ${isGlobal ? "global" : "project"} scope`);
    return;
  }

  const grouped = groupInstalledServersByName(installed);

  while (true) {
    const choices = Array.from(grouped.values()).map((g) => {
      const agentNames = g.agents.map((a) => getMcpAgentConfig(a).displayName).join(", ");
      return {
        name: `${pc.bold(g.serverName)} ${pc.dim(`(configured in: ${agentNames})`)}`,
        value: g.serverName,
      };
    });

    choices.push({
      name: `Back`,
      value: "__back__",
    });

    const chosenServerName = await select({
      message: "Select MCP server to manage or sync:",
      choices,
    });

    if (chosenServerName === "__back__") {
      return;
    }

    const targetGroup = grouped.get(chosenServerName);
    if (!targetGroup) continue;

    // Display details
    console.log("\n" + pc.cyan(pc.bold(`MCP Server Details: [${chosenServerName}]`)));
    console.log(`  ${pc.bold("Scope:")} ${isGlobal ? "Global" : "Project"}`);
    console.log(
      `  ${pc.bold("Configured Agents:")} ${pc.green(targetGroup.agents.map((a) => getMcpAgentConfig(a).displayName).join(", "))}`,
    );

    const cfg = targetGroup.config;
    if (isRemoteServerConfig(cfg)) {
      console.log(`  ${pc.bold("URL:")} ${pc.dim(cfg.url)} (${cfg.type})`);
      if (cfg.headers && Object.keys(cfg.headers).length > 0) {
        console.log(`  ${pc.bold("Headers:")} ${Object.keys(cfg.headers).join(", ")}`);
      }
    } else if (isStdioServerConfig(cfg)) {
      console.log(`  ${pc.bold("Command:")} ${pc.magenta(cfg.command)}`);
      if (cfg.args && cfg.args.length > 0) {
        console.log(`  ${pc.bold("Arguments:")} ${pc.dim(cfg.args.join(" "))}`);
      }
      if (cfg.env && Object.keys(cfg.env).length > 0) {
        console.log(`  ${pc.bold("Environment Variables:")} ${pc.dim(Object.keys(cfg.env).join(", "))}`);
      }
    }
    console.log();

    const action = await select({
      message: `What would you like to do with [${chosenServerName}]?`,
      choices: [
        {
          name: "Sync / clone to other agents",
          value: "sync",
        },
        {
          name: "Back to list",
          value: "back",
        },
      ],
    });

    if (action === "back") continue;

    if (action === "sync") {
      const allAllowedAgents = isGlobal
        ? getMcpAgentTypes()
        : getMcpAgentsSupportingProjectScope();

      const candidateAgents = allAllowedAgents.filter((a) => !targetGroup.agents.includes(a));

      if (candidateAgents.length === 0) {
        logger.info("All supported agents in this scope already have this MCP server configured; no sync needed");
        continue;
      }

      const selectedToSync = await checkbox<McpAgentType>({
        message: "Select target agents to sync to (Space to select):",
        choices: candidateAgents.map((a) => ({
          name: `${getMcpAgentConfig(a).displayName} (${a})`,
          value: a,
          checked: false,
        })),
        validate: (ans) => (ans.length === 0 ? "Please select at least one agent" : true),
      });

      const confirmed = await confirm({
        message: `Confirm syncing configuration of [${chosenServerName}] to: ${selectedToSync.join(", ")}?`,
        default: true,
      });

      if (!confirmed) {
        logger.warn("Sync cancelled");
        continue;
      }

      for (const targetAgent of selectedToSync) {
        const res = installMcpServerForAgent(chosenServerName, targetGroup.config, targetAgent, {
          global: isGlobal,
          cwd,
        });
        if (res.success) {
          logger.success(`${pc.cyan(targetAgent)}: Successfully synced to ${pc.dim(res.path)}`);
          targetGroup.agents.push(targetAgent);
        } else {
          logger.error(`${pc.cyan(targetAgent)}: Sync failed - ${res.error}`);
        }
      }
    }
  }
};
