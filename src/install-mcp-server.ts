import {
  detectGloballyInstalledMcpAgents,
  detectProjectInstalledMcpAgents,
  getMcpAgentConfig,
  isMcpTransportSupported,
} from "./agents.ts";
import { buildMcpServerConfig } from "./build-server-config.ts";
import { installMcpServerForAgent } from "./installer.ts";
import { parseMcpSource } from "./source-parser.ts";
import type {
  InstallMcpServerOptions,
  InstallMcpServerResult,
  McpAgentType,
  McpInstallResultForAgent,
  McpTransportType,
} from "./types.ts";

export interface ResolvedTargetAgents {
  agents: McpAgentType[];
  detected: boolean;
}

export const resolveMcpTargetAgents = (
  requested: McpAgentType[] | undefined,
  isGlobal: boolean,
  cwd: string,
): ResolvedTargetAgents => {
  if (requested && requested.length > 0) {
    return { agents: requested, detected: false };
  }
  const detected = isGlobal
    ? detectGloballyInstalledMcpAgents()
    : detectProjectInstalledMcpAgents(cwd);
  return { agents: detected, detected: true };
};

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

  const { agents: targetAgents } = resolveMcpTargetAgents(options.agents, isGlobal, cwd);

  const results: McpInstallResultForAgent[] = targetAgents.map((agentType) => {
    const agent = getMcpAgentConfig(agentType);
    if (!isMcpTransportSupported(agent, requestedTransport)) {
      return {
        agent: agentType,
        success: false,
        path: "",
        error:
          agent.unsupportedTransportMessage ??
          `${agent.displayName} does not support ${requestedTransport} transport.`,
      };
    }
    return installMcpServerForAgent(serverName, serverConfig, agentType, { global: isGlobal, cwd });
  });

  return { serverName, config: serverConfig, results };
};
