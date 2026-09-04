import { describe, expect, it } from "vitest";

import { mcpAgents } from "../src/agents.ts";
import { resolveMcpConfigTarget } from "../src/resolve-config-target.ts";
import type { McpAgentConfig } from "../src/types.ts";

describe("resolveMcpConfigTarget", () => {
  it("resolves the global config path and key", () => {
    const { configPath, configKey } = resolveMcpConfigTarget(mcpAgents.cursor, {
      global: true,
      cwd: "/project",
    });
    expect(configPath.endsWith(".cursor/mcp.json")).toBe(true);
    expect(configKey).toBe("mcpServers");
  });

  it("joins project config path with cwd", () => {
    const { configPath } = resolveMcpConfigTarget(mcpAgents.cursor, {
      global: false,
      cwd: "/root/proj",
    });
    expect(configPath).toBe("/root/proj/.cursor/mcp.json");
  });

  it("falls back to globalConfigPath when projectConfigPath is absent (claude-desktop)", () => {
    const { configPath } = resolveMcpConfigTarget(mcpAgents["claude-desktop"], {
      global: false,
      cwd: "/any",
    });
    expect(configPath).toBe(mcpAgents["claude-desktop"].globalConfigPath);
  });

  it("prefers projectConfigKey when set and scope is project", () => {
    const customAgent: McpAgentConfig = {
      ...mcpAgents.cursor,
      projectConfigKey: "customServers",
    };
    const projectTarget = resolveMcpConfigTarget(customAgent, {
      global: false,
      cwd: "/proj",
    });
    expect(projectTarget.configKey).toBe("customServers");

    const globalTarget = resolveMcpConfigTarget(customAgent, {
      global: true,
      cwd: "/proj",
    });
    expect(globalTarget.configKey).toBe("mcpServers");
  });

  it("honors the resolveConfigPath hook when an agent provides one", () => {
    const customAgent: McpAgentConfig = {
      ...mcpAgents.cursor,
      resolveConfigPath: (options) =>
        options.global ? "/custom/global.json" : `/custom/${options.cwd}/config.json`,
    };

    expect(resolveMcpConfigTarget(customAgent, { global: true, cwd: "/ignored" }).configPath).toBe(
      "/custom/global.json",
    );
    expect(
      resolveMcpConfigTarget(customAgent, { global: false, cwd: "projectroot" }).configPath,
    ).toBe("/custom/projectroot/config.json");
  });

  it("defaults options: no cwd uses process.cwd(); no global is false", () => {
    const { configPath } = resolveMcpConfigTarget(mcpAgents.cursor);
    expect(configPath.endsWith(".cursor/mcp.json")).toBe(true);
    expect(configPath.startsWith(process.cwd())).toBe(true);
  });

  it("resolves qoder target paths for global and project scopes", () => {
    const globalTarget = resolveMcpConfigTarget(mcpAgents.qoder, { global: true });
    expect(globalTarget.configPath.endsWith(".qoder/settings.json")).toBe(true);
    expect(globalTarget.configKey).toBe("mcpServers");

    const projectTarget = resolveMcpConfigTarget(mcpAgents.qoder, { global: false, cwd: "/proj" });
    expect(projectTarget.configPath).toBe("/proj/.mcp.json");
    expect(projectTarget.configKey).toBe("mcpServers");
  });
});
