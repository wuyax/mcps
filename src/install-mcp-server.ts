import { buildMcpServerConfig } from "./build-server-config.ts";
import { installMcpServerForAgents } from "./installer.ts";
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
  const compatibleAgents = allAgents.filter((a) => !incompatibleMap.has(a));
  const installedResults = installMcpServerForAgents(serverName, serverConfig, compatibleAgents, {
    global: isGlobal,
    cwd,
  });
  const installedMap = new Map(installedResults.map((r) => [r.agent, r]));

  const results: McpInstallResultForAgent[] = allAgents.map((agentType) => {
    const incompatibleReason = incompatibleMap.get(agentType);
    if (incompatibleReason) {
      return {
        agent: agentType,
        success: false,
        path: "",
        error: incompatibleReason,
      };
    }

    return installedMap.get(agentType)!;
  });

  return { serverName, config: serverConfig, results };
};
