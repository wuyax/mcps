import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import TOML from "@iarna/toml";
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

  it("installs a remote server to pi and writes the Pi extension JSON shape", () => {
    const result = installMcpServer({
      source: "https://mcp.supabase.com/mcp",
      agents: ["pi"],
      cwd,
    });
    expect(result.serverName).toBe("supabase");
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].path).toBe(join(cwd, ".pi", "mcp.json"));

    const file = JSON.parse(readFileSync(join(cwd, ".pi", "mcp.json"), "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(file.mcpServers.supabase).toEqual({
      transport: "streamable-http",
      url: "https://mcp.supabase.com/mcp",
    });
  });

  it("installs a stdio server to pi with transport=stdio", () => {
    const result = installMcpServer({
      source: "@modelcontextprotocol/server-postgres",
      agents: ["pi"],
      cwd,
    });
    expect(result.serverName).toBe("postgres");
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].path).toBe(join(cwd, ".pi", "mcp.json"));

    const file = JSON.parse(readFileSync(join(cwd, ".pi", "mcp.json"), "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(file.mcpServers.postgres).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres"],
      transport: "stdio",
    });
  });

  it("installs remote and stdio servers to kimi-code-cli in .kimi-code/mcp.json", () => {
    const httpResult = installMcpServer({
      source: "https://mcp.linear.app/mcp",
      agents: ["kimi-code-cli"],
      cwd,
    });
    expect(httpResult.serverName).toBe("linear");
    expect(httpResult.results[0].success).toBe(true);
    expect(httpResult.results[0].path).toBe(join(cwd, ".kimi-code", "mcp.json"));

    const sseResult = installMcpServer({
      source: "https://mcp.example.com/sse",
      transport: "sse",
      name: "legacy-events",
      agents: ["kimi-code-cli"],
      cwd,
    });
    expect(sseResult.results[0].success).toBe(true);

    const stdioResult = installMcpServer({
      source: "@modelcontextprotocol/server-filesystem",
      args: ["/tmp"],
      agents: ["kimi-code-cli"],
      cwd,
    });
    expect(stdioResult.results[0].success).toBe(true);

    const file = JSON.parse(readFileSync(join(cwd, ".kimi-code", "mcp.json"), "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(file.mcpServers.linear).toEqual({
      url: "https://mcp.linear.app/mcp",
    });
    expect(file.mcpServers["legacy-events"]).toEqual({
      transport: "sse",
      url: "https://mcp.example.com/sse",
    });
    expect(file.mcpServers.filesystem).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    });
  });

  it("installs remote and stdio servers to qoder in .mcp.json by default", () => {
    const result = installMcpServer({
      source: "@playwright/mcp@latest",
      name: "playwright",
      agents: ["qoder"],
      cwd,
    });
    expect(result.serverName).toBe("playwright");
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].path).toBe(join(cwd, ".mcp.json"));

    const file = JSON.parse(readFileSync(join(cwd, ".mcp.json"), "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(file.mcpServers.playwright).toEqual({
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
    });
  });

  it("installs remote HTTP, SSE, and stdio servers to qwen-code in .qwen/settings.json", () => {
    const httpResult = installMcpServer({
      source: "https://mcp.linear.app/mcp",
      name: "linear",
      agents: ["qwen-code"],
      headers: { Authorization: "Bearer tok" },
      cwd,
    });
    expect(httpResult.results[0].success).toBe(true);

    const sseResult = installMcpServer({
      source: "https://mcp.example.com/sse",
      name: "legacy-events",
      transport: "sse",
      agents: ["qwen-code"],
      cwd,
    });
    expect(sseResult.results[0].success).toBe(true);

    const stdioResult = installMcpServer({
      source: "@modelcontextprotocol/server-filesystem",
      name: "filesystem",
      args: ["/tmp"],
      env: { LOG_LEVEL: "debug" },
      agents: ["qwen-code"],
      cwd,
    });
    expect(stdioResult.results[0].success).toBe(true);

    const file = JSON.parse(readFileSync(join(cwd, ".qwen", "settings.json"), "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(file.mcpServers.linear).toEqual({
      httpUrl: "https://mcp.linear.app/mcp",
      headers: { Authorization: "Bearer tok" },
    });
    expect(file.mcpServers["legacy-events"]).toEqual({
      url: "https://mcp.example.com/sse",
    });
    expect(file.mcpServers.filesystem).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      env: { LOG_LEVEL: "debug" },
    });
  });

  it("installs remote and stdio servers to kiro in .kiro/settings/mcp.json", () => {
    const remoteResult = installMcpServer({
      source: "https://api.example.com/mcp",
      name: "api-server",
      agents: ["kiro"],
      headers: { Authorization: "Bearer tok" },
      cwd,
    });
    expect(remoteResult.results[0].success).toBe(true);

    const stdioResult = installMcpServer({
      source: "uvx mcp-server-fetch",
      name: "fetch",
      agents: ["kiro"],
      cwd,
    });
    expect(stdioResult.results[0].success).toBe(true);

    const file = JSON.parse(
      readFileSync(join(cwd, ".kiro", "settings", "mcp.json"), "utf-8"),
    ) as {
      mcpServers: Record<string, unknown>;
    };
    expect(file.mcpServers["api-server"]).toEqual({
      url: "https://api.example.com/mcp",
      headers: { Authorization: "Bearer tok" },
    });
    expect(file.mcpServers.fetch).toEqual({
      command: "uvx",
      args: ["mcp-server-fetch"],
    });
  });

  it("installs remote and stdio servers to grok in .grok/config.toml", () => {
    const remoteResult = installMcpServer({
      source: "https://mcp.linear.app/mcp",
      name: "linear",
      agents: ["grok"],
      headers: { "x-mcp-session-id": "123" },
      cwd,
    });
    expect(remoteResult.results[0].success).toBe(true);

    const stdioResult = installMcpServer({
      source: "@modelcontextprotocol/server-filesystem",
      name: "filesystem",
      args: ["/path/to/dir"],
      env: { API_KEY: "my-key" },
      agents: ["grok"],
      cwd,
    });
    expect(stdioResult.results[0].success).toBe(true);

    const raw = readFileSync(join(cwd, ".grok", "config.toml"), "utf-8");
    const parsed = TOML.parse(raw) as {
      mcp_servers: Record<string, Record<string, unknown>>;
    };
    expect(parsed.mcp_servers.linear).toEqual({
      url: "https://mcp.linear.app/mcp",
      headers: { "x-mcp-session-id": "123" },
    });
    expect(parsed.mcp_servers.filesystem).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
      env: { API_KEY: "my-key" },
    });
  });

  it("installs remote and stdio servers to trae in .trae/mcp.json", () => {
    const remoteResult = installMcpServer({
      source: "https://example.com/mcp",
      name: "mcp_remote",
      agents: ["trae"],
      headers: { Authorization: "Bearer xxxx-xxxxxxx" },
      cwd,
    });
    expect(remoteResult.results[0].success).toBe(true);

    const stdioResult = installMcpServer({
      source: "@modelcontextprotocol/server-github",
      name: "mcp_github",
      agents: ["trae"],
      env: { API_Key: "value" },
      cwd,
    });
    expect(stdioResult.results[0].success).toBe(true);

    const file = JSON.parse(
      readFileSync(join(cwd, ".trae", "mcp.json"), "utf-8"),
    ) as {
      mcpServers: Record<string, unknown>;
    };
    expect(file.mcpServers.mcp_remote).toEqual({
      url: "https://example.com/mcp",
      headers: { Authorization: "Bearer xxxx-xxxxxxx" },
    });
    expect(file.mcpServers.mcp_github).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { API_Key: "value" },
    });
  });
});

