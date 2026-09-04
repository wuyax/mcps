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
  /** Compatible candidate agents that support the requested transport */
  agents: McpAgentType[];
  /** Explicit alias for `agents` */
  compatibleAgents: McpAgentType[];
  /** All candidate agents before transport filtering */
  allAgents: McpAgentType[];
  /** Explicit alias for `allAgents` */
  candidateAgents: McpAgentType[];
  /** All agents detected on system / project */
  detected: McpAgentType[];
  /** True when target agents were resolved via auto-detection */
  isDetected: boolean;
  /** Incompatible agents and the reason they were filtered out */
  incompatible: IncompatibleAgent[];
  /** Diagnostic message when resolution yields zero compatible agents */
  diagnostic?: string;
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
 * Deep module: Resolves candidate target agents from explicit CLI flags,
 * wildcards, auto-detection, and transport capability filtering.
 */
export const resolveTargetAgents = (
  query: TargetResolutionQuery = {},
): TargetResolutionResult => {
  const cwd = query.cwd ?? process.cwd();
  const isGlobal = query.global ?? false;

  let explicitAgents = normalizeRequestedAgents(query.requested);
  if (query.all) {
    explicitAgents = getMcpAgentTypes();
  }

  const isDetected = !explicitAgents || explicitAgents.length === 0;

  const detected = isGlobal
    ? detectGloballyInstalledMcpAgents()
    : detectProjectInstalledMcpAgents(cwd);

  const candidateAgents: McpAgentType[] = isDetected ? detected : (explicitAgents ?? []);

  const allAgents = candidateAgents.filter(
    (type, index) => candidateAgents.indexOf(type) === index,
  );

  const incompatible: IncompatibleAgent[] = [];
  const compatibleAgents: McpAgentType[] = [];

  for (const agentType of allAgents) {
    const config = getMcpAgentConfig(agentType);
    if (query.transport && !isMcpTransportSupported(config, query.transport)) {
      incompatible.push({
        agent: agentType,
        reason:
          config.unsupportedTransportMessage ??
          `agent ${agentType} only supports ${config.supportedTransports.join(", ")} transport (attempted ${query.transport})`,
      });
    } else {
      compatibleAgents.push(agentType);
    }
  }

  let diagnostic: string | undefined;
  if (compatibleAgents.length === 0) {
    if (isDetected) {
      diagnostic = `No ${isGlobal ? "global" : "project"}-installed MCP agents detected. Pass -a <agent> (e.g. -a cursor) or --all to install.`;
    } else if (allAgents.length > 0 && incompatible.length > 0 && query.transport) {
      const list = incompatible.map((item) => `${item.agent} (${item.reason})`).join(", ");
      diagnostic = `None of the selected agents support ${query.transport} transport: ${list}`;
    } else {
      diagnostic = "No valid target agents specified.";
    }
  }

  return {
    agents: compatibleAgents,
    compatibleAgents,
    allAgents,
    candidateAgents: allAgents,
    detected,
    isDetected,
    incompatible,
    diagnostic,
  };
};
