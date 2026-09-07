import { Command } from "commander";
import pc from "picocolors";

import { getMcpAgentConfig, isMcpTransportSupported } from "../agents.ts";
import { installMcpServerForAgent } from "../installer.ts";
import { groupInstalledServersByName } from "../interactive/utils/group-installed-servers.ts";
import { displayServerDetails, wizardManage } from "../interactive/wizard-manage.ts";
import { listInstalledMcpServers } from "../list.ts";
import type {
  McpAgentType,
  McpRemoteTransport,
  McpServerConfig,
  McpTransportType,
} from "../types.ts";
import { logger } from "../utils/logger.ts";
import { parseKeyValueList } from "../utils/parse-key-value-list.ts";
import { parseMcpAgentList } from "../utils/parse-mcp-agent-list.ts";
import { toErrorMessage } from "../utils/to-error-message.ts";

export interface McpManageCliOptions {
  agent?: string[];
  global?: boolean;
  transport?: string;
  header?: string[];
  env?: string[];
  args?: string[];
  command?: string;
  url?: string;
  yes?: boolean;
}

const resolveTransport = (input: string | undefined): McpRemoteTransport | undefined => {
  if (!input) return undefined;
  if (input === "http" || input === "sse") return input;
  throw new Error(`Unsupported transport "${input}" (expected: http, sse)`);
};

export const mcpManageCommand = new Command("manage")
  .description("Inspect, modify, and sync installed MCP servers across coding agents")
  .argument("[server-name]", "Optional server name to inspect or manage")
  .option("-a, --agent <agents...>", "Target specific agents for update")
  .option("-g, --global", "Manage global scope servers instead of project")
  .option("-t, --transport <type>", "Transport type for remote servers (http or sse)")
  .option("--header <header...>", "HTTP header (Header: Value), repeatable")
  .option("--env <env...>", "Env var for stdio servers (KEY=VALUE), repeatable")
  .option("--args <args...>", "CLI arguments for stdio/package servers")
  .option("--command <command>", "Executable command for stdio servers")
  .option("--url <url>", "Remote endpoint URL")
  .option("-y, --yes", "Skip interactive prompts")
  .action(async (serverName: string | undefined, options: McpManageCliOptions) => {
    try {
      const cwd = process.cwd();
      const isGlobal = Boolean(options.global);

      const hasModifications =
        options.command !== undefined ||
        options.args !== undefined ||
        options.env !== undefined ||
        options.header !== undefined ||
        options.url !== undefined ||
        options.transport !== undefined;

      const isInteractive = Boolean(process.stdin.isTTY && !options.yes);

      if (hasModifications) {
        if (!serverName) {
          logger.error('Missing required argument: "server-name" when passing modification flags.');
          process.exitCode = 1;
          return;
        }

        const installed = listInstalledMcpServers({ global: isGlobal, cwd });
        const grouped = groupInstalledServersByName(installed);
        const targetGroup = grouped.get(serverName);

        if (!targetGroup) {
          logger.error(
            `MCP server "${serverName}" is not configured in ${isGlobal ? "global" : "project"} scope.`,
          );
          process.exitCode = 1;
          return;
        }

        const updatedConfig: McpServerConfig = {
          ...targetGroup.config,
          args: targetGroup.config.args ? [...targetGroup.config.args] : undefined,
          env: targetGroup.config.env ? { ...targetGroup.config.env } : undefined,
          headers: targetGroup.config.headers ? { ...targetGroup.config.headers } : undefined,
        };

        if (options.command !== undefined) {
          updatedConfig.command = options.command;
        }
        if (options.args !== undefined) {
          updatedConfig.args = options.args;
        }
        if (options.url !== undefined) {
          updatedConfig.url = options.url;
        }
        if (options.transport !== undefined) {
          updatedConfig.type = resolveTransport(options.transport);
        }
        if (options.env !== undefined) {
          const parsedEnv = parseKeyValueList(options.env, "=");
          updatedConfig.env = { ...(updatedConfig.env ?? {}), ...parsedEnv };
        }
        if (options.header !== undefined) {
          const parsedHeaders = parseKeyValueList(options.header, ":");
          updatedConfig.headers = { ...(updatedConfig.headers ?? {}), ...parsedHeaders };
        }

        const targetAgents: McpAgentType[] = options.agent
          ? (parseMcpAgentList(options.agent) ?? targetGroup.agents)
          : targetGroup.agents;

        const requestedTransport: McpTransportType = updatedConfig.url
          ? updatedConfig.type ?? "http"
          : "stdio";

        const compatibleAgents: McpAgentType[] = [];
        for (const agent of targetAgents) {
          const agentConfig = getMcpAgentConfig(agent);
          if (isMcpTransportSupported(agentConfig, requestedTransport)) {
            compatibleAgents.push(agent);
          } else {
            const reason =
              agentConfig.unsupportedTransportMessage ??
              `Agent does not support ${requestedTransport} transport`;
            logger.warn(`Skipping ${pc.cyan(agent)}: ${reason}`);
          }
        }


        if (compatibleAgents.length === 0) {
          logger.error(
            `None of the target agents support ${requestedTransport} transport. Update aborted.`,
          );
          process.exitCode = 1;
          return;
        }

        logger.info(
          `Updating ${pc.bold(serverName)} across ${pc.cyan(String(compatibleAgents.length))} agent(s)...`,
        );

        let allSuccess = true;
        for (const agent of compatibleAgents) {
          const res = installMcpServerForAgent(serverName, updatedConfig, agent, {
            global: isGlobal,
            cwd,
          });
          if (res.success) {
            logger.success(`${pc.cyan(agent)}: Successfully updated in ${pc.dim(res.path)}`);
          } else {
            allSuccess = false;
            logger.error(`${pc.cyan(agent)}: Update failed - ${res.error}`);
          }
        }

        if (!allSuccess) {
          process.exitCode = 1;
        }
        return;
      }

      // No modification flags passed
      if (!isInteractive) {
        if (!serverName) {
          logger.error(
            'Missing required argument: "server-name" for non-interactive manage command. Specify a server name or use interactive terminal.',
          );
          process.exitCode = 1;
          return;
        }

        const installed = listInstalledMcpServers({ global: isGlobal, cwd });
        const grouped = groupInstalledServersByName(installed);
        const targetGroup = grouped.get(serverName);

        if (!targetGroup) {
          logger.error(
            `MCP server "${serverName}" is not configured in ${isGlobal ? "global" : "project"} scope.`,
          );
          process.exitCode = 1;
          return;
        }

        displayServerDetails({
          serverName,
          config: targetGroup.config,
          agents: targetGroup.agents,
          isGlobal,
        });
        return;
      }

      await wizardManage({
        global: options.global,
        serverName,
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "ExitPromptError"
      ) {
        process.exit(0);
      }
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });

