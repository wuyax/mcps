import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installMcpServer } from "../src/install-mcp-server.ts";
import { listInstalledMcpServers } from "../src/list.ts";
import { mcpManageCommand } from "../src/cli/manage.ts";
import {
  detectUpdateTransition,
  sanitizeUpdatedServerConfig,
  updateMcpServer,
} from "../src/update-mcp-server.ts";

describe("sanitizeUpdatedServerConfig", () => {
  it("strips stdio fields when switching to remote server", () => {
    const previous = {
      command: "node",
      args: ["index.js"],
      env: { API_KEY: "123" },
    };
    const incoming = {
      url: "https://example.com/mcp",
      headers: { Authorization: "Bearer token" },
    };

    const sanitized = sanitizeUpdatedServerConfig(incoming, previous);
    expect(sanitized.url).toBe("https://example.com/mcp");
    expect(sanitized.type).toBe("http");
    expect(sanitized.headers).toEqual({ Authorization: "Bearer token" });
    expect(sanitized.command).toBeUndefined();
    expect(sanitized.args).toBeUndefined();
    expect(sanitized.env).toBeUndefined();
  });

  it("strips remote fields when switching to stdio server", () => {
    const previous = {
      url: "https://example.com/mcp",
      type: "sse" as const,
      headers: { Authorization: "Bearer token" },
    };
    const incoming = {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-memory"],
      env: { DEBUG: "true" },
    };

    const sanitized = sanitizeUpdatedServerConfig(incoming, previous);
    expect(sanitized.command).toBe("npx");
    expect(sanitized.args).toEqual(["-y", "@modelcontextprotocol/server-memory"]);
    expect(sanitized.env).toEqual({ DEBUG: "true" });
    expect(sanitized.url).toBeUndefined();
    expect(sanitized.type).toBeUndefined();
    expect(sanitized.headers).toBeUndefined();
  });

  it("preserves stdio fields when updating an existing stdio server", () => {
    const previous = {
      command: "node",
      args: ["old.js"],
      env: { PORT: "3000" },
    };
    const incoming = {
      args: ["new.js"],
      env: { PORT: "8080", NEW_VAR: "abc" },
    };

    const sanitized = sanitizeUpdatedServerConfig(incoming, previous);
    expect(sanitized.command).toBe("node");
    expect(sanitized.args).toEqual(["new.js"]);
    expect(sanitized.env).toEqual({ PORT: "8080", NEW_VAR: "abc" });
    expect(sanitized.url).toBeUndefined();
  });

  it("cleans standalone incoming config without previous reference", () => {
    const dirtyRemote = {
      url: "https://example.com",
      command: "node",
      args: ["dummy.js"],
    };
    const cleanedRemote = sanitizeUpdatedServerConfig(dirtyRemote);
    expect(cleanedRemote.url).toBe("https://example.com");
    expect(cleanedRemote.command).toBeUndefined();
    expect(cleanedRemote.args).toBeUndefined();

    const dirtyStdio = {
      command: "python",
      args: ["main.py"],
      url: undefined,
      headers: { "X-Test": "1" },
    };
    const cleanedStdio = sanitizeUpdatedServerConfig(dirtyStdio);
    expect(cleanedStdio.command).toBe("python");
    expect(cleanedStdio.headers).toBeUndefined();
  });

  it("detects transition categories correctly via detectUpdateTransition", () => {
    // switch-to-remote
    expect(
      detectUpdateTransition(
        { url: "https://example.com" },
        { command: "node" },
      ),
    ).toBe("switch-to-remote");

    // switch-to-stdio
    expect(
      detectUpdateTransition(
        { command: "node" },
        { url: "https://example.com" },
      ),
    ).toBe("switch-to-stdio");

    // merge-remote
    expect(
      detectUpdateTransition(
        { headers: { Authorization: "Bearer 1" } },
        { url: "https://example.com" },
      ),
    ).toBe("merge-remote");

    // merge-stdio
    expect(
      detectUpdateTransition(
        { env: { PORT: "8080" } },
        { command: "node", args: ["index.js"] },
      ),
    ).toBe("merge-stdio");
  });
});

describe("updateMcpServer core orchestration", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "agent-update-server-test-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("updates an existing stdio server with new args and env", () => {
    // 1. Initial install
    installMcpServer({
      source: "node server.js",
      name: "test-srv",
      agents: ["cursor"],
      env: { FOO: "bar" },
      cwd,
    });

    // 2. Update via updateMcpServer
    const updateResult = updateMcpServer({
      serverName: "test-srv",
      config: {
        command: "node",
        args: ["server.js", "--verbose"],
        env: { FOO: "baz", ADDED: "1" },
      },
      agents: ["cursor"],
      cwd,
    });

    expect(updateResult.serverName).toBe("test-srv");
    expect(updateResult.incompatible).toHaveLength(0);
    expect(updateResult.results).toHaveLength(1);
    expect(updateResult.results[0].success).toBe(true);

    const listed = listInstalledMcpServers({ cwd, agents: ["cursor"] });
    expect(listed).toHaveLength(1);
    expect(listed[0].serverConfig?.args).toEqual(["server.js", "--verbose"]);
    expect(listed[0].serverConfig?.env?.FOO).toBe("baz");
    expect(listed[0].serverConfig?.env?.ADDED).toBe("1");
  });

  it("filters incompatible agents when switching from stdio to remote", () => {
    // Initial install into claude-desktop and cursor (both support stdio)
    installMcpServer({
      source: "node server.js",
      name: "dual-srv",
      agents: ["claude-desktop", "cursor"],
      cwd,
    });

    // Switch to remote URL (claude-desktop does not support remote transports)
    const updateResult = updateMcpServer({
      serverName: "dual-srv",
      config: {
        url: "https://remote.example.com/mcp",
        type: "http",
      },
      agents: ["claude-desktop", "cursor"],
      cwd,
    });

    expect(updateResult.incompatible).toHaveLength(1);
    expect(updateResult.incompatible[0].agent).toBe("claude-desktop");

    const claudeRes = updateResult.results.find((r) => r.agent === "claude-desktop");
    expect(claudeRes?.success).toBe(false);
    expect(claudeRes?.error).toMatch(/stdio/i);

    const cursorRes = updateResult.results.find((r) => r.agent === "cursor");
    expect(cursorRes?.success).toBe(true);

    // Cursor should now have the remote config, stripped of stdio fields
    const cursorServers = listInstalledMcpServers({ cwd, agents: ["cursor"] });
    const updatedCursor = cursorServers.find((s) => s.serverName === "dual-srv");
    expect(updatedCursor?.serverConfig?.url).toBe("https://remote.example.com/mcp");
    expect(updatedCursor?.serverConfig?.command).toBeUndefined();
  });

  it("automatically discovers previousConfig and installed agents when not supplied", () => {
    installMcpServer({
      source: "node server.js",
      name: "auto-srv",
      agents: ["cursor"],
      env: { KEY1: "val1" },
      cwd,
    });

    // Update without explicit agents and previousConfig
    const updateResult = updateMcpServer({
      serverName: "auto-srv",
      config: {
        command: "node",
        args: ["new.js"],
      },
      cwd,
    });

    expect(updateResult.results).toHaveLength(1);
    expect(updateResult.results[0].agent).toBe("cursor");
    expect(updateResult.results[0].success).toBe(true);

    const listed = listInstalledMcpServers({ cwd, agents: ["cursor"] });
    expect(listed[0].serverConfig?.args).toEqual(["new.js"]);
  });
});

describe("CLI manage clear flags", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "agent-cli-clear-test-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("clears env using --clear-env flag", async () => {
    installMcpServer({
      source: "node server.js",
      name: "env-srv",
      agents: ["cursor"],
      env: { VAR1: "1", VAR2: "2" },
      cwd,
    });

    const origCwd = process.cwd();
    try {
      process.chdir(cwd);
      await mcpManageCommand.parseAsync(["node", "test", "env-srv", "--clear-env", "-a", "cursor"]);

      const listed = listInstalledMcpServers({ cwd, agents: ["cursor"] });
      expect(listed[0].serverConfig?.env).toBeUndefined();
    } finally {
      process.chdir(origCwd);
    }
  });

  it("clears headers using --clear-headers flag", async () => {
    installMcpServer({
      source: "https://example.com/mcp",
      name: "header-srv",
      agents: ["cursor"],
      headers: { "X-Api-Key": "secret123" },
      cwd,
    });

    const origCwd = process.cwd();
    try {
      process.chdir(cwd);
      await mcpManageCommand.parseAsync(["node", "test", "header-srv", "--clear-headers", "-a", "cursor"]);

      const listed = listInstalledMcpServers({ cwd, agents: ["cursor"] });
      expect(listed[0].serverConfig?.headers).toBeUndefined();
    } finally {
      process.chdir(origCwd);
    }
  });

  it("clears args using --clear-args flag", async () => {
    installMcpServer({
      source: "node server.js",
      name: "args-srv",
      agents: ["cursor"],
      args: ["--port", "8080"],
      cwd,
    });

    const origCwd = process.cwd();
    try {
      process.chdir(cwd);
      await mcpManageCommand.parseAsync(["node", "test", "args-srv", "--clear-args", "-a", "cursor"]);

      const listed = listInstalledMcpServers({ cwd, agents: ["cursor"] });
      expect(listed[0].serverConfig?.args).toBeUndefined();
    } finally {
      process.chdir(origCwd);
    }
  });

  it("switches from stdio to remote via CLI without leaving dirty fields", async () => {
    installMcpServer({
      source: "node server.js",
      name: "switch-srv",
      agents: ["cursor"],
      args: ["--arg1"],
      env: { FOO: "bar" },
      cwd,
    });

    const origCwd = process.cwd();
    try {
      process.chdir(cwd);
      await mcpManageCommand.parseAsync([
        "node",
        "test",
        "switch-srv",
        "--url",
        "https://api.example.com/mcp",
        "-a",
        "cursor",
      ]);

      const listed = listInstalledMcpServers({ cwd, agents: ["cursor"] });
      expect(listed[0].serverConfig?.url).toBe("https://api.example.com/mcp");
      expect(listed[0].serverConfig?.command).toBeUndefined();
      expect(listed[0].serverConfig?.args).toBeUndefined();
      expect(listed[0].serverConfig?.env).toBeUndefined();
    } finally {
      process.chdir(origCwd);
    }
  });

  it("switches from remote to stdio via CLI without leaving dirty fields", async () => {
    installMcpServer({
      source: "https://api.example.com/mcp",
      name: "remote-switch-srv",
      agents: ["cursor"],
      headers: { Authorization: "Bearer xyz" },
      cwd,
    });

    const origCwd = process.cwd();
    try {
      process.chdir(cwd);
      await mcpManageCommand.parseAsync([
        "node",
        "test",
        "remote-switch-srv",
        "--command",
        "npx",
        "--args",
        "-y",
        "my-server",
        "-a",
        "cursor",
      ]);

      const listed = listInstalledMcpServers({ cwd, agents: ["cursor"] });
      expect(listed[0].serverConfig?.command).toBe("npx");
      expect(listed[0].serverConfig?.args).toEqual(["-y", "my-server"]);
      expect(listed[0].serverConfig?.url).toBeUndefined();
      expect(listed[0].serverConfig?.headers).toBeUndefined();
    } finally {
      process.chdir(origCwd);
    }
  });

  it("rejects simultaneous --url and --command with exit code 1", async () => {
    installMcpServer({
      source: "node server.js",
      name: "conflict-srv",
      agents: ["cursor"],
      cwd,
    });

    const origCwd = process.cwd();
    const origExitCode = process.exitCode;
    try {
      process.chdir(cwd);
      process.exitCode = undefined;
      await mcpManageCommand.parseAsync([
        "node",
        "test",
        "conflict-srv",
        "--url",
        "https://example.com",
        "--command",
        "node",
        "-a",
        "cursor",
      ]);

      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = origExitCode;
      process.chdir(origCwd);
    }
  });
});
