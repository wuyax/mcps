import pc from "picocolors";

import { getMcpAgentConfig } from "../../agents.ts";
import { getCoHostedAgents } from "../../resolve-config-clusters.ts";
import type { LinkedChoice } from "../prompts/linked-checkbox.ts";
import type { McpAgentType, McpScopeOptions } from "../../types.ts";

export interface BuildLinkedAgentChoicesOptions {
  agents: McpAgentType[];
  checkedAgents: McpAgentType[];
  detectedAgents?: McpAgentType[];
  scopeOptions?: McpScopeOptions;
}

/**
 * Builds normalized LinkedChoice items for an interactive agent list,
 * calculating co-hosted agents and attaching link indicators.
 */
export const buildLinkedAgentChoices = (
  options: BuildLinkedAgentChoicesOptions,
): LinkedChoice<McpAgentType>[] => {
  const { agents, checkedAgents, detectedAgents = [], scopeOptions = {} } = options;
  const checkedSet = new Set(checkedAgents);

  return agents.map((agent) => {
    const config = getMcpAgentConfig(agent);
    const displayName = config?.displayName ?? agent;
    const isDetected = detectedAgents.includes(agent);
    const coHosted = getCoHostedAgents(agent, scopeOptions).filter((co) =>
      agents.includes(co),
    );

    const detectedBadge = isDetected ? pc.green(" [detected]") : "";
    const sharedBadge = coHosted.length > 0 ? pc.dim(` [shared: ${coHosted.join(", ")}]`) : "";
    const label = `${displayName} ${pc.dim(`(${agent})`)}${detectedBadge}${sharedBadge}`;

    return {
      name: label,
      value: agent,
      checked: checkedSet.has(agent),
      linkedValues: coHosted,
      description:
        coHosted.length > 0
          ? `Linked with ${coHosted.map((a) => getMcpAgentConfig(a).displayName).join(", ")} (shared configuration)`
          : undefined,
    };
  });
};
