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
  "antigravity-cli",
  "cline",
  "cline-cli",
  "claude-code",
  "claude-desktop",
  "codex",
  "cursor",
  "gemini-cli",
  "grok",
  "goose",
  "github-copilot-cli",
  "kimi-code-cli",
  "kiro",
  "mcporter",
  "opencode",
  "pi",
  "qoder",
  "qwen-code",
  "trae",
  "vscode",
  "zed",
] as const;

describe("mcp agent catalog", () => {
  it("enumerates all 22 agents", () => {
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
      "antigravity",
      "antigravity-cli",
      "claude-code",
      "cursor",
      "codex",
      "gemini-cli",
      "grok",
      "goose",
      "github-copilot-cli",
      "kimi-code-cli",
      "kiro",
      "mcporter",
      "opencode",
      "pi",
      "qoder",
      "qwen-code",
      "trae",
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
    expect(isMcpTransportSupported(mcpAgents.grok, "http")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.grok, "sse")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.grok, "stdio")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.kiro, "http")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.kiro, "sse")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.kiro, "stdio")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.pi, "http")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.pi, "sse")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.pi, "stdio")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents["kimi-code-cli"], "http")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents["kimi-code-cli"], "sse")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents["kimi-code-cli"], "stdio")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.qoder, "http")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.qoder, "sse")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.qoder, "stdio")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents["qwen-code"], "http")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents["qwen-code"], "sse")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents["qwen-code"], "stdio")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.trae, "http")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.trae, "sse")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents.trae, "stdio")).toBe(true);
    expect(isMcpTransportSupported(mcpAgents["claude-desktop"], "http")).toBe(false);
    expect(isMcpTransportSupported(mcpAgents["claude-desktop"], "sse")).toBe(false);
    expect(isMcpTransportSupported(mcpAgents["claude-desktop"], "stdio")).toBe(true);
  });

  it("resolves aliases", () => {
    expect(mcpAgentAliases.agy).toBe("antigravity-cli");
    expect(mcpAgentAliases.gemini).toBe("gemini-cli");
    expect(mcpAgentAliases["cline-vscode"]).toBe("cline");
    expect(mcpAgentAliases["pi-agent"]).toBe("pi");
    expect(mcpAgentAliases.kimi).toBe("kimi-code-cli");
    expect(mcpAgentAliases["kimi-cli"]).toBe("kimi-code-cli");
    expect(mcpAgentAliases["kimi-code"]).toBe("kimi-code-cli");
    expect(mcpAgentAliases["kiro-cli"]).toBe("kiro");
    expect(mcpAgentAliases["kiro-ide"]).toBe("kiro");
    expect(mcpAgentAliases["grok-cli"]).toBe("grok");
    expect(mcpAgentAliases.xai).toBe("grok");
    expect(mcpAgentAliases["xai-grok"]).toBe("grok");
    expect(mcpAgentAliases["qoder-cli"]).toBe("qoder");
    expect(mcpAgentAliases.qwen).toBe("qwen-code");
    expect(mcpAgentAliases["qwen-cli"]).toBe("qwen-code");
    expect(mcpAgentAliases.qwencode).toBe("qwen-code");
    expect(mcpAgentAliases["trae-code"]).toBe("trae");
    expect(mcpAgentAliases.traecode).toBe("trae");
    expect(mcpAgentAliases["trae-ide"]).toBe("trae");
    expect(resolveMcpAgentAlias("agy")).toBe("antigravity-cli");
    expect(resolveMcpAgentAlias("gemini")).toBe("gemini-cli");
    expect(resolveMcpAgentAlias("cline-vscode")).toBe("cline");
    expect(resolveMcpAgentAlias("pi-agent")).toBe("pi");
    expect(resolveMcpAgentAlias("kimi")).toBe("kimi-code-cli");
    expect(resolveMcpAgentAlias("kimi-cli")).toBe("kimi-code-cli");
    expect(resolveMcpAgentAlias("kimi-code")).toBe("kimi-code-cli");
    expect(resolveMcpAgentAlias("kiro-cli")).toBe("kiro");
    expect(resolveMcpAgentAlias("kiro-ide")).toBe("kiro");
    expect(resolveMcpAgentAlias("kiro")).toBe("kiro");
    expect(resolveMcpAgentAlias("grok-cli")).toBe("grok");
    expect(resolveMcpAgentAlias("xai")).toBe("grok");
    expect(resolveMcpAgentAlias("xai-grok")).toBe("grok");
    expect(resolveMcpAgentAlias("grok")).toBe("grok");
    expect(resolveMcpAgentAlias("qoder-cli")).toBe("qoder");
    expect(resolveMcpAgentAlias("qoder")).toBe("qoder");
    expect(resolveMcpAgentAlias("qwen")).toBe("qwen-code");
    expect(resolveMcpAgentAlias("qwen-cli")).toBe("qwen-code");
    expect(resolveMcpAgentAlias("qwencode")).toBe("qwen-code");
    expect(resolveMcpAgentAlias("trae-code")).toBe("trae");
    expect(resolveMcpAgentAlias("traecode")).toBe("trae");
    expect(resolveMcpAgentAlias("trae-ide")).toBe("trae");
    expect(resolveMcpAgentAlias("trae")).toBe("trae");
    expect(resolveMcpAgentAlias("cursor")).toBe("cursor");
    expect(resolveMcpAgentAlias("not-an-agent")).toBeNull();
  });

  it("exposes a type-narrowing guard", () => {
    expect(isMcpAgentType("cursor")).toBe(true);
    expect(isMcpAgentType("grok")).toBe(true);
    expect(isMcpAgentType("kiro")).toBe(true);
    expect(isMcpAgentType("pi")).toBe(true);
    expect(isMcpAgentType("kimi-code-cli")).toBe(true);
    expect(isMcpAgentType("qoder")).toBe(true);
    expect(isMcpAgentType("qwen-code")).toBe(true);
    expect(isMcpAgentType("trae")).toBe(true);
    expect(isMcpAgentType("antigravity-cli")).toBe(true);
    expect(isMcpAgentType("made-up")).toBe(false);
  });

  it("transformConfig handlers return shapes tied to their agent", () => {
    expect(typeof mcpAgents.goose.transformConfig).toBe("function");
    expect(typeof mcpAgents.grok.transformConfig).toBe("function");
    expect(typeof mcpAgents.zed.transformConfig).toBe("function");
    expect(typeof mcpAgents.codex.transformConfig).toBe("function");
    expect(typeof mcpAgents.opencode.transformConfig).toBe("function");
    expect(typeof mcpAgents.pi.transformConfig).toBe("function");
    expect(typeof mcpAgents["kimi-code-cli"].transformConfig).toBe("function");
    expect(typeof mcpAgents.kiro.transformConfig).toBe("function");
    expect(typeof mcpAgents["qwen-code"].transformConfig).toBe("function");
    expect(typeof mcpAgents.trae.transformConfig).toBe("function");
    expect(typeof mcpAgents.vscode.transformConfig).toBe("function");

    expect(mcpAgents.qoder.transformConfig).toBeUndefined();
    expect(mcpAgents.cursor.transformConfig).toBeUndefined();
    expect(mcpAgents.antigravity.transformConfig).toBeUndefined();
    expect(mcpAgents["antigravity-cli"].transformConfig).toBeUndefined();
    expect(mcpAgents["claude-code"].transformConfig).toBeUndefined();
    expect(mcpAgents["github-copilot-cli"].transformConfig).toBeUndefined();
  });
});
