import { select } from "@inquirer/prompts";
import pc from "picocolors";

import type { McpScopeOptions } from "../../types.ts";

export interface PromptScopeOptions extends McpScopeOptions {
  defaultGlobal?: boolean;
  message?: string;
}

/**
 * Prompts user to choose between project and global scope.
 * Returns true for global, false for project.
 */
export const promptScope = async (options: PromptScopeOptions = {}): Promise<boolean> => {
  const initialGlobal = options.defaultGlobal ?? options.global;
  if (initialGlobal !== undefined) {
    return initialGlobal;
  }

  const cwd = options.cwd ?? process.cwd();
  return select<boolean>({
    message: options.message ?? "Select MCP scope:",
    choices: [
      {
        name: `Current Project - ${pc.dim(cwd)}`,
        value: false,
      },
      {
        name: `Global User Config - ${pc.dim("applies across all projects")}`,
        value: true,
      },
    ],
  });
};
