import { describe, expect, it } from "vitest";

import { resolveTargetAgents } from "../src/resolve-target-agents.ts";
import { getMcpAgentTypes } from "../src/agents.ts";

describe("resolveTargetAgents", () => {
  it("resolves explicitly requested agents with aliases and preserves order", () => {
    const result = resolveTargetAgents({
      requested: ["cursor", "vscode"],
      global: false,
      cwd: "/dummy",
    });

    expect(result.agents).toEqual(["cursor", "vscode"]);
    expect(result.allAgents).toEqual(["cursor", "vscode"]);
    expect(result.isDetected).toBe(false);
    expect(result.incompatible).toEqual([]);
    expect(result.diagnostic).toBeUndefined();
  });

  it("expands wildcard '*' to all supported agent types", () => {
    const result = resolveTargetAgents({
      requested: ["*"],
    });

    expect(result.agents).toEqual(getMcpAgentTypes());
    expect(result.allAgents).toEqual(getMcpAgentTypes());
    expect(result.isDetected).toBe(false);
  });

  it("resolves all agents when all flag is true", () => {
    const result = resolveTargetAgents({
      all: true,
    });

    expect(result.agents).toEqual(getMcpAgentTypes());
    expect(result.isDetected).toBe(false);
  });

  it("falls back to detection when no agents are requested", () => {
    const result = resolveTargetAgents({
      requested: [],
      global: false,
      cwd: "/nonexistent-path-for-testing-" + Date.now(),
    });

    expect(result.isDetected).toBe(true);
    expect(result.agents).toEqual([]);
    expect(result.diagnostic).toMatch(/No project-installed MCP agents detected/);
  });

  it("filters incompatible transports and populates incompatible records", () => {
    const result = resolveTargetAgents({
      requested: ["cursor", "claude-desktop", "vscode"],
      transport: "http",
    });

    expect(result.allAgents).toEqual(["cursor", "claude-desktop", "vscode"]);
    expect(result.agents).toEqual(["cursor", "vscode"]);
    expect(result.incompatible).toHaveLength(1);
    expect(result.incompatible[0].agent).toBe("claude-desktop");
    expect(result.incompatible[0].reason).toMatch(/stdio/i);
  });

  it("provides diagnostic message when all requested agents are incompatible with transport", () => {
    const result = resolveTargetAgents({
      requested: ["claude-desktop"],
      transport: "http",
    });

    expect(result.agents).toEqual([]);
    expect(result.incompatible).toHaveLength(1);
    expect(result.diagnostic).toMatch(/None of the selected agents support http transport/);
  });
});
