import { Command } from "commander";
import pc from "picocolors";

import { listInstalledMcpServers } from "../index.ts";
import { logger } from "../utils/logger.ts";
import { parseMcpAgentList } from "../utils/parse-mcp-agent-list.ts";
import { toErrorMessage } from "../utils/to-error-message.ts";

interface McpListOptions {
  global?: boolean;
  agent?: string[];
  json?: boolean;
}

export const mcpListCommand = new Command("list")
  .alias("ls")
  .description("List installed MCP servers across agents")
  .option("-g, --global", "List global configs instead of project")
  .option("-a, --agent <agents...>", "Filter by specific agents")
  .option("--json", "Output as JSON")
  .action((options: McpListOptions) => {
    try {
      const entries = listInstalledMcpServers({
        global: Boolean(options.global),
        cwd: process.cwd(),
        agents: parseMcpAgentList(options.agent),
      });

      if (options.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }

      if (entries.length === 0) {
        logger.warn("No MCP servers installed");
        return;
      }

      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const existing = grouped.get(entry.serverName) ?? [];
        existing.push(entry);
        grouped.set(entry.serverName, existing);
      }

      for (const [serverName, group] of grouped) {
        const agentLabels = group.map((record) => record.agent).join(", ");
        console.log(`  ${pc.bold(serverName)} ${pc.dim(`[${agentLabels}]`)}`);
        const firstPath = group[0]?.path;
        if (firstPath) console.log(`    ${pc.dim(firstPath)}`);
      }
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
