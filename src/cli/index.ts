import { Command } from "commander";

import { mcpAddCommand } from "./add.ts";
import { mcpListCommand } from "./list.ts";
import { mcpRemoveCommand } from "./remove.ts";

export const mcpCommand = new Command("mcp")
  .description("Install, list, and remove MCP servers across coding agents")
  .addCommand(mcpAddCommand)
  .addCommand(mcpListCommand)
  .addCommand(mcpRemoveCommand);
