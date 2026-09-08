import { confirm, input, select } from "@inquirer/prompts";
import pc from "picocolors";

import {
  getMcpAgentConfig,
  getMcpAgentsSupportingProjectScope,
  getMcpAgentTypes,
} from "../agents.ts";
import { listInstalledMcpServers } from "../list.ts";
import { sortAgentsWithClusters } from "../resolve-config-clusters.ts";
import { resolveTargetAgents } from "../resolve-target-agents.ts";
import type {
  McpAgentType,
  McpRemoteTransport,
  McpScopeOptions,
  McpServerConfig,
  McpTransportType,
} from "../types.ts";
import { updateMcpServer } from "../update-mcp-server.ts";
import {
  displayServerDetails,
  type DisplayServerDetailsOptions,
} from "../utils/display-server-details.ts";
import { logger } from "../utils/logger.ts";

import { promptEditArgs } from "./prompts/args.ts";
import { promptEditEnvConfig } from "./prompts/env.ts";
import { promptEditHeadersConfig } from "./prompts/headers.ts";
import { linkedCheckbox } from "./prompts/linked-checkbox.ts";
import { promptScope } from "./prompts/scope.ts";
import { buildLinkedAgentChoices } from "./utils/build-linked-agent-choices.ts";
import {
  groupInstalledServersByName,
  type GroupedInstalledServer,
} from "./utils/group-installed-servers.ts";

export { displayServerDetails, type DisplayServerDetailsOptions };

export interface WizardManageOptions extends McpScopeOptions {
  serverName?: string;
}

export interface EditServerConfigOptions extends McpScopeOptions {
  targetGroup: GroupedInstalledServer;
}

/**
 * Interactive prompt flow to switch an MCP server between stdio and remote protocols.
 */
export const promptSwitchServerType = async (
  currentConfig: McpServerConfig,
  serverName: string,
): Promise<McpServerConfig> => {
  const isRemote = Boolean(currentConfig.url && currentConfig.url.length > 0);
  if (isRemote) {
    const newCmd = await input({
      message: "Executable command (e.g. node, npx):",
      validate: (val) => (val.trim() ? true : "Command cannot be empty"),
    });
    const newArgs = await promptEditArgs([]);
    const newEnv = await promptEditEnvConfig({});
    logger.success(`Switched [${serverName}] configuration to stdio mode`);
    return {
      command: newCmd.trim(),
      args: newArgs.length > 0 ? newArgs : undefined,
      env: Object.keys(newEnv).length > 0 ? newEnv : undefined,
    };
  }

  const newUrl = await input({
    message: "Remote server URL:",
    validate: (val) => {
      const trimmed = val.trim();
      if (!trimmed) return "URL cannot be empty";
      if (!/^https?:\/\//i.test(trimmed)) {
        return "Please enter a valid URL starting with http:// or https://";
      }
      return true;
    },
  });
  const transport = await select<McpRemoteTransport>({
    message: "Select remote transport protocol:",
    choices: [
      { name: "HTTP", value: "http" },
      { name: "SSE (Server-Sent Events)", value: "sse" },
    ],
    default: "http",
  });
  const newHeaders = await promptEditHeadersConfig({});
  logger.success(`Switched [${serverName}] configuration to remote mode`);
  return {
    url: newUrl.trim(),
    type: transport,
    headers: Object.keys(newHeaders).length > 0 ? newHeaders : undefined,
  };
};

const handleEditServerConfig = async (options: EditServerConfigOptions): Promise<void> => {
  const { targetGroup } = options;
  const isGlobal = options.global ?? false;
  const cwd = options.cwd ?? process.cwd();

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
          { name: "Switch to local command (stdio)", value: "switch_type" },
          { name: "Reset changes to original", value: "reset" },
          { name: "Save and apply changes", value: "save" },
          { name: "Cancel (discard changes)", value: "cancel" },
        ]
      : [
          { name: "Edit Environment Variables (env)", value: "env" },
          { name: "Edit Command Arguments (args)", value: "args" },
          { name: "Edit Executable Command (command)", value: "command" },
          { name: "Switch to remote server (HTTP/SSE)", value: "switch_type" },
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

    if (editAction === "switch_type") {
      workingConfig = await promptSwitchServerType(workingConfig, serverName);
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
        const sortedAgents = sortAgentsWithClusters(targetGroup.agents, { global: isGlobal, cwd });
        const choices = buildLinkedAgentChoices({
          agents: sortedAgents,
          checkedAgents: sortedAgents,
          scopeOptions: { global: isGlobal, cwd },
        });

        targetAgents = await linkedCheckbox<McpAgentType>({
          message: "Select agents to update configuration (Space to toggle):",
          choices,
          loop: false,
          validate: (ans) => (ans.length === 0 ? "Please select at least one agent" : true),
        });

        if (targetAgents.length < targetGroup.agents.length) {
          const unselected = targetGroup.agents.filter((a) => !targetAgents.includes(a));
          const unselectedNames = unselected
            .map((a) => getMcpAgentConfig(a).displayName)
            .join(", ");
          logger.info(
            `Note: Updating only a subset of agents. Server configurations will diverge from: ${unselectedNames}.`,
          );
        }
      }

      const requestedTransport: McpTransportType = workingConfig.url
        ? workingConfig.type ?? "http"
        : "stdio";

      const resolution = resolveTargetAgents({
        requested: targetAgents,
        global: isGlobal,
        cwd,
        transport: requestedTransport,
      });

      if (resolution.incompatible.length > 0) {
        for (const item of resolution.incompatible) {
          logger.warn(`Skipping ${pc.cyan(item.agent)}: ${item.reason}`);
        }
      }

      if (resolution.compatibleAgents.length === 0) {
        logger.error(
          `None of the selected agents support ${requestedTransport} transport. Cannot update.`,
        );
        continue;
      }

      const agentNames = resolution.compatibleAgents
        .map((a) => getMcpAgentConfig(a).displayName)
        .join(", ");
      const confirmed = await confirm({
        message: `Confirm updating configuration for [${serverName}] across: ${agentNames}?`,
        default: true,
      });

      if (!confirmed) {
        logger.warn("Update cancelled");
        continue;
      }

      const updateResult = updateMcpServer({
        serverName,
        config: workingConfig,
        previousConfig: targetGroup.config,
        agents: resolution.compatibleAgents,
        global: isGlobal,
        cwd,
      });

      let updatedAny = false;
      const succeededAgents: McpAgentType[] = [];
      for (const res of updateResult.results) {
        if (res.success) {
          updatedAny = true;
          succeededAgents.push(res.agent);
          logger.success(
            `${pc.cyan(res.agent)}: Successfully updated configuration in ${pc.dim(res.path)}`,
          );
        } else {
          logger.error(`${pc.cyan(res.agent)}: Update failed - ${res.error}`);
        }
      }

      if (updatedAny) {
        targetGroup.config = updateResult.config;
        logger.success(`Configuration for [${serverName}] updated successfully!`);
        return;
      }
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

  const refreshGroupedServers = (): void => {
    const freshInstalled = listInstalledMcpServers({ global: isGlobal, cwd });
    const freshGrouped = groupInstalledServersByName(freshInstalled);
    grouped.clear();
    for (const [name, grp] of freshGrouped) {
      grouped.set(name, grp);
    }
  };

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
      global: isGlobal,
      hasDivergence: targetGroup.hasDivergence,
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
        global: isGlobal,
        cwd,
      });
      refreshGroupedServers();
      continue;
    }

    if (action === "sync") {
      const allAllowedAgents = isGlobal
        ? getMcpAgentTypes()
        : getMcpAgentsSupportingProjectScope();

      const rawCandidateAgents = allAllowedAgents.filter((a) => !targetGroup.agents.includes(a));

      if (rawCandidateAgents.length === 0) {
        logger.info(
          "All supported agents in this scope already have this MCP server configured; no sync needed",
        );
        continue;
      }

      const candidateAgents = sortAgentsWithClusters(rawCandidateAgents, { global: isGlobal, cwd });
      const choices = buildLinkedAgentChoices({
        agents: candidateAgents,
        checkedAgents: [],
        scopeOptions: { global: isGlobal, cwd },
      });

      const selectedToSync = await linkedCheckbox<McpAgentType>({
        message: "Select target agents to sync to (Space to select):",
        choices,
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

      const syncResult = updateMcpServer({
        serverName: chosenServerName,
        config: targetGroup.config,
        agents: selectedToSync,
        global: isGlobal,
        cwd,
      });

      for (const item of syncResult.incompatible) {
        logger.warn(`Skipping ${pc.cyan(item.agent)}: ${item.reason}`);
      }

      for (const res of syncResult.results) {
        if (syncResult.incompatible.some((i) => i.agent === res.agent)) {
          continue;
        }
        if (res.success) {
          logger.success(`${pc.cyan(res.agent)}: Successfully synced to ${pc.dim(res.path)}`);
          targetGroup.agents.push(res.agent);
        } else {
          logger.error(`${pc.cyan(res.agent)}: Sync failed - ${res.error}`);
        }
      }
      refreshGroupedServers();
    }
  }
};

