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

export interface ConfigStoreAdapter {
  exists(filePath: string): boolean;
  read(filePath: string, format: McpConfigFormat): Record<string, unknown>;
  writeServer(
    filePath: string,
    format: McpConfigFormat,
    dottedKey: string,
    serverName: string,
    serverConfig: unknown,
  ): void;
  removeServer(
    filePath: string,
    format: McpConfigFormat,
    dottedKey: string,
    serverName: string,
  ): boolean;
  listServers(
    filePath: string,
    format: McpConfigFormat,
    dottedKey: string,
  ): Record<string, unknown>;
}

export class FsConfigStoreAdapter implements ConfigStoreAdapter {
  exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  read(filePath: string, format: McpConfigFormat): Record<string, unknown> {
    return readConfigFile(filePath, format);
  }

  writeServer(
    filePath: string,
    format: McpConfigFormat,
    dottedKey: string,
    serverName: string,
    serverConfig: unknown,
  ): void {
    writeServerToConfigFile(filePath, format, dottedKey, serverName, serverConfig);
  }

  removeServer(
    filePath: string,
    format: McpConfigFormat,
    dottedKey: string,
    serverName: string,
  ): boolean {
    return removeServerFromConfigFile(filePath, format, dottedKey, serverName);
  }

  listServers(
    filePath: string,
    format: McpConfigFormat,
    dottedKey: string,
  ): Record<string, unknown> {
    return listServersInConfigFile(filePath, format, dottedKey);
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

  read(filePath: string, _format: McpConfigFormat): Record<string, unknown> {
    const file = this.files.get(filePath);
    return file ? JSON.parse(JSON.stringify(file)) : {};
  }

  writeServer(
    filePath: string,
    _format: McpConfigFormat,
    dottedKey: string,
    serverName: string,
    serverConfig: unknown,
  ): void {
    const root = this.files.get(filePath) ?? {};
    const existingServers = getNestedValue(root, dottedKey);
    const servers = isPlainObject(existingServers) ? { ...existingServers } : {};
    servers[serverName] = JSON.parse(JSON.stringify(serverConfig));

    setNestedValue(root, dottedKey, servers);
    this.files.set(filePath, root);
  }

  removeServer(
    filePath: string,
    _format: McpConfigFormat,
    dottedKey: string,
    serverName: string,
  ): boolean {
    const root = this.files.get(filePath);
    if (!root) return false;

    const didRemove = deleteNestedValue(root, `${dottedKey}.${serverName}`);
    return didRemove;
  }

  listServers(
    filePath: string,
    _format: McpConfigFormat,
    dottedKey: string,
  ): Record<string, unknown> {
    const root = this.files.get(filePath);
    if (!root) return {};

    const servers = getNestedValue(root, dottedKey);
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

  writeServer(
    agent: McpAgentType | McpAgentConfig,
    serverName: string,
    serverConfig: unknown,
    options: McpScopeOptions = {},
  ): AgentConfigStoreWriteResult {
    const { agent: agentConfig, target } = this.resolveTarget(agent, options);
    this.adapter.writeServer(
      target.configPath,
      agentConfig.format,
      target.configKey,
      serverName,
      serverConfig,
    );
    return { path: target.configPath };
  }

  removeServer(
    agent: McpAgentType | McpAgentConfig,
    serverName: string,
    options: McpScopeOptions = {},
  ): AgentConfigStoreRemoveResult {
    const { agent: agentConfig, target } = this.resolveTarget(agent, options);
    if (!this.adapter.exists(target.configPath)) {
      return { path: target.configPath, removed: false };
    }

    const removed = this.adapter.removeServer(
      target.configPath,
      agentConfig.format,
      target.configKey,
      serverName,
    );
    return { path: target.configPath, removed };
  }

  listServers(
    agent: McpAgentType | McpAgentConfig,
    options: McpScopeOptions = {},
  ): AgentConfigStoreListResult {
    const { agent: agentConfig, target } = this.resolveTarget(agent, options);
    if (!this.adapter.exists(target.configPath)) {
      return { path: target.configPath, exists: false, servers: {} };
    }

    const servers = this.adapter.listServers(
      target.configPath,
      agentConfig.format,
      target.configKey,
    );
    return { path: target.configPath, exists: true, servers };
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
