import { Command } from "commander";
import pc from "picocolors";

import { groupInstalledServersByName } from "../interactive/utils/group-installed-servers.ts";
import { displayServerDetails, wizardManage } from "../interactive/wizard-manage.ts";
import { listInstalledMcpServers } from "../list.ts";
import type {
  McpAgentType,
  McpRemoteTransport,
  McpServerConfig,
} from "../types.ts";
import { updateMcpServer } from "../update-mcp-server.ts";
import { logger } from "../utils/logger.ts";
import { parseKeyValueList } from "../utils/parse-key-value-list.ts";
import { parseMcpAgentList } from "../utils/parse-mcp-agent-list.ts";
import { toErrorMessage } from "../utils/to-error-message.ts";

export interface McpManageCliOptions {
  agent?: string[];
  global?: boolean;
  transport?: string;
  header?: string[];
  clearHeaders?: boolean;
  env?: string[];
  clearEnv?: boolean;
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
  .option("--clear-headers", "Clear all HTTP headers for remote servers")
  .option("--env <env...>", "Env var for stdio servers (KEY=VALUE), repeatable")
  .option("--clear-env", "Clear all environment variables for stdio servers")
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
        Boolean(options.clearEnv) ||
        options.header !== undefined ||
        Boolean(options.clearHeaders) ||
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
        if (options.clearEnv) {
          updatedConfig.env = undefined;
        }
        if (options.env !== undefined) {
          const parsedEnv = parseKeyValueList(options.env, "=");
          updatedConfig.env = { ...(updatedConfig.env ?? {}), ...parsedEnv };
        }
        if (options.clearHeaders) {
          updatedConfig.headers = undefined;
        }
        if (options.header !== undefined) {
          const parsedHeaders = parseKeyValueList(options.header, ":");
          updatedConfig.headers = { ...(updatedConfig.headers ?? {}), ...parsedHeaders };
        }

        const targetAgents: McpAgentType[] | undefined = options.agent
          ? (parseMcpAgentList(options.agent) ?? targetGroup.agents)
          : targetGroup.agents;

        const updateResult = updateMcpServer({
          serverName,
          config: updatedConfig,
          previousConfig: targetGroup.config,
          agents: targetAgents,
          global: isGlobal,
          cwd,
        });

        for (const item of updateResult.incompatible) {
          logger.warn(`Skipping ${pc.cyan(item.agent)}: ${item.reason}`);
        }

        const attemptedResults = updateResult.results.filter(
          (r) => !updateResult.incompatible.some((i) => i.agent === r.agent),
        );

        if (attemptedResults.length === 0) {
          const requestedTransport = updateResult.config.url
            ? updateResult.config.type ?? "http"
            : "stdio";
          logger.error(
            `None of the target agents support ${requestedTransport} transport. Update aborted.`,
          );
          process.exitCode = 1;
          return;
        }

        logger.info(
          `Updating ${pc.bold(serverName)} across ${pc.cyan(String(attemptedResults.length))} agent(s)...`,
        );

        let allSuccess = true;
        for (const res of attemptedResults) {
          if (res.success) {
            logger.success(`${pc.cyan(res.agent)}: Successfully updated in ${pc.dim(res.path)}`);
          } else {
            allSuccess = false;
            logger.error(`${pc.cyan(res.agent)}: Update failed - ${res.error}`);
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

