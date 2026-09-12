import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  getMcpAgentConfig,
  getMcpAgentsSupportingProjectScope,
  getMcpAgentTypes,
} from "./agents.ts";
import {
  listServersInConfigFile,
  readConfigFile,
  removeServerFromConfigFile,
  writeServerToConfigFile,
} from "./formats/index.ts";
import { transformServerConfigForAgent } from "./transforms/index.ts";
import type {
  ConfigCluster,
  McpAgentConfig,
  McpAgentType,
  McpConfigFormat,
  McpInstallResultForAgent,
  McpScopeOptions,
  McpServerConfig,
  RemoveMcpServerResult,
} from "./types.ts";
import { deleteNestedValue } from "./utils/delete-nested-value.ts";
import { getNestedValue } from "./utils/get-nested-value.ts";
import { isPlainObject } from "./utils/is-plain-object.ts";
import { setNestedValue } from "./utils/set-nested-value.ts";
import { toErrorMessage } from "./utils/to-error-message.ts";

// ---------------------------------------------------------------------------
// McpConfigTarget — internalized from resolve-config-target.ts
// ---------------------------------------------------------------------------

export interface McpConfigTarget {
  configPath: string;
  configKey: string;
}

const resolveMcpConfigTarget = (
  agent: McpAgentConfig,
  options: McpScopeOptions = {},
): McpConfigTarget => {
  const isGlobal = options.global ?? false;
  const cwd = options.cwd ?? process.cwd();

  const configPath = agent.resolveConfigPath
    ? agent.resolveConfigPath({ global: isGlobal, cwd })
    : !isGlobal && agent.projectConfigPath
      ? join(cwd, agent.projectConfigPath)
      : agent.globalConfigPath;

  const configKey = !isGlobal && agent.projectConfigKey ? agent.projectConfigKey : agent.configKey;

  return { configPath, configKey };
};

// Re-export for public API compatibility
export { resolveMcpConfigTarget };

// ---------------------------------------------------------------------------
// Scope-based candidate resolution — internalized from resolve-config-clusters.ts
// ---------------------------------------------------------------------------

/**
 * Returns candidate agent types relevant for the given scope.
 */
export const getCandidateAgentsForScope = (options: McpScopeOptions = {}): McpAgentType[] => {
  return options.global ? getMcpAgentTypes() : getMcpAgentsSupportingProjectScope();
};

// ---------------------------------------------------------------------------
// ConfigStoreAdapter seam — physical storage abstraction
// ---------------------------------------------------------------------------

export interface ConfigTargetDescriptor {
  filePath: string;
  format: McpConfigFormat;
  dottedKey?: string;
}

export interface ConfigStoreAdapter {
  exists(filePath: string): boolean;
  read(target: ConfigTargetDescriptor): Record<string, unknown>;
  writeServer(
    target: ConfigTargetDescriptor,
    serverName: string,
    serverConfig: unknown,
  ): void;
  removeServer(
    target: ConfigTargetDescriptor,
    serverName: string,
  ): boolean;
  listServers(
    target: ConfigTargetDescriptor,
  ): Record<string, unknown>;
}

export class FsConfigStoreAdapter implements ConfigStoreAdapter {
  exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  read(target: ConfigTargetDescriptor): Record<string, unknown> {
    return readConfigFile(target.filePath, target.format);
  }

  writeServer(
    target: ConfigTargetDescriptor,
    serverName: string,
    serverConfig: unknown,
  ): void {
    if (!target.dottedKey) {
      throw new Error(`Cannot write server: missing dottedKey for ${target.filePath}`);
    }
    writeServerToConfigFile(
      target.filePath,
      target.format,
      target.dottedKey,
      serverName,
      serverConfig,
    );
  }

  removeServer(
    target: ConfigTargetDescriptor,
    serverName: string,
  ): boolean {
    if (!target.dottedKey) return false;
    return removeServerFromConfigFile(
      target.filePath,
      target.format,
      target.dottedKey,
      serverName,
    );
  }

  listServers(
    target: ConfigTargetDescriptor,
  ): Record<string, unknown> {
    if (!target.dottedKey) return {};
    return listServersInConfigFile(target.filePath, target.format, target.dottedKey);
  }
}

export class MemoryConfigStoreAdapter implements ConfigStoreAdapter {
  private files: Map<string, Record<string, unknown>> = new Map();

  constructor(initialFiles?: Record<string, Record<string, unknown>>) {
    if (initialFiles) {
      for (const [path, content] of Object.entries(initialFiles)) {
        this.files.set(path, JSON.parse(JSON.stringify(content)));
      }
    }
  }

  exists(filePath: string): boolean {
    return this.files.has(filePath);
  }

  read(target: ConfigTargetDescriptor): Record<string, unknown> {
    const file = this.files.get(target.filePath);
    return file ? JSON.parse(JSON.stringify(file)) : {};
  }

  writeServer(
    target: ConfigTargetDescriptor,
    serverName: string,
    serverConfig: unknown,
  ): void {
    if (!target.dottedKey) return;
    const root = this.files.get(target.filePath) ?? {};
    const existingServers = getNestedValue(root, target.dottedKey);
    const servers = isPlainObject(existingServers) ? { ...existingServers } : {};
    servers[serverName] = JSON.parse(JSON.stringify(serverConfig));

    setNestedValue(root, target.dottedKey, servers);
    this.files.set(target.filePath, root);
  }

  removeServer(
    target: ConfigTargetDescriptor,
    serverName: string,
  ): boolean {
    if (!target.dottedKey) return false;
    const root = this.files.get(target.filePath);
    if (!root) return false;

    return deleteNestedValue(root, `${target.dottedKey}.${serverName}`);
  }

  listServers(
    target: ConfigTargetDescriptor,
  ): Record<string, unknown> {
    if (!target.dottedKey) return {};
    const root = this.files.get(target.filePath);
    if (!root) return {};

    const servers = getNestedValue(root, target.dottedKey);
    return isPlainObject(servers) ? JSON.parse(JSON.stringify(servers)) : {};
  }

  dump(): Record<string, Record<string, unknown>> {
    const dumped: Record<string, Record<string, unknown>> = {};
    for (const [path, content] of this.files.entries()) {
      dumped[path] = JSON.parse(JSON.stringify(content));
    }
    return dumped;
  }
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface AgentConfigStoreWriteResult {
  path: string;
}

export interface AgentConfigStoreRemoveResult {
  path: string;
  removed: boolean;
}

export interface AgentConfigStoreListResult {
  path: string;
  exists: boolean;
  servers: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// AgentConfigStore — deep module
// ---------------------------------------------------------------------------

/**
 * Deep module: Coordinates Agent config target resolution, cluster deduplication,
 * dialect transforms, file checking, and format persistence behind a unified seam.
 */
export class AgentConfigStore {
  constructor(private adapter: ConfigStoreAdapter = new FsConfigStoreAdapter()) {}

  getAdapter(): ConfigStoreAdapter {
    return this.adapter;
  }

  // ---- Single-agent primitives ----

  resolveTarget(
    agent: McpAgentType | McpAgentConfig,
    options: McpScopeOptions = {},
  ): { agent: McpAgentConfig; target: McpConfigTarget } {
    const agentConfig = typeof agent === "string" ? getMcpAgentConfig(agent) : agent;
    const target = resolveMcpConfigTarget(agentConfig, options);
    return { agent: agentConfig, target };
  }

  resolveDescriptor(
    agent: McpAgentType | McpAgentConfig,
    options: McpScopeOptions = {},
  ): ConfigTargetDescriptor {
    const { agent: agentConfig, target } = this.resolveTarget(agent, options);
    return {
      filePath: target.configPath,
      format: agentConfig.format,
      dottedKey: target.configKey,
    };
  }

  writeServer(
    agent: McpAgentType | McpAgentConfig,
    serverName: string,
    serverConfig: unknown,
    options: McpScopeOptions = {},
  ): AgentConfigStoreWriteResult {
    const descriptor = this.resolveDescriptor(agent, options);
    this.adapter.writeServer(descriptor, serverName, serverConfig);
    return { path: descriptor.filePath };
  }

  removeServer(
    agent: McpAgentType | McpAgentConfig,
    serverName: string,
    options: McpScopeOptions = {},
  ): AgentConfigStoreRemoveResult {
    const descriptor = this.resolveDescriptor(agent, options);
    if (!this.adapter.exists(descriptor.filePath)) {
      return { path: descriptor.filePath, removed: false };
    }

    const removed = this.adapter.removeServer(descriptor, serverName);
    return { path: descriptor.filePath, removed };
  }

  listServers(
    agent: McpAgentType | McpAgentConfig,
    options: McpScopeOptions = {},
  ): AgentConfigStoreListResult {
    const descriptor = this.resolveDescriptor(agent, options);
    if (!this.adapter.exists(descriptor.filePath)) {
      return { path: descriptor.filePath, exists: false, servers: {} };
    }

    const servers = this.adapter.listServers(descriptor);
    return { path: descriptor.filePath, exists: true, servers };
  }

  read(
    agent: McpAgentType | McpAgentConfig,
    options: McpScopeOptions = {},
  ): Record<string, unknown> {
    const descriptor = this.resolveDescriptor(agent, options);
    if (!this.adapter.exists(descriptor.filePath)) {
      return {};
    }
    return this.adapter.read(descriptor);
  }

  readServer(
    agent: McpAgentType | McpAgentConfig,
    serverName: string,
    options: McpScopeOptions = {},
  ): unknown | undefined {
    const { exists, servers } = this.listServers(agent, options);
    if (!exists) return undefined;
    return servers[serverName];
  }

  // ---- Cluster & co-hosted awareness ----

  /**
   * Returns all other agents sharing the exact same physical configuration target
   * (same configPath and configKey) for the given scope.
   */
  getCoHostedAgents(
    agentType: McpAgentType,
    options: McpScopeOptions = {},
  ): McpAgentType[] {
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
  }

  /**
   * Resolves configuration clusters for a given list of requested agents.
   * Groups requested agents sharing the same physical config path, and tracks
   * any remaining co-hosted agents sharing the same target that were not in the request.
   */
  resolveConfigClusters(
    agentTypes: McpAgentType[],
    options: McpScopeOptions = {},
  ): ConfigCluster[] {
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
        const allCoHosted = this.getCoHostedAgents(agentType, options);
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
  }

  /**
   * Sorts agent types so that agents sharing the same physical config target
   * appear adjacent to each other in the returned array.
   */
  sortAgentsByClusters(
    agentTypes: McpAgentType[],
    options: McpScopeOptions = {},
  ): McpAgentType[] {
    const clusters = this.resolveConfigClusters(agentTypes, options);
    const sorted: McpAgentType[] = [];

    for (const cluster of clusters) {
      for (const agent of cluster.targetAgents) {
        if (!sorted.includes(agent)) {
          sorted.push(agent);
        }
      }
    }

    return sorted;
  }

  // ---- Batch operations with automatic clustering & dialect transforms ----

  /**
   * Batch write: transforms and writes a server config to multiple agents,
   * with automatic cluster deduplication, dialect transform, and co-hosted awareness.
   * Callers pass standard McpServerConfig; the Store applies per-Agent dialect transforms
   * internally before persisting.
   */
  writeServers(
    agents: McpAgentType[],
    serverName: string,
    serverConfig: McpServerConfig,
    options: McpScopeOptions = {},
  ): McpInstallResultForAgent[] {
    const clusters = this.resolveConfigClusters(agents, options);
    const resultsByAgent = new Map<McpAgentType, McpInstallResultForAgent>();
    const isGlobal = options.global ?? false;

    for (const cluster of clusters) {
      const primaryAgentType = cluster.targetAgents[0]!;
      const primaryAgent = getMcpAgentConfig(primaryAgentType);

      try {
        const transformed = transformServerConfigForAgent(primaryAgent, serverName, serverConfig, {
          global: isGlobal,
        });
        const descriptor = this.resolveDescriptor(primaryAgent, options);
        this.adapter.writeServer(descriptor, serverName, transformed);

        for (const agentType of cluster.targetAgents) {
          resultsByAgent.set(agentType, {
            agent: agentType,
            success: true,
            path: cluster.configPath,
            coConfiguredAgents:
              cluster.coHostedAgents.length > 0 ? cluster.coHostedAgents : undefined,
          });
        }
      } catch (error) {
        const errorMsg = toErrorMessage(error);
        for (const agentType of cluster.targetAgents) {
          resultsByAgent.set(agentType, {
            agent: agentType,
            success: false,
            path: cluster.configPath,
            error: errorMsg,
          });
        }
      }
    }

    return agents.map((agentType) => resultsByAgent.get(agentType)!);
  }

  /**
   * Batch remove: removes a server from multiple agents' configs,
   * with automatic cluster deduplication and co-hosted awareness.
   */
  removeServers(
    agents: McpAgentType[],
    serverName: string,
    options: McpScopeOptions = {},
  ): RemoveMcpServerResult[] {
    const clusters = this.resolveConfigClusters(agents, options);
    const results: RemoveMcpServerResult[] = [];

    for (const cluster of clusters) {
      const primaryAgentType = cluster.targetAgents[0]!;
      const primaryAgent = getMcpAgentConfig(primaryAgentType);

      try {
        const { removed } = this.removeServer(primaryAgent, serverName, options);

        for (const agentType of cluster.targetAgents) {
          results.push({
            agent: agentType,
            path: cluster.configPath,
            removed,
            coAffectedAgents:
              removed && cluster.coHostedAgents.length > 0 ? cluster.coHostedAgents : undefined,
          });
        }
      } catch (error) {
        const errorMsg = toErrorMessage(error);
        for (const agentType of cluster.targetAgents) {
          results.push({
            agent: agentType,
            path: cluster.configPath,
            removed: false,
            error: errorMsg,
          });
        }
      }
    }

    return results;
  }
}

/**
 * Singleton AgentConfigStore using standard file system adapter.
 */
export const agentConfigStore = new AgentConfigStore();
