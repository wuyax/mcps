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
    const serverPayload = { command: "npx", args: ["-y", "test-mcp"] };
    const writeResult = store.writeServer("cursor", "test-srv", serverPayload, {
      cwd: fakeCwd,
    });
    expect(writeResult.path).toBe(join(fakeCwd, ".cursor", "mcp.json"));

    // 3. List servers now shows exists: true and contains test-srv
    const afterWriteList = store.listServers("cursor", { cwd: fakeCwd });
    expect(afterWriteList.exists).toBe(true);
    expect(afterWriteList.servers).toEqual({
      "test-srv": serverPayload,
    });

    // 4. readServer returns the server config
    const read = store.readServer("cursor", "test-srv", { cwd: fakeCwd });
    expect(read).toEqual(serverPayload);

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
