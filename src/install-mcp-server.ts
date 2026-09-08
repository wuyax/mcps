import { buildMcpServerConfig } from "./build-server-config.ts";
import { installToCompatibleAgents } from "./installer.ts";
import { resolveTargetAgents } from "./resolve-target-agents.ts";
import { parseMcpSource } from "./source-parser.ts";
import type {
  InstallMcpServerOptions,
  InstallMcpServerResult,
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

  const results = installToCompatibleAgents(serverName, serverConfig, {
    allAgents,
    incompatible,
    global: isGlobal,
    cwd,
  });

  return { serverName, config: serverConfig, results };
};
