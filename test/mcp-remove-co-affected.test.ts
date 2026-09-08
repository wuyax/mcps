import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { removeMcpServer, removeMcpServerFromAgent } from "../src/remove.ts";
import { installMcpServerForAgents } from "../src/installer.ts";

describe("Co-affected and deduplicated removal", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mcp-remove-co-affected-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("reports coAffectedAgents when removing from a single agent with co-hosts", () => {
    // Both antigravity and antigravity-cli share .agents/mcp_config.json in project scope
    const agentsDir = join(tempDir, ".agents");
    mkdirSync(agentsDir, { recursive: true });
    const configPath = join(agentsDir, "mcp_config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          testServer: { command: "node", args: ["test.js"] },
        },
      }),
    );

    const result = removeMcpServerFromAgent("testServer", "antigravity", {
      global: false,
      cwd: tempDir,
    });

    expect(result.removed).toBe(true);
    expect(result.coAffectedAgents).toContain("antigravity-cli");

    const content = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(content.mcpServers.testServer).toBeUndefined();
  });

  it("does not report coAffectedAgents when server was not present (removed is false)", () => {
    const agentsDir = join(tempDir, ".agents");
    mkdirSync(agentsDir, { recursive: true });
    const configPath = join(agentsDir, "mcp_config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {},
      }),
    );

    const result = removeMcpServerFromAgent("nonExistentServer", "antigravity", {
      global: false,
      cwd: tempDir,
    });

    expect(result.removed).toBe(false);
    expect(result.coAffectedAgents).toBeUndefined();
  });

  it("deduplicates physical removal when all co-hosted agents are requested", () => {
    const agentsDir = join(tempDir, ".agents");
    mkdirSync(agentsDir, { recursive: true });
    const configPath = join(agentsDir, "mcp_config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          sharedServer: { command: "node", args: ["test.js"] },
        },
      }),
    );

    const results = removeMcpServer({
      name: "sharedServer",
      agents: ["antigravity", "antigravity-cli"],
      global: false,
      cwd: tempDir,
    });

    // Both requested agents should report removed: true
    expect(results).toHaveLength(2);
    const agyResult = results.find((r) => r.agent === "antigravity");
    const cliResult = results.find((r) => r.agent === "antigravity-cli");

    expect(agyResult?.removed).toBe(true);
    expect(cliResult?.removed).toBe(true);

    // Neither should list the other as co-affected since both were explicitly requested
    expect(agyResult?.coAffectedAgents).toBeUndefined();
    expect(cliResult?.coAffectedAgents).toBeUndefined();

    const content = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(content.mcpServers.sharedServer).toBeUndefined();
  });

  it("handles shared .mcp.json removal across claude-code, github-copilot-cli, and qoder", () => {
    const configPath = join(tempDir, ".mcp.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          multiServer: { command: "node", args: ["index.js"] },
        },
      }),
    );

    // Only removing from claude-code
    const results = removeMcpServer({
      name: "multiServer",
      agents: ["claude-code"],
      global: false,
      cwd: tempDir,
    });

    expect(results).toHaveLength(1);
    expect(results[0].agent).toBe("claude-code");
    expect(results[0].removed).toBe(true);
    expect(results[0].coAffectedAgents).toContain("github-copilot-cli");
    expect(results[0].coAffectedAgents).toContain("qoder");
  });
});

describe("Co-configured installation deduplication", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mcp-install-co-configured-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("deduplicates physical write when installing to co-hosted agents", () => {
    const results = installMcpServerForAgents(
      "myService",
      { command: "node", args: ["srv.js"] },
      ["antigravity", "antigravity-cli"],
      { global: false, cwd: tempDir },
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);

    const configPath = join(tempDir, ".agents", "mcp_config.json");
    const content = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(content.mcpServers.myService).toBeDefined();
  });
});
