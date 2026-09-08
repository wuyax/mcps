import { describe, expect, it } from "vitest";

import {
  getCandidateAgentsForScope,
  getCoHostedAgents,
  resolveConfigClusters,
  sortAgentsWithClusters,
} from "../src/resolve-config-clusters.ts";

describe("resolve-config-clusters", () => {
  describe("getCandidateAgentsForScope", () => {
    it("returns all agents for global scope", () => {
      const globalAgents = getCandidateAgentsForScope({ global: true });
      expect(globalAgents).toContain("antigravity");
      expect(globalAgents).toContain("claude-desktop");
    });

    it("excludes desktop-only agents for project scope", () => {
      const projectAgents = getCandidateAgentsForScope({ global: false });
      expect(projectAgents).toContain("antigravity");
      expect(projectAgents).not.toContain("claude-desktop");
    });
  });

  describe("getCoHostedAgents", () => {
    it("identifies antigravity and antigravity-cli as co-hosted globally", () => {
      const coHosted = getCoHostedAgents("antigravity", { global: true });
      expect(coHosted).toContain("antigravity-cli");

      const cliCoHosted = getCoHostedAgents("antigravity-cli", { global: true });
      expect(cliCoHosted).toContain("antigravity");
    });

    it("identifies antigravity and antigravity-cli as co-hosted in project scope", () => {
      const cwd = "/test/project";
      const coHosted = getCoHostedAgents("antigravity", { global: false, cwd });
      expect(coHosted).toContain("antigravity-cli");
    });

    it("identifies agents sharing .mcp.json in project scope", () => {
      const cwd = "/test/project";
      const coHosted = getCoHostedAgents("claude-code", { global: false, cwd });
      expect(coHosted).toContain("github-copilot-cli");
      expect(coHosted).toContain("qoder");
    });

    it("returns empty array for an agent with exclusive config", () => {
      const cwd = "/test/project";
      const coHosted = getCoHostedAgents("cursor", { global: false, cwd });
      expect(coHosted).toEqual([]);
    });
  });

  describe("resolveConfigClusters", () => {
    it("groups antigravity and antigravity-cli into the same cluster", () => {
      const clusters = resolveConfigClusters(["antigravity", "antigravity-cli", "cursor"], {
        global: true,
      });

      expect(clusters).toHaveLength(2);
      const antigravityCluster = clusters.find((c) => c.targetAgents.includes("antigravity"));
      expect(antigravityCluster).toBeDefined();
      expect(antigravityCluster?.targetAgents).toEqual(["antigravity", "antigravity-cli"]);
      expect(antigravityCluster?.coHostedAgents).toEqual([]);

      const cursorCluster = clusters.find((c) => c.targetAgents.includes("cursor"));
      expect(cursorCluster).toBeDefined();
      expect(cursorCluster?.targetAgents).toEqual(["cursor"]);
    });

    it("marks remaining co-hosted agents in coHostedAgents when only one is requested", () => {
      const clusters = resolveConfigClusters(["antigravity", "cursor"], {
        global: true,
      });

      expect(clusters).toHaveLength(2);
      const antigravityCluster = clusters.find((c) => c.targetAgents.includes("antigravity"));
      expect(antigravityCluster?.targetAgents).toEqual(["antigravity"]);
      expect(antigravityCluster?.coHostedAgents).toContain("antigravity-cli");
    });
  });

  describe("sortAgentsWithClusters", () => {
    it("places co-hosted agents adjacent to each other", () => {
      const input = ["cursor", "antigravity", "vscode", "antigravity-cli"];
      const sorted = sortAgentsWithClusters(input as any, { global: true });

      const idx1 = sorted.indexOf("antigravity" as any);
      const idx2 = sorted.indexOf("antigravity-cli" as any);
      expect(Math.abs(idx1 - idx2)).toBe(1);
    });
  });
});
