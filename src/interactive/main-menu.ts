import { select } from "@inquirer/prompts";
import pc from "picocolors";

import { wizardAdd } from "./wizard-add.ts";
import { wizardManage } from "./wizard-manage.ts";
import { wizardRemove } from "./wizard-remove.ts";

export const mainMenu = async (): Promise<void> => {
  console.log();
  console.log(pc.bold(pc.cyan("mcps - Cross-Platform MCP Manager for AI Coding Agents")));
  console.log(pc.dim("Cross-platform MCP server configuration & synchronization tool"));
  console.log();

  while (true) {
    try {
      const action = await select({
        message: "Select an action:",
        choices: [
          {
            name: "Add MCP Server",
            value: "add",
          },
          {
            name: "Manage & Sync Installed MCP Servers",
            value: "manage",
          },
          {
            name: "Remove MCP Server",
            value: "remove",
          },
          {
            name: "Exit",
            value: "exit",
          },
        ],
      });

      if (action === "exit") {
        console.log(pc.dim("Goodbye!"));
        break;
      }

      if (action === "add") {
        await wizardAdd();
      } else if (action === "manage") {
        await wizardManage();
      } else if (action === "remove") {
        await wizardRemove();
      }

      console.log();
    } catch (error: any) {
      if (error?.name === "ExitPromptError") {
        console.log("\n" + pc.dim("Exited."));
        break;
      }
      throw error;
    }
  }
};
