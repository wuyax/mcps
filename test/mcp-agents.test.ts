import { describe, expect, it } from "vitest";

import {
  getMcpAgentTypes,
  getMcpAgentsSupportingProjectScope,
  isMcpAgentType,
  isMcpTransportSupported,
  mcpAgentAliases,
  mcpAgents,
  resolveMcpAgentAlias,
} from "../src/agents.ts";

const EXPECTED_AGENTS = [
  "antigravity",
  "cline",
  "cline-cli",
  "claude-code",
  "claude-desktop",
  "codex",
  "cursor",
  "gemini-cli",
  "goose",
  "github-copilot-cli",
  "mcporter",
  "opencode",
  "vscode",
  "zed",
] as const;

describe("mcp agent catalog", () => {
  it("enumerates all 14 agents", () => {
    const types = getMcpAgentTypes();
    expect(types).toHaveLength(EXPECTED_AGENTS.length);
    for (const expected of EXPECTED_AGENTS) {
      expect(types).toContain(expected);
    }
  });

  it("every agent declares the required fields", () => {
    for (const agent of Object.values(mcpAgents)) {
      expect(agent.name).toBeTypeOf("string");
      expect(agent.displayName).toBeTypeOf("string");
      expect(agent.globalConfigPath).toBeTypeOf("string");
      expect(agent.configKey).toBeTypeOf("string");
      expect(["json", "jsonc", "yaml", "toml"]).toContain(agent.format);
      expect(Array.isArray(agent.supportedTransports)).toBe(true);
      expect(agent.supportedTransports.length).toBeGreaterThan(0);
      expect(typeof agent.detectGlobalInstall).toBe("function");
    }
  });

  it("flags project-capable agents", () => {
    const projectAgents = getMcpAgentsSupportingProjectScope();
    for (const expected of [
      "claude-code",
      "cursor",
      "codex",
      "gemini-cli",
      "goose",
      "github-copilot-cli",
      "mcporter",
      "opencode",
      "vscode",
      "zed",
    ]) {
      expect(projectAgents).toContain(expected);
    }
  });

  it("marks claude-desktop as global-only (stdio-only)", () => {
    const agent = mcpAgents["claude-desktop"];
    expect(agent.projectConfigPath).toBeUndefined();
    expect(agent.supportedTransports).toEqual(["stdio"]);
    expect(agent.unsupportedTransportMessage).toBeTypeOf("string");
  });

  it("isMcpTransportSupported reflects supportedTransports", () => {
    expect(isMcpTransportSupported(mcpAgents.cursor, "http")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.cursor, "sse")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.cursor, "stdio")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents["claude-desktop"], "http")).toBe(false);
    expect(isMcpTransportSupported(mcpAgents["claude-desktop"], "sse")).toBe(false);
    expect(isMcpTransportSupported(mcpAgents["claude-desktop"], "stdio")).toBe(true);
  });

  it("resolves aliases", () => {
    expect(mcpAgentAliases.gemini).toBe("gemini-cli");
    expect(mcpAgentAliases["cline-vscode"]).toBe("cline");
    expect(resolveMcpAgentAlias("gemini")).toBe("gemini-cli");
    expect(resolveMcpAgentAlias("cline-vscode")).toBe("cline");
    expect(resolveMcpAgentAlias("cursor")).toBe("cursor");
    expect(resolveMcpAgentAlias("not-an-agent")).toBeNull();
  });

  it("exposes a type-narrowing guard", () => {
    expect(isMcpAgentType("cursor")).toBe(true);
    expect(isMcpAgentType("made-up")).toBe(false);
  });

  it("transformConfig handlers return shapes tied to their agent", () => {
    expect(typeof mcpAgents.goose.transformConfig).toBe("function");
    expect(typeof mcpAgents.zed.transformConfig).toBe("function");
    expect(typeof mcpAgents.codex.transformConfig).toBe("function");
    expect(typeof mcpAgents.opencode.transformConfig).toBe("function");
    expect(typeof mcpAgents.vscode.transformConfig).toBe("function");
    expect(typeof mcpAgents["github-copilot-cli"].transformConfig).toBe("function");

    expect(mcpAgents.cursor.transformConfig).toBeUndefined();
    expect(mcpAgents["claude-code"].transformConfig).toBeUndefined();
  });
});
