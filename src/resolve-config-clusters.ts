import {
  getMcpAgentConfig,
  getMcpAgentsSupportingProjectScope,
  getMcpAgentTypes,
} from "./agents.ts";
import { resolveMcpConfigTarget } from "./resolve-config-target.ts";
import type { ConfigCluster, McpAgentType, McpScopeOptions } from "./types.ts";

/**
 * Returns candidate agent types relevant for the given scope.
 */
export const getCandidateAgentsForScope = (options: McpScopeOptions = {}): McpAgentType[] => {
  return options.global ? getMcpAgentTypes() : getMcpAgentsSupportingProjectScope();
};

/**
 * Returns all other agents sharing the exact same physical configuration target
 * (same configPath and configKey) for the given scope.
 */
export const getCoHostedAgents = (
  agentType: McpAgentType,
  options: McpScopeOptions = {},
): McpAgentType[] => {
  const currentAgent = getMcpAgentConfig(agentType);
  const currentTarget = resolveMcpConfigTarget(currentAgent, options);
  const candidates = getCandidateAgentsForScope(options);

  const coHosted: McpAgentType[] = [];
  for (const candidateType of candidates) {
    if (candidateType === agentType) continue;
    const candidateConfig = getMcpAgentConfig(candidateType);
    const candidateTarget = resolveMcpConfigTarget(candidateConfig, options);
    if (
      candidateTarget.configPath === currentTarget.configPath &&
      candidateTarget.configKey === currentTarget.configKey
    ) {
      coHosted.push(candidateType);
    }
  }

  return coHosted;
};

/**
 * Resolves configuration clusters for a given list of requested agents.
 * Groups requested agents sharing the same physical config path, and tracks
 * any remaining co-hosted agents sharing the same target that were not in the request.
 */
export const resolveConfigClusters = (
  agentTypes: McpAgentType[],
  options: McpScopeOptions = {},
): ConfigCluster[] => {
  const clustersByPath = new Map<string, Map<string, ConfigCluster>>();

  for (const agentType of agentTypes) {
    const agentConfig = getMcpAgentConfig(agentType);
    const target = resolveMcpConfigTarget(agentConfig, options);

    let keyMap = clustersByPath.get(target.configPath);
    if (!keyMap) {
      keyMap = new Map();
      clustersByPath.set(target.configPath, keyMap);
    }

    let cluster = keyMap.get(target.configKey);
    if (!cluster) {
      const allCoHosted = getCoHostedAgents(agentType, options);
      cluster = {
        configPath: target.configPath,
        configKey: target.configKey,
        targetAgents: [],
        coHostedAgents: allCoHosted,
      };
      keyMap.set(target.configKey, cluster);
    }

    if (!cluster.targetAgents.includes(agentType)) {
      cluster.targetAgents.push(agentType);
    }
  }

  const clusters: ConfigCluster[] = [];
  for (const keyMap of clustersByPath.values()) {
    for (const cluster of keyMap.values()) {
      cluster.coHostedAgents = cluster.coHostedAgents.filter(
        (co) => !cluster.targetAgents.includes(co),
      );
      clusters.push(cluster);
    }
  }

  return clusters;
};

/**
 * Sorts agent types so that agents sharing the same physical config target
 * appear adjacent to each other in the returned array.
 */
export const sortAgentsWithClusters = (
  agentTypes: McpAgentType[],
  options: McpScopeOptions = {},
): McpAgentType[] => {
  const clusters = resolveConfigClusters(agentTypes, options);
  const sorted: McpAgentType[] = [];

  for (const cluster of clusters) {
    for (const agent of cluster.targetAgents) {
      if (!sorted.includes(agent)) {
        sorted.push(agent);
      }
    }
  }

  return sorted;
};
