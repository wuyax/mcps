import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installMcpServer, resolveMcpTargetAgents } from "../src/install-mcp-server.ts";

describe("resolveMcpTargetAgents", () => {
  it("returns the requested agents verbatim and marks detected=false", () => {
    const result = resolveMcpTargetAgents(["cursor", "codex"], false, "/cwd");
    expect(result).toEqual({ agents: ["cursor", "codex"], detected: false });
  });

  it("falls back to detection when requested is undefined", () => {
    const result = resolveMcpTargetAgents(undefined, false, "/nonexistent-path-for-detection");
    expect(result.detected).toBe(true);
    expect(Array.isArray(result.agents)).toBe(true);
  });

  it("returns an empty detected array when nothing is present", () => {
    const result = resolveMcpTargetAgents(undefined, false, "/nowhere-" + Date.now());
    expect(result).toEqual({ agents: [], detected: true });
  });

  it("treats an empty array as 'no explicit request' and detects instead", () => {
    const result = resolveMcpTargetAgents([], false, "/nowhere-" + Date.now());
    expect(result.detected).toBe(true);
  });
});

describe("installMcpServer", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "agent-install-install-server-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("records a transport-unsupported failure for claude-desktop on a remote URL", () => {
    const result = installMcpServer({
      source: "https://mcp.example.com/mcp",
      agents: ["claude-desktop"],
      cwd,
    });

    expect(result.serverName).toBe("example");
    expect(result.results).toHaveLength(1);
    const record = result.results[0];
    expect(record.success).toBe(false);
    expect(record.agent).toBe("claude-desktop");
    expect(record.error).toMatch(/stdio/i);
    expect(record.path).toBe("");
  });

  it("installs a remote server to cursor and writes the exact JSONC shape", () => {
    const result = installMcpServer({
      source: "https://mcp.context7.com/mcp",
      agents: ["cursor"],
      cwd,
    });
    expect(result.serverName).toBe("context7");
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].path).toBe(join(cwd, ".cursor", "mcp.json"));

    const file = JSON.parse(readFileSync(join(cwd, ".cursor", "mcp.json"), "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(file.mcpServers.context7).toEqual({
      type: "http",
      url: "https://mcp.context7.com/mcp",
    });
  });

  it("preserves result ordering to match requested agents", () => {
    const order = ["cursor", "claude-code", "claude-desktop"] as const;
    const result = installMcpServer({
      source: "https://mcp.example.com/mcp",
      agents: [...order],
      cwd,
    });
    expect(result.results.map((record) => record.agent)).toEqual([...order]);
  });

  it("mixes successes and failures for the same batch", () => {
    const result = installMcpServer({
      source: "https://mcp.example.com/mcp",
      agents: ["cursor", "claude-desktop", "codex"],
      cwd,
    });
    expect(result.results.map((record) => record.success)).toEqual([true, false, true]);
  });

  it("applies --name override over inferred name", () => {
    const result = installMcpServer({
      source: "https://mcp.context7.com/mcp",
      agents: ["cursor"],
      name: "ctx",
      cwd,
    });
    expect(result.serverName).toBe("ctx");
    const file = JSON.parse(readFileSync(join(cwd, ".cursor", "mcp.json"), "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(Object.keys(file.mcpServers)).toEqual(["ctx"]);
  });
});
