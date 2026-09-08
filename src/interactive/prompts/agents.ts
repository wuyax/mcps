import pc from "picocolors";

import {
  getMcpAgentConfig,
  getMcpAgentsSupportingProjectScope,
  getMcpAgentTypes,
} from "../../agents.ts";
import { getCoHostedAgents, sortAgentsWithClusters } from "../../resolve-config-clusters.ts";
import { resolveTargetAgents } from "../../resolve-target-agents.ts";
import type { McpAgentType, McpScopeOptions } from "../../types.ts";
import { logger } from "../../utils/logger.ts";

import { buildLinkedAgentChoices } from "../utils/build-linked-agent-choices.ts";
import { linkedCheckbox } from "./linked-checkbox.ts";
import { promptScope } from "./scope.ts";

export interface PromptScopeAndAgentsOptions extends McpScopeOptions {
  defaultGlobal?: boolean;
  defaultAgents?: McpAgentType[];
}

export interface ScopeAndAgentsResult {
  global: boolean;
  agents: McpAgentType[];
}

/**
 * Interactively prompts for scope (Project vs Global) and target agents.
 * Auto-detects installed agents and pre-selects them.
 */
export const promptScopeAndAgents = async (
  options: PromptScopeAndAgentsOptions = {},
): Promise<ScopeAndAgentsResult> => {
  const cwd = options.cwd ?? process.cwd();

  const isGlobal = await promptScope({
    cwd,
    defaultGlobal: options.defaultGlobal,
    message: "Select MCP installation scope:",
  });

  // Detect agents based on chosen scope using Target Agent Resolver
  const resolution = resolveTargetAgents({
    global: isGlobal,
    cwd,
  });
  const detected = resolution.detected;

  const rawAvailable = isGlobal
    ? getMcpAgentTypes()
    : getMcpAgentsSupportingProjectScope();
  const availableAgentTypes = sortAgentsWithClusters(rawAvailable, { global: isGlobal, cwd });

  if (detected.length > 0) {
    logger.info(
      `Detected configured agents: ${pc.cyan(detected.map((a) => getMcpAgentConfig(a).displayName).join(", "))}`,
    );
  } else {
    logger.warn(`No active ${isGlobal ? "global" : "project"} agents detected`);
  }

  const rawDefaultChecked = options.defaultAgents && options.defaultAgents.length > 0
    ? options.defaultAgents
    : detected;

  // Align initial checked state: if an agent is selected, its co-hosted agents must also be initially selected
  const alignedChecked = new Set<McpAgentType>(rawDefaultChecked);
  for (const agent of rawDefaultChecked) {
    const coHosted = getCoHostedAgents(agent, { global: isGlobal, cwd });
    for (const co of coHosted) {
      if (availableAgentTypes.includes(co)) {
        alignedChecked.add(co);
      }
    }
  }

  const choices = buildLinkedAgentChoices({
    agents: availableAgentTypes,
    checkedAgents: Array.from(alignedChecked),
    detectedAgents: detected,
    scopeOptions: { global: isGlobal, cwd },
  });

  const selectedAgents = await linkedCheckbox<McpAgentType>({
    message: "Select target agents (Space to select, Enter to confirm):",
    choices,
    validate: (chosen) => {
      if (chosen.length === 0) {
        return "Please select at least one agent";
      }
      return true;
    },
  });

  return {
    global: isGlobal,
    agents: selectedAgents,
  };
};
