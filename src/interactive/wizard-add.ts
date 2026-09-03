import { confirm, input, select } from "@inquirer/prompts";
import pc from "picocolors";

import { installMcpServer } from "../install-mcp-server.ts";
import { parseMcpSource } from "../source-parser.ts";
import type { McpAgentType, McpRemoteTransport, McpScopeOptions } from "../types.ts";
import { logger } from "../utils/logger.ts";
import { promptScopeAndAgents } from "./prompts/agents.ts";
import { promptArgsConfig } from "./prompts/args.ts";
import { promptEnvConfig } from "./prompts/env.ts";
import { promptHeadersConfig } from "./prompts/headers.ts";

export interface WizardAddOptions extends McpScopeOptions {
  source?: string;
  name?: string;
  agents?: McpAgentType[];
  args?: string[];
  transport?: McpRemoteTransport;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export const wizardAdd = async (initial: WizardAddOptions = {}): Promise<boolean> => {
  const cwd = initial.cwd ?? process.cwd();

  logger.info(pc.bold("Welcome to the MCP interactive add wizard"));

  // 1. Source selection
  let source = initial.source;
  if (!source) {
    const sourceType = await select({
      message: "Select MCP server type:",
      choices: [
        {
          name: "npm package (run via npx)",
          value: "npm",
        },
        {
          name: "Remote MCP server (via HTTP / SSE URL)",
          value: "remote",
        },
        {
          name: "Local command / script / Docker (stdio)",
          value: "command",
        },
      ],
    });

    if (sourceType === "npm") {
      source = await input({
        message: "Enter npm package name (e.g. @modelcontextprotocol/server-postgres or mcp-server-git):",
        validate: (val) => (val.trim() ? true : "Package name cannot be empty"),
      });
    } else if (sourceType === "remote") {
      source = await input({
        message: "Enter remote server URL (e.g. https://mcp.example.com/sse):",
        validate: (val) => {
          const trimmed = val.trim();
          if (!trimmed) return "URL cannot be empty";
          if (!/^https?:\/\//i.test(trimmed)) return "Please enter a valid URL starting with http:// or https://";
          return true;
        },
      });
    } else {
      source = await input({
        message: "Enter command and arguments (e.g. python -m my_mcp_server or docker run ...):",
        validate: (val) => (val.trim() ? true : "Command cannot be empty"),
      });
    }
  }

  source = source.trim();
  const parsed = parseMcpSource(source);

  // 2. Server Name
  let serverName = initial.name;
  if (!serverName) {
    serverName = await input({
      message: "MCP server name:",
      default: parsed.inferredName,
      validate: (val) => (val.trim() ? true : "Server name cannot be empty"),
    });
  }
  serverName = serverName.trim();

  // 3. Transport & Headers (for remote)
  let transport = initial.transport;
  let headers = initial.headers ?? {};

  if (parsed.type === "remote") {
    if (!transport) {
      const isSseUrl = /\/sse\b/i.test(parsed.value);
      transport = await select<McpRemoteTransport>({
        message: "Select remote transport protocol:",
        choices: [
          { name: "HTTP", value: "http" },
          { name: "SSE (Server-Sent Events)", value: "sse" },
        ],
        default: isSseUrl ? "sse" : "http",
      });
    }

    if (Object.keys(headers).length === 0) {
      const needHeader = await confirm({
        message: "Configure HTTP headers (e.g. Authorization Bearer token)?",
        default: false,
      });
      if (needHeader) {
        headers = await promptHeadersConfig();
      }
    }
  }

  // 4. Scope & Agents Selection
  const { global: isGlobal, agents: selectedAgents } = await promptScopeAndAgents({
    cwd,
    defaultGlobal: initial.global,
    defaultAgents: initial.agents,
  });

  // 5. Arguments (for package / command)
  let args = initial.args ?? [];
  if (parsed.type !== "remote") {
    args = await promptArgsConfig(args);
  }

  // 6. Environment Variables (for stdio/package/command)
  let env = initial.env ?? {};
  if (parsed.type !== "remote") {
    env = await promptEnvConfig(env);
  }

  // 7. Preview & Confirmation
  console.log("\n" + pc.cyan(pc.bold("Configuration Preview:")));
  console.log(`  ${pc.bold("Server Name:")} ${pc.green(serverName)}`);
  console.log(`  ${pc.bold("Server Type:")} ${pc.magenta(parsed.type)}`);
  console.log(`  ${pc.bold("Source/Command:")} ${pc.dim(source)}`);
  console.log(`  ${pc.bold("Scope:")} ${isGlobal ? pc.yellow("Global") : pc.blue("Project")}`);
  console.log(`  ${pc.bold("Target Agents:")} ${pc.cyan(selectedAgents.join(", "))}`);

  if (args.length > 0) {
    console.log(`  ${pc.bold("Arguments:")} ${pc.dim(args.join(" "))}`);
  }
  if (transport) {
    console.log(`  ${pc.bold("Transport:")} ${pc.magenta(transport)}`);
  }
  const envKeys = Object.keys(env);
  if (envKeys.length > 0) {
    console.log(`  ${pc.bold("Environment Variables:")} ${pc.dim(envKeys.join(", "))} (${envKeys.length})`);
  }
  const headerKeys = Object.keys(headers);
  if (headerKeys.length > 0) {
    console.log(`  ${pc.bold("Headers:")} ${pc.dim(headerKeys.join(", "))} (${headerKeys.length})`);
  }
  console.log();

  const proceed = await confirm({
    message: "Confirm installation with this configuration?",
    default: true,
  });

  if (!proceed) {
    logger.warn("Operation cancelled");
    return false;
  }

  // Execute installation
  const result = installMcpServer({
    source,
    name: serverName,
    agents: selectedAgents,
    args,
    global: isGlobal,
    cwd,
    transport,
    headers,
    env,
  });

  logger.info(
    `Writing ${pc.bold(result.serverName)} to ${pc.cyan(String(result.results.length))} agent config files...`,
  );

  let allSuccess = true;
  for (const record of result.results) {
    if (record.success) {
      logger.success(`${pc.cyan(record.agent)}: Successfully written to ${pc.dim(record.path)}`);
    } else {
      allSuccess = false;
      logger.error(`${pc.cyan(record.agent)}: Failed to write - ${record.error}`);
    }
  }

  if (allSuccess) {
    logger.success(pc.bold(`MCP server "${serverName}" configured successfully!`));
  }
  return allSuccess;
};
