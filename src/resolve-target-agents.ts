import {
  detectGloballyInstalledMcpAgents,
  detectProjectInstalledMcpAgents,
  getMcpAgentConfig,
  getMcpAgentTypes,
  isMcpAgentType,
  isMcpTransportSupported,
} from "./agents.ts";
import type {
  McpAgentType,
  McpScopeOptions,
  McpTransportType,
} from "./types.ts";
import { parseMcpAgentList } from "./utils/parse-mcp-agent-list.ts";

export interface TargetResolutionQuery extends McpScopeOptions {
  requested?: string[] | McpAgentType[];
  all?: boolean;
  transport?: McpTransportType;
}

export interface IncompatibleAgent {
  agent: McpAgentType;
  reason: string;
}

export interface TargetResolutionResult {
  agents: McpAgentType[];
  allAgents: McpAgentType[];
  detected: McpAgentType[];
  isDetected: boolean;
  incompatible: IncompatibleAgent[];
  diagnostic?: string;
}

export interface ResolvedTargetAgents {
  agents: McpAgentType[];
  detected: boolean;
}

const normalizeRequestedAgents = (
  input: string[] | McpAgentType[] | undefined,
): McpAgentType[] | undefined => {
  if (!input || input.length === 0) return undefined;

  const rawList = [...input];
  if (rawList.every((item): item is McpAgentType => isMcpAgentType(item))) {
    return rawList as McpAgentType[];
  }

  return parseMcpAgentList(rawList as string[]);
};

/**
 * Deep module: Resolves candidate MCP target agents based on user input, wildcard/all flags,
 * environment auto-detection, and transport capability filtering.
 */
export const resolveTargetAgents = (
  query: TargetResolutionQuery = {},
): TargetResolutionResult => {
  const isGlobal = query.global ?? false;
  const cwd = query.cwd ?? process.cwd();

  const detected = isGlobal
    ? detectGloballyInstalledMcpAgents()
    : detectProjectInstalledMcpAgents(cwd);

  let rawAgents: McpAgentType[] | undefined;
  let isDetected = false;

  if (query.all) {
    rawAgents = getMcpAgentTypes();
  } else {
    rawAgents = normalizeRequestedAgents(query.requested);
  }

  if (!rawAgents || rawAgents.length === 0) {
    rawAgents = detected;
    isDetected = true;
  }

  const transport = query.transport;
  const compatibleAgents: McpAgentType[] = [];
  const incompatible: IncompatibleAgent[] = [];

  for (const agentType of rawAgents) {
    const agent = getMcpAgentConfig(agentType);
    if (transport && !isMcpTransportSupported(agent, transport)) {
      incompatible.push({
        agent: agentType,
        reason:
          agent.unsupportedTransportMessage ??
          `${agent.displayName} does not support ${transport} transport.`,
      });
    } else {
      compatibleAgents.push(agentType);
    }
  }

  let diagnostic: string | undefined;
  if (compatibleAgents.length === 0) {
    if (isDetected) {
      diagnostic = `No ${isGlobal ? "global" : "project"}-installed MCP agents detected. Pass -a <agent> (e.g. -a cursor) or --all to install.`;
    } else if (rawAgents.length > 0 && incompatible.length > 0 && transport) {
      diagnostic = `None of the selected agents support ${transport} transport.`;
    } else {
      diagnostic = "No valid target agents specified.";
    }
  }

  return {
    agents: compatibleAgents,
    allAgents: rawAgents,
    detected,
    isDetected,
    incompatible,
    diagnostic,
  };
};

/**
 * Backward-compatible wrapper for resolveMcpTargetAgents.
 */
export const resolveMcpTargetAgents = (
  requested: McpAgentType[] | undefined,
  isGlobal: boolean,
  cwd: string,
): ResolvedTargetAgents => {
  const result = resolveTargetAgents({
    requested,
    global: isGlobal,
    cwd,
  });
  return {
    agents: result.agents,
    detected: result.isDetected,
  };
};
