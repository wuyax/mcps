import pc from "picocolors";

import { getMcpAgentConfig } from "../agents.ts";
import type { McpAgentType, McpScopeOptions, McpServerConfig } from "../types.ts";
import { maskSecretHeader, maskSecretValue } from "./mask-secret.ts";

export interface DisplayServerDetailsOptions extends McpScopeOptions {
  serverName: string;
  config: McpServerConfig;
  agents?: McpAgentType[];
  hasDivergence?: boolean;
  titlePrefix?: string;
}

/**
 * Reusable display function for server details with secret masking.
 */
export const displayServerDetails = ({
  serverName,
  config,
  agents,
  hasDivergence,
  global: isGlobal,
  titlePrefix = "MCP Server Details",
}: DisplayServerDetailsOptions): void => {
  console.log("\n" + pc.cyan(pc.bold(`${titlePrefix}: [${serverName}]`)));
  if (isGlobal !== undefined) {
    console.log(`  ${pc.bold("Scope:")} ${isGlobal ? "Global" : "Project"}`);
  }
  if (agents && agents.length > 0) {
    console.log(
      `  ${pc.bold("Configured Agents:")} ${pc.green(agents.map((a) => getMcpAgentConfig(a).displayName).join(", "))}`,
    );
  }
  if (hasDivergence) {
    console.log(
      `  ${pc.yellow(pc.bold("Notice:"))} ${pc.yellow("Configurations differ across installed agents. Showing configuration from the first agent.")}`,
    );
  }

  const isRemote = Boolean(config.url && config.url.length > 0);
  if (isRemote) {
    console.log(`  ${pc.bold("Transport:")} ${pc.magenta(config.type ?? "http")}`);
    console.log(`  ${pc.bold("URL:")} ${pc.dim(config.url ?? "")}`);
    const headerKeys = Object.keys(config.headers ?? {});
    if (headerKeys.length > 0) {
      console.log(`  ${pc.bold("Headers:")} ${pc.cyan(String(headerKeys.length))}`);
      for (const [k, v] of Object.entries(config.headers ?? {})) {
        console.log(`    ${pc.bold(k)}: ${pc.dim(maskSecretHeader(k, v))}`);
      }
    } else {
      console.log(`  ${pc.bold("Headers:")} ${pc.dim("(none)")}`);
    }
  } else {
    console.log(`  ${pc.bold("Command:")} ${pc.magenta(config.command ?? "")}`);
    const argsStr =
      config.args && config.args.length > 0 ? config.args.join(" ") : "(none)";
    console.log(`  ${pc.bold("Arguments:")} ${pc.dim(argsStr)}`);
    const envKeys = Object.keys(config.env ?? {});
    if (envKeys.length > 0) {
      console.log(`  ${pc.bold("Environment Variables:")} ${pc.cyan(String(envKeys.length))}`);
      for (const [k, v] of Object.entries(config.env ?? {})) {
        console.log(`    ${pc.bold(k)}=${pc.dim(maskSecretValue(k, v))}`);
      }
    } else {
      console.log(`  ${pc.bold("Environment Variables:")} ${pc.dim("(none)")}`);
    }
  }
  console.log();
};
