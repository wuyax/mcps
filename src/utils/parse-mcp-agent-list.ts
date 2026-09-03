import { getMcpAgentTypes, resolveMcpAgentAlias, type McpAgentType } from "../index.ts";

export const parseMcpAgentList = (input: string[] | undefined): McpAgentType[] | undefined => {
  if (!input || input.length === 0) return undefined;
  if (input.includes("*")) return getMcpAgentTypes();

  const resolved: McpAgentType[] = [];
  for (const value of input) {
    const agentType = resolveMcpAgentAlias(value);
    if (!agentType) throw new Error(`Unknown MCP agent "${value}"`);
    resolved.push(agentType);
  }
  return resolved;
};
