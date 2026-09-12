import { Command } from "commander";
import pc from "picocolors";

import { wizardManage } from "../interactive/wizard-manage.ts";
import {
  groupInstalledServersByName,
  listInstalledMcpServers,
  type GroupedInstalledServer,
} from "../list.ts";
import type {
  McpAgentType,
  McpScopeOptions,
  McpServerConfig,
} from "../types.ts";
import { applyServerConfigDelta } from "../server-config.ts";
import { updateMcpServer } from "../update-mcp-server.ts";
import { displayServerDetails } from "../utils/display-server-details.ts";
import { logCoHostedNotice } from "../utils/co-hosted-feedback.ts";
import { logger } from "../utils/logger.ts";
import { parseKeyValueList } from "../utils/parse-key-value-list.ts";
import { parseMcpAgentList } from "../utils/parse-mcp-agent-list.ts";
import { resolveTransport } from "../utils/resolve-transport.ts";
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
  clearArgs?: boolean;
  command?: string;
  url?: string;
  yes?: boolean;
}

const requireTargetServerGroup = (
  serverName: string,
  scope: McpScopeOptions,
): GroupedInstalledServer | undefined => {
  const installed = listInstalledMcpServers(scope);
  const grouped = groupInstalledServersByName(installed);
  const targetGroup = grouped.get(serverName);
  if (!targetGroup) {
    logger.error(
      `MCP server "${serverName}" is not configured in ${scope.global ? "global" : "project"} scope.`,
    );
    process.exitCode = 1;
    return undefined;
  }
  return targetGroup;
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
  .option("--clear-args", "Clear all arguments for stdio/package servers")
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
        Boolean(options.clearArgs) ||
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

        const targetGroup = requireTargetServerGroup(serverName, { global: isGlobal, cwd });
        if (!targetGroup) {
          return;
        }

        const parsedEnv = options.env !== undefined ? parseKeyValueList(options.env, "=") : undefined;
        const parsedHeaders = options.header !== undefined ? parseKeyValueList(options.header, ":") : undefined;

        let deltaResult;
        try {
          deltaResult = applyServerConfigDelta(targetGroup.config, {
            command: options.command,
            args: options.args,
            clearArgs: options.clearArgs,
            env: parsedEnv,
            clearEnv: options.clearEnv,
            url: options.url,
            transport: resolveTransport(options.transport),
            headers: parsedHeaders,
            clearHeaders: options.clearHeaders,
          });
        } catch (error) {
          logger.error(toErrorMessage(error));
          process.exitCode = 1;
          return;
        }

        if (deltaResult.ignoredFlags.length > 0) {
          const isRemote = deltaResult.protocol === "remote";
          const hint = isRemote
            ? options.url !== undefined
              ? "When configuring a remote server, stdio flags are ignored."
              : "Use --command to switch to stdio mode."
            : options.command !== undefined
              ? "When configuring a stdio server, remote flags are ignored."
              : "Use --url to switch to remote mode.";
          logger.warn(
            `Server "${serverName}" is a ${isRemote ? "remote" : "stdio"} server. The following ${isRemote ? "stdio" : "remote"} flags will be ignored: ${deltaResult.ignoredFlags.join(", ")}. ${hint}`,
          );
        }

        const incomingDelta: McpServerConfig = deltaResult.config;

        let targetAgents: McpAgentType[] = targetGroup.agents;
        if (options.agent !== undefined) {
          // parseMcpAgentList throws on invalid agent names (handled by outer catch).
          // If options.agent is an empty list, it returns undefined which we explicitly block.
          const parsed = parseMcpAgentList(options.agent);
          if (!parsed || parsed.length === 0) {
            logger.error(`No valid agents recognized from: "${options.agent.join(", ")}".`);
            process.exitCode = 1;
            return;
          }
          targetAgents = parsed;
        }

        const updateResult = updateMcpServer({
          serverName,
          config: incomingDelta,
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
            logCoHostedNotice("configured", res.coConfiguredAgents);
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

        const targetGroup = requireTargetServerGroup(serverName, { global: isGlobal, cwd });
        if (!targetGroup) {
          return;
        }

        displayServerDetails({
          serverName,
          config: targetGroup.config,
          agents: targetGroup.agents,
          global: isGlobal,
          hasDivergence: targetGroup.hasDivergence,
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
