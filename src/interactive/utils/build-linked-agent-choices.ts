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

  // Align initial checked state: if an agent is selected, its co-hosted agents must also be initially selected
  const alignedCheckedSet = new Set<McpAgentType>(checkedAgents);
  for (const agent of checkedAgents) {
    const coHosted = getCoHostedAgents(agent, scopeOptions);
    for (const co of coHosted) {
      if (agents.includes(co)) {
        alignedCheckedSet.add(co);
      }
    }
  }

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
      checked: alignedCheckedSet.has(agent),
      linkedValues: coHosted,
      description:
        coHosted.length > 0
          ? `Linked with ${coHosted.map((a) => getMcpAgentConfig(a).displayName).join(", ")} (shared configuration)`
          : undefined,
    };
  });
};
