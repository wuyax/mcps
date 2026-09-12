import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AgentConfigStore,
  MemoryConfigStoreAdapter,
  agentConfigStore,
} from "../src/config-store.ts";
import { getMcpAgentConfig } from "../src/agents.ts";

describe("AgentConfigStore with MemoryConfigStoreAdapter", () => {
  it("writes, reads, lists, and removes servers purely in memory", () => {
    const memoryAdapter = new MemoryConfigStoreAdapter();
    const store = new AgentConfigStore(memoryAdapter);

    const agent = getMcpAgentConfig("cursor");
    const fakeCwd = "/virtual/workspace";

    // 1. Initial list on non-existent config returns exists: false
    const initialList = store.listServers("cursor", { cwd: fakeCwd });
    expect(initialList.exists).toBe(false);
    expect(initialList.servers).toEqual({});

    // 2. Write server in project scope
    const testServerConfig = { command: "npx", args: ["-y", "test-mcp"] };
    const writeResult = store.writeServer("cursor", "test-srv", testServerConfig, {
      cwd: fakeCwd,
    });
    expect(writeResult.path).toBe(join(fakeCwd, ".cursor", "mcp.json"));

    // 3. List servers now shows exists: true and contains test-srv
    const afterWriteList = store.listServers("cursor", { cwd: fakeCwd });
    expect(afterWriteList.exists).toBe(true);
    expect(afterWriteList.servers).toEqual({
      "test-srv": testServerConfig,
    });

    // 4. readServer returns the server config
    const read = store.readServer("cursor", "test-srv", { cwd: fakeCwd });
    expect(read).toEqual(testServerConfig);

    // 4.1 read returns the entire config file object
    const wholeFile = store.read("cursor", { cwd: fakeCwd });
    expect(wholeFile).toEqual({
      mcpServers: {
        "test-srv": testServerConfig,
      },
    });

    // 4.2 read on non-existent config returns {}
    expect(store.read("cursor", { cwd: "/nonexistent-" + Date.now() })).toEqual({});

    // 5. readServer on non-existent server returns undefined
    expect(store.readServer("cursor", "unknown-srv", { cwd: fakeCwd })).toBeUndefined();

    // 6. Remove server
    const removeResult = store.removeServer("cursor", "test-srv", { cwd: fakeCwd });
    expect(removeResult.removed).toBe(true);

    // 7. List servers after remove is empty
    const afterRemoveList = store.listServers("cursor", { cwd: fakeCwd });
    expect(afterRemoveList.exists).toBe(true);
    expect(afterRemoveList.servers).toEqual({});

    // 8. Removing again returns removed: false
    const removeAgain = store.removeServer("cursor", "test-srv", { cwd: fakeCwd });
    expect(removeAgain.removed).toBe(false);
  });

  it("handles initial files seeded into MemoryConfigStoreAdapter", () => {
    const configPath = "/virtual/vscode/mcp.json";
    const memoryAdapter = new MemoryConfigStoreAdapter({
      [configPath]: {
        servers: {
          existing: { command: "node", args: ["server.js"] },
        },
      },
    });
    const store = new AgentConfigStore(memoryAdapter);

    expect(memoryAdapter.exists(configPath)).toBe(true);
    const dump = memoryAdapter.dump();
    expect(dump[configPath].servers).toBeDefined();
  });

  it("deduplicates batch writeServers and removeServers in memory across co-hosted agents", () => {
    const memoryAdapter = new MemoryConfigStoreAdapter();
    const store = new AgentConfigStore(memoryAdapter);
    const fakeCwd = "/virtual/workspace";

    // 1. Single agent write: antigravity reports antigravity-cli as coConfigured
    const singleWrite = store.writeServers(
      ["antigravity"],
      "single-srv",
      { command: "node", args: ["single.js"] },
      { cwd: fakeCwd, global: false },
    );
    expect(singleWrite[0].success).toBe(true);
    expect(singleWrite[0].coConfiguredAgents).toEqual(["antigravity-cli"]);

    // 2. Both co-hosted agents requested: deduplicates physical write to single file
    const writeResults = store.writeServers(
      ["antigravity", "antigravity-cli"],
      "shared-srv",
      { command: "node", args: ["shared.js"] },
      { cwd: fakeCwd, global: false },
    );

    expect(writeResults).toHaveLength(2);
    expect(writeResults[0].agent).toBe("antigravity");
    expect(writeResults[0].success).toBe(true);
    expect(writeResults[0].coConfiguredAgents).toBeUndefined(); // Both are targets, none left out

    expect(writeResults[1].agent).toBe("antigravity-cli");
    expect(writeResults[1].success).toBe(true);
    expect(writeResults[1].coConfiguredAgents).toBeUndefined();

    // Verify only one file exists in memory adapter
    const expectedPath = join(fakeCwd, ".agents", "mcp_config.json");
    expect(memoryAdapter.exists(expectedPath)).toBe(true);

    const listResult = store.listServers("antigravity", { cwd: fakeCwd, global: false });
    expect(listResult.servers["shared-srv"]).toBeDefined();

    // 3. Remove single agent: reports coAffectedAgents
    const singleRemove = store.removeServers(
      ["antigravity"],
      "single-srv",
      { cwd: fakeCwd, global: false },
    );
    expect(singleRemove[0].removed).toBe(true);
    expect(singleRemove[0].coAffectedAgents).toEqual(["antigravity-cli"]);

    // 4. Batch remove both co-hosted agents
    const removeResults = store.removeServers(
      ["antigravity", "antigravity-cli"],
      "shared-srv",
      { cwd: fakeCwd, global: false },
    );

    expect(removeResults).toHaveLength(2);
    expect(removeResults[0].agent).toBe("antigravity");
    expect(removeResults[0].removed).toBe(true);
    expect(removeResults[0].coAffectedAgents).toBeUndefined();

    expect(removeResults[1].agent).toBe("antigravity-cli");
    expect(removeResults[1].removed).toBe(true);
    expect(removeResults[1].coAffectedAgents).toBeUndefined();

    const afterRemove = store.listServers("antigravity", { cwd: fakeCwd, global: false });
    expect(afterRemove.servers["shared-srv"]).toBeUndefined();
  });
});

describe("AgentConfigStore with default FsConfigStoreAdapter", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `mcps-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("writes and lists JSONC servers using singleton store", () => {
    const writeResult = agentConfigStore.writeServer(
      "cursor",
      "fs-srv",
      { command: "npx", args: ["-y", "fs-server"] },
      { cwd: testDir },
    );

    expect(existsSync(writeResult.path)).toBe(true);
    const listResult = agentConfigStore.listServers("cursor", { cwd: testDir });
    expect(listResult.exists).toBe(true);
    expect(listResult.servers["fs-srv"]).toEqual({ command: "npx", args: ["-y", "fs-server"] });

    const wholeConfig = agentConfigStore.read("cursor", { cwd: testDir });
    expect(wholeConfig.mcpServers).toEqual({
      "fs-srv": { command: "npx", args: ["-y", "fs-server"] },
    });

    const removeResult = agentConfigStore.removeServer("cursor", "fs-srv", { cwd: testDir });
    expect(removeResult.removed).toBe(true);

    const emptyList = agentConfigStore.listServers("cursor", { cwd: testDir });
    expect(emptyList.servers).toEqual({});
  });

  it("writes and lists YAML servers using singleton store", () => {
    const writeResult = agentConfigStore.writeServer(
      "goose",
      "goose-srv",
      {
        name: "goose-srv",
        cmd: "python3",
        args: ["-m", "srv"],
        type: "stdio",
      },
      { cwd: testDir },
    );

    expect(existsSync(writeResult.path)).toBe(true);
    const content = readFileSync(writeResult.path, "utf-8");
    expect(content).toContain("goose-srv");

    const listResult = agentConfigStore.listServers("goose", { cwd: testDir });
    expect(listResult.exists).toBe(true);
    expect(listResult.servers["goose-srv"]).toBeDefined();
  });

  it("writes and lists TOML servers using singleton store", () => {
    const writeResult = agentConfigStore.writeServer(
      "codex",
      "codex-srv",
      {
        command: "node",
        args: ["index.js"],
      },
      { cwd: testDir },
    );

    expect(existsSync(writeResult.path)).toBe(true);
    const content = readFileSync(writeResult.path, "utf-8");
    expect(content).toContain("codex-srv");

    const listResult = agentConfigStore.listServers("codex", { cwd: testDir });
    expect(listResult.exists).toBe(true);
    expect(listResult.servers["codex-srv"]).toBeDefined();
  });
});
