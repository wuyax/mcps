import { checkbox, confirm, input, select } from "@inquirer/prompts";
import pc from "picocolors";

import {
  getMcpAgentConfig,
  getMcpAgentsSupportingProjectScope,
  getMcpAgentTypes,
  isMcpTransportSupported,
} from "../agents.ts";
import { installMcpServerForAgent } from "../installer.ts";
import { listInstalledMcpServers } from "../list.ts";
import type {
  McpAgentType,
  McpRemoteTransport,
  McpScopeOptions,
  McpServerConfig,
  McpTransportType,
} from "../types.ts";
import { logger } from "../utils/logger.ts";

import { promptEditArgs } from "./prompts/args.ts";
import { maskSecretValue, promptEditEnvConfig } from "./prompts/env.ts";
import { maskSecretHeader, promptEditHeadersConfig } from "./prompts/headers.ts";
import { promptScope } from "./prompts/scope.ts";
import {
  groupInstalledServersByName,
  type GroupedInstalledServer,
} from "./utils/group-installed-servers.ts";

export interface WizardManageOptions extends McpScopeOptions {
  serverName?: string;
}

/**
 * Reusable display function for server details with secret masking.
 */
export const displayServerDetails = ({
  serverName,
  config,
  agents,
  isGlobal,
  titlePrefix = "MCP Server Details",
}: {
  serverName: string;
  config: McpServerConfig;
  agents?: McpAgentType[];
  isGlobal?: boolean;
  titlePrefix?: string;
}): void => {
  console.log("\n" + pc.cyan(pc.bold(`${titlePrefix}: [${serverName}]`)));
  if (isGlobal !== undefined) {
    console.log(`  ${pc.bold("Scope:")} ${isGlobal ? "Global" : "Project"}`);
  }
  if (agents && agents.length > 0) {
    console.log(
      `  ${pc.bold("Configured Agents:")} ${pc.green(agents.map((a) => getMcpAgentConfig(a).displayName).join(", "))}`,
    );
  }

  const isRemote = Boolean(config.url && config.url.length > 0);
  if (isRemote) {
    console.log(`  ${pc.bold("Transport:")} ${pc.magenta(config.type ?? "http")}`);
    console.log(`  ${pc.bold("URL:")} ${pc.dim(config.url ?? "")}`);
    const headerKeys = Object.keys(config.headers ?? {});
    if (headerKeys.length > 0) {
      console.log(`  ${pc.bold("Headers:")} ${pc.cyan(String(headerKeys.length))}`);
      for (const [k, v] of Object.entries(config.headers ?? {})) {
        console.log(`    ${pc.bold(k)}: ${pc.dim(maskSecretHeader(k, v))}`);
      }
    } else {
      console.log(`  ${pc.bold("Headers:")} ${pc.dim("(none)")}`);
    }
  } else {
    console.log(`  ${pc.bold("Command:")} ${pc.magenta(config.command ?? "")}`);
    const argsStr =
      config.args && config.args.length > 0 ? config.args.join(" ") : "(none)";
    console.log(`  ${pc.bold("Arguments:")} ${pc.dim(argsStr)}`);
    const envKeys = Object.keys(config.env ?? {});
    if (envKeys.length > 0) {
      console.log(`  ${pc.bold("Environment Variables:")} ${pc.cyan(String(envKeys.length))}`);
      for (const [k, v] of Object.entries(config.env ?? {})) {
        console.log(`    ${pc.bold(k)}=${pc.dim(maskSecretValue(k, v))}`);
      }
    } else {
      console.log(`  ${pc.bold("Environment Variables:")} ${pc.dim("(none)")}`);
    }
  }
  console.log();
};

const handleEditServerConfig = async ({
  targetGroup,
  isGlobal,
  cwd,
}: {
  targetGroup: GroupedInstalledServer;
  isGlobal: boolean;
  cwd: string;
}): Promise<void> => {
  const serverName = targetGroup.serverName;
  let workingConfig: McpServerConfig = {
    ...targetGroup.config,
    args: targetGroup.config.args ? [...targetGroup.config.args] : undefined,
    env: targetGroup.config.env ? { ...targetGroup.config.env } : undefined,
    headers: targetGroup.config.headers ? { ...targetGroup.config.headers } : undefined,
  };

  while (true) {
    const isRemote = Boolean(workingConfig.url && workingConfig.url.length > 0);

    displayServerDetails({
      serverName,
      config: workingConfig,
      titlePrefix: "Edit Server Configuration",
    });

    const editChoices = isRemote
      ? [
          { name: "Edit HTTP Headers (headers)", value: "headers" },
          { name: "Edit Remote URL (url)", value: "url" },
          { name: "Edit Transport Protocol (type)", value: "transport" },
          { name: "Reset changes to original", value: "reset" },
          { name: "Save and apply changes", value: "save" },
          { name: "Cancel (discard changes)", value: "cancel" },
        ]
      : [
          { name: "Edit Environment Variables (env)", value: "env" },
          { name: "Edit Command Arguments (args)", value: "args" },
          { name: "Edit Executable Command (command)", value: "command" },
          { name: "Reset changes to original", value: "reset" },
          { name: "Save and apply changes", value: "save" },
          { name: "Cancel (discard changes)", value: "cancel" },
        ];

    const editAction = await select({
      message: `What would you like to modify in [${serverName}]?`,
      choices: editChoices,
    });

    if (editAction === "cancel") {
      logger.info("Modification cancelled; changes discarded");
      return;
    }

    if (editAction === "reset") {
      workingConfig = {
        ...targetGroup.config,
        args: targetGroup.config.args ? [...targetGroup.config.args] : undefined,
        env: targetGroup.config.env ? { ...targetGroup.config.env } : undefined,
        headers: targetGroup.config.headers ? { ...targetGroup.config.headers } : undefined,
      };
      logger.info("Configuration reset to original");
      continue;
    }

    if (editAction === "env") {
      workingConfig.env = await promptEditEnvConfig(workingConfig.env ?? {});
    } else if (editAction === "args") {
      workingConfig.args = await promptEditArgs(workingConfig.args ?? []);
    } else if (editAction === "command") {
      const newCmd = await input({
        message: "Executable command:",
        default: workingConfig.command,
        validate: (val) => (val.trim() ? true : "Command cannot be empty"),
      });
      workingConfig.command = newCmd.trim();
    } else if (editAction === "headers") {
      workingConfig.headers = await promptEditHeadersConfig(workingConfig.headers ?? {});
    } else if (editAction === "url") {
      const newUrl = await input({
        message: "Remote server URL:",
        default: workingConfig.url,
        validate: (val) => {
          const trimmed = val.trim();
          if (!trimmed) return "URL cannot be empty";
          if (!/^https?:\/\//i.test(trimmed)) {
            return "Please enter a valid URL starting with http:// or https://";
          }
          return true;
        },
      });
      workingConfig.url = newUrl.trim();
    } else if (editAction === "transport") {
      workingConfig.type = await select<McpRemoteTransport>({
        message: "Select remote transport protocol:",
        choices: [
          { name: "HTTP", value: "http" },
          { name: "SSE (Server-Sent Events)", value: "sse" },
        ],
        default: workingConfig.type === "sse" ? "sse" : "http",
      });
    } else if (editAction === "save") {
      let targetAgents: McpAgentType[] = targetGroup.agents;

      if (targetGroup.agents.length > 1) {
        targetAgents = await checkbox<McpAgentType>({
          message: "Select agents to update configuration (Space to toggle):",
          choices: targetGroup.agents.map((a) => ({
            name: `${getMcpAgentConfig(a).displayName} (${a})`,
            value: a,
            checked: true,
          })),
          loop: false,
          validate: (ans) => (ans.length === 0 ? "Please select at least one agent" : true),
        });
      }

      // Check transport compatibility for target agents
      const requestedTransport: McpTransportType = workingConfig.url
        ? workingConfig.type ?? "http"
        : "stdio";

      const compatibleAgents: McpAgentType[] = [];
      const incompatibleAgents: { agent: McpAgentType; reason: string }[] = [];

      for (const agent of targetAgents) {
        const agentConfig = getMcpAgentConfig(agent);
        if (isMcpTransportSupported(agentConfig, requestedTransport)) {
          compatibleAgents.push(agent);
        } else {
          const reason =
            agentConfig.unsupportedTransportMessage ??
            `Agent does not support ${requestedTransport} transport`;
          incompatibleAgents.push({ agent, reason });
        }
      }


      if (incompatibleAgents.length > 0) {
        for (const item of incompatibleAgents) {
          logger.warn(`Skipping ${pc.cyan(item.agent)}: ${item.reason}`);
        }
      }

      if (compatibleAgents.length === 0) {
        logger.error(
          `None of the selected agents support ${requestedTransport} transport. Cannot update.`,
        );
        continue;
      }

      const agentNames = compatibleAgents.map((a) => getMcpAgentConfig(a).displayName).join(", ");
      const confirmed = await confirm({
        message: `Confirm updating configuration for [${serverName}] across: ${agentNames}?`,
        default: true,
      });

      if (!confirmed) {
        logger.warn("Update cancelled");
        continue;
      }

      for (const targetAgent of compatibleAgents) {
        const res = installMcpServerForAgent(serverName, workingConfig, targetAgent, {
          global: isGlobal,
          cwd,
        });
        if (res.success) {
          logger.success(
            `${pc.cyan(targetAgent)}: Successfully updated configuration in ${pc.dim(res.path)}`,
          );
        } else {
          logger.error(`${pc.cyan(targetAgent)}: Update failed - ${res.error}`);
        }
      }

      targetGroup.config = workingConfig;
      logger.success(`Configuration for [${serverName}] updated successfully!`);
      return;
    }
  }
};

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
  let pendingServerName = options.serverName;

  while (true) {
    let chosenServerName: string;

    if (pendingServerName && grouped.has(pendingServerName)) {
      chosenServerName = pendingServerName;
      pendingServerName = undefined;
    } else {
      pendingServerName = undefined;
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

      chosenServerName = await select({
        message: "Select MCP server to manage or sync:",
        choices,
      });

      if (chosenServerName === "__back__") {
        return;
      }
    }

    const targetGroup = grouped.get(chosenServerName);
    if (!targetGroup) continue;

    displayServerDetails({
      serverName: chosenServerName,
      config: targetGroup.config,
      agents: targetGroup.agents,
      isGlobal,
    });

    const action = await select({
      message: `What would you like to do with [${chosenServerName}]?`,
      choices: [
        {
          name: "Edit server configuration",
          value: "edit",
        },
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

    if (action === "edit") {
      await handleEditServerConfig({
        targetGroup,
        isGlobal,
        cwd,
      });
      continue;
    }


    if (action === "sync") {
      const allAllowedAgents = isGlobal
        ? getMcpAgentTypes()
        : getMcpAgentsSupportingProjectScope();

      const candidateAgents = allAllowedAgents.filter((a) => !targetGroup.agents.includes(a));

      if (candidateAgents.length === 0) {
        logger.info(
          "All supported agents in this scope already have this MCP server configured; no sync needed",
        );
        continue;
      }

      const selectedToSync = await checkbox<McpAgentType>({
        message: "Select target agents to sync to (Space to select):",
        choices: candidateAgents.map((a) => ({
          name: `${getMcpAgentConfig(a).displayName} (${a})`,
          value: a,
          checked: false,
        })),
        loop: false,
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

