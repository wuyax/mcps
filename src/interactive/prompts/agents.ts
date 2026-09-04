import { checkbox, select } from "@inquirer/prompts";
import pc from "picocolors";

import {
  getMcpAgentConfig,
  getMcpAgentsSupportingProjectScope,
  getMcpAgentTypes,
} from "../../agents.ts";
import { resolveTargetAgents } from "../../resolve-target-agents.ts";
import type { McpAgentType, McpScopeOptions } from "../../types.ts";
import { logger } from "../../utils/logger.ts";

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

  const availableAgentTypes = isGlobal
    ? getMcpAgentTypes()
    : getMcpAgentsSupportingProjectScope();

  if (detected.length > 0) {
    logger.info(
      `Detected configured agents: ${pc.cyan(detected.map((a) => getMcpAgentConfig(a).displayName).join(", "))}`,
    );
  } else {
    logger.warn(`No active ${isGlobal ? "global" : "project"} agents detected`);
  }

  const defaultChecked = options.defaultAgents && options.defaultAgents.length > 0
    ? options.defaultAgents
    : detected;

  const choices = availableAgentTypes.map((agentType) => {
    const config = getMcpAgentConfig(agentType);
    const isDetected = detected.includes(agentType);
    const label = `${config.displayName} ${pc.dim(`(${agentType})`)}${isDetected ? pc.green(" [detected]") : ""}`;

    return {
      name: label,
      value: agentType,
      checked: defaultChecked.includes(agentType),
    };
  });

  const selectedAgents = await checkbox<McpAgentType>({
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
