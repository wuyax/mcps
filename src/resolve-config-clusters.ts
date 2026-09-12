import { agentConfigStore, getCandidateAgentsForScope } from "./config-store.ts";
import type { ConfigCluster, McpAgentType, McpScopeOptions } from "./types.ts";

export { getCandidateAgentsForScope };

/**
 * Returns all other agents sharing the exact same physical configuration target
 * (same configPath and configKey) for the given scope.
 */
export const getCoHostedAgents = (
  agentType: McpAgentType,
  options: McpScopeOptions = {},
): McpAgentType[] => agentConfigStore.getCoHostedAgents(agentType, options);

/**
 * Resolves configuration clusters for a given list of requested agents.
 */
export const resolveConfigClusters = (
  agentTypes: McpAgentType[],
  options: McpScopeOptions = {},
): ConfigCluster[] => agentConfigStore.resolveConfigClusters(agentTypes, options);

/**
 * Sorts agent types so that agents sharing the same physical config target
 * appear adjacent to each other in the returned array.
 */
export const sortAgentsByClusters = (
  agentTypes: McpAgentType[],
  options: McpScopeOptions = {},
): McpAgentType[] => agentConfigStore.sortAgentsByClusters(agentTypes, options);

/**
 * Backward-compatible alias for sortAgentsByClusters.
 */
export const sortAgentsWithClusters = sortAgentsByClusters;
