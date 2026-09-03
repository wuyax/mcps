import { Command } from "commander";
import pc from "picocolors";

import { removeMcpServer } from "../index.ts";
import { logger } from "../utils/logger.ts";
import { parseMcpAgentList } from "../utils/parse-mcp-agent-list.ts";
import { toErrorMessage } from "../utils/to-error-message.ts";

interface McpRemoveOptions {
  global?: boolean;
  agent?: string[];
  yes?: boolean;
}

import { wizardRemove } from "../interactive/wizard-remove.ts";

export const mcpRemoveCommand = new Command("remove")
  .alias("rm")
  .description("Remove an MCP server from agent configs")
  .argument("[name]", "Server name")
  .option("-g, --global", "Remove from global scope")
  .option("-a, --agent <agents...>", "Filter by specific agents (use '*' for all)")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (name: string | undefined, options: McpRemoveOptions) => {
    try {
      const isInteractive = Boolean(process.stdin.isTTY && !options.yes);

      if (!name) {
        if (isInteractive) {
          const success = await wizardRemove({
            global: options.global,
            agents: parseMcpAgentList(options.agent),
          });
          if (!success) process.exitCode = 1;
          return;
        }

        logger.error('Missing required argument: "name" (e.g. mcps remove server-filesystem)');
        process.exitCode = 1;
        return;
      }

      const results = removeMcpServer({
        name,
        agents: parseMcpAgentList(options.agent),
        global: Boolean(options.global),
        cwd: process.cwd(),
      });

      if (results.length === 0) {
        logger.warn(`No agent config contained ${pc.bold(name)}`);
        return;
      }

      for (const record of results) {
        if (record.removed) {
          logger.success(
            `${pc.cyan(record.agent)} removed ${pc.bold(name)} ${pc.dim(record.path)}`,
          );
        } else {
          logger.error(`${pc.cyan(record.agent)}: ${record.error ?? "not found"}`);
        }
      }
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
