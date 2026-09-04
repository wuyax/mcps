import { existsSync } from "node:fs";

import { getMcpAgentConfig } from "./agents.ts";
import {
  listServersInConfigFile,
  readConfigFile,
  removeServerFromConfigFile,
  writeServerToConfigFile,
} from "./formats/index.ts";
import { resolveMcpConfigTarget, type McpConfigTarget } from "./resolve-config-target.ts";
import type {
  McpAgentConfig,
  McpAgentType,
  McpConfigFormat,
  McpScopeOptions,
} from "./types.ts";
import { deleteNestedValue } from "./utils/delete-nested-value.ts";
import { getNestedValue } from "./utils/get-nested-value.ts";
import { isPlainObject } from "./utils/is-plain-object.ts";
import { setNestedValue } from "./utils/set-nested-value.ts";

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

/**
 * Deep module: Coordinates Agent config target resolution, file checking,
 * and format persistence behind a unified seam.
 */
export class AgentConfigStore {
  constructor(private adapter: ConfigStoreAdapter = new FsConfigStoreAdapter()) {}

  getAdapter(): ConfigStoreAdapter {
    return this.adapter;
  }

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
}

/**
 * Singleton AgentConfigStore using standard file system adapter.
 */
export const agentConfigStore = new AgentConfigStore();
