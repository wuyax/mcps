import { Command } from "commander";

import { mcpAddCommand } from "./cli/add.ts";
import { mcpListCommand } from "./cli/list.ts";
import { mcpRemoveCommand } from "./cli/remove.ts";

import { mainMenu } from "./interactive/main-menu.ts";

const VERSION = process.env.VERSION ?? "0.1.0";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const program = new Command()
  .name("mcps")
  .description("Install, list, and remove MCP servers across AI coding agents")
  .version(VERSION, "-v, --version", "display the version number");

program.addCommand(mcpAddCommand);
program.addCommand(mcpListCommand);
program.addCommand(mcpRemoveCommand);

const main = async (): Promise<void> => {
  if (process.argv.length <= 2 && process.stdin.isTTY) {
    try {
      await mainMenu();
      return;
    } catch (error: any) {
      if (error?.name === "ExitPromptError") {
        process.exit(0);
      }
      throw error;
    }
  }

  await program.parseAsync();
};

main();
