import { buildMcpServerConfig } from "./build-server-config.ts";
import { agentConfigStore } from "./config-store.ts";
import { resolveTargetAgents } from "./resolve-target-agents.ts";
import { parseMcpSource } from "./source-parser.ts";
import type {
  InstallMcpServerOptions,
  InstallMcpServerResult,
  McpInstallResultForAgent,
  McpTransportType,
} from "./types.ts";

export const installMcpServer = (options: InstallMcpServerOptions): InstallMcpServerResult => {
  const parsed = parseMcpSource(options.source);
  const isGlobal = options.global ?? false;
  const cwd = options.cwd ?? process.cwd();

  const serverName = options.name ?? parsed.inferredName;
  const serverConfig = buildMcpServerConfig(parsed, {
    transport: options.transport,
    headers: options.headers,
    env: options.env,
    args: options.args,
  });

  const requestedTransport: McpTransportType =
    parsed.type === "remote" ? (serverConfig.type ?? "http") : "stdio";

  const { allAgents, incompatible } = resolveTargetAgents({
    requested: options.agents,
    global: isGlobal,
    cwd,
    transport: requestedTransport,
  });

  const incompatibleMap = new Map(incompatible.map((item) => [item.agent, item.reason]));
  const compatibleAgents = allAgents.filter((agent) => !incompatibleMap.has(agent));

  const installedResults = agentConfigStore.writeServers(
    compatibleAgents,
    serverName,
    serverConfig,
    { global: isGlobal, cwd },
  );
  const installedMap = new Map(installedResults.map((r) => [r.agent, r]));

  const results: McpInstallResultForAgent[] = allAgents.map((agent) => {
    const incompatibleReason = incompatibleMap.get(agent);
    if (incompatibleReason) {
      return {
        agent,
        success: false,
        path: "",
        error: incompatibleReason,
      };
    }

    return installedMap.get(agent)!;
  });

  return { serverName, config: serverConfig, results };
};
