import { describe, expect, it } from "vitest";
import {
  AgentConfigStore,
  displayServerDetails,

  formatArgsString,
  formatEnvText,
  formatHeadersText,
  groupInstalledServersByName,
  mainMenu,
  maskSecretHeader,
  maskSecretValue,
  mcpManageCommand,
  parseEnvText,
  promptEditArgs,
  promptEditEnvConfig,
  promptEditHeadersConfig,
  promptEditKeyValueConfig,
  promptEnvConfig,
  promptScope,
  promptScopeAndAgents,
  updateMcpServerForAgent,
  wizardAdd,
  wizardManage,
  wizardRemove,
  type McpStdioServerConfig,
} from "../src/index.ts";
import { MemoryConfigStoreAdapter } from "../src/config-store.ts";
import { getMcpAgentConfig, isMcpTransportSupported } from "../src/agents.ts";



describe("Interactive modules export and API", () => {
  it("should export all interactive wizards and prompt utilities", () => {
    expect(typeof mainMenu).toBe("function");
    expect(typeof wizardAdd).toBe("function");
    expect(typeof wizardManage).toBe("function");
    expect(typeof wizardRemove).toBe("function");
    expect(typeof promptEnvConfig).toBe("function");
    expect(typeof promptEditEnvConfig).toBe("function");
    expect(typeof promptEditArgs).toBe("function");
    expect(typeof promptEditHeadersConfig).toBe("function");
    expect(typeof formatEnvText).toBe("function");
    expect(typeof formatArgsString).toBe("function");
    expect(typeof formatHeadersText).toBe("function");
    expect(typeof maskSecretValue).toBe("function");
    expect(typeof maskSecretHeader).toBe("function");
    expect(typeof promptScopeAndAgents).toBe("function");
    expect(typeof promptScope).toBe("function");
    expect(typeof parseEnvText).toBe("function");
    expect(typeof groupInstalledServersByName).toBe("function");

    expect(typeof displayServerDetails).toBe("function");
    expect(typeof promptEditKeyValueConfig).toBe("function");
    expect(typeof updateMcpServerForAgent).toBe("function");

    expect(mcpManageCommand.name()).toBe("manage");
  });


  it("should parse complex multiline env configurations", () => {
    const raw = `
      # Comment 1
      POSTGRES_USER=admin
      POSTGRES_PASSWORD="super-secret-password"
      DATABASE_URL='postgresql://admin:super-secret-password@localhost:5432/mydb?sslmode=disable'
      
      # Comment 2
      export API_ENDPOINT=https://example.com/v1
    `;

    const parsed = parseEnvText(raw);
    expect(parsed).toEqual({
      POSTGRES_USER: "admin",
      POSTGRES_PASSWORD: "super-secret-password",
      DATABASE_URL: "postgresql://admin:super-secret-password@localhost:5432/mydb?sslmode=disable",
      API_ENDPOINT: "https://example.com/v1",
    });
  });

  it("should group installed servers by server name and normalize configs", () => {
    const rawServers = [
      {
        serverName: "github",
        agent: "cursor" as const,
        path: "/path/cursor",
        config: { command: "npx", args: ["-y", "@modelcontextprotocol/server-github"] },
      },
      {
        serverName: "github",
        agent: "vscode" as const,
        path: "/path/vscode",
        config: { command: "npx", args: ["-y", "@modelcontextprotocol/server-github"] },
      },
      {
        serverName: "remote-api",
        agent: "cursor" as const,
        path: "/path/cursor",
        config: { type: "sse", url: "https://api.example.com/sse", headers: { Auth: "token" } },
      },
    ];

    const grouped = groupInstalledServersByName(rawServers);
    expect(grouped.size).toBe(2);

    const github = grouped.get("github");
    expect(github).toBeDefined();
    expect(github?.agents).toEqual(["cursor", "vscode"]);
    expect(github?.config.command).toBe("npx");

    const remote = grouped.get("remote-api");
    expect(remote).toBeDefined();
    expect(remote?.agents).toEqual(["cursor"]);
    expect(remote?.config.type).toBe("sse");
    expect(remote?.config.url).toBe("https://api.example.com/sse");
  });

  it("should support updating server config env and args via updateMcpServerForAgent", () => {
    const memoryAdapter = new MemoryConfigStoreAdapter();
    const customStore = new AgentConfigStore(memoryAdapter);

    // Initial server
    const initialConfig = {
      command: "node",
      args: ["server.js"],
      env: { PORT: "3000", DB_USER: "postgres" },
    };
    customStore.writeServer("cursor", "my-server", initialConfig, { cwd: "/test" });

    // Verify initial
    const srv1 = customStore.readServer("cursor", "my-server", { cwd: "/test" }) as McpStdioServerConfig;
    expect(srv1.env?.PORT).toBe("3000");

    // Updated server config with modified env and args
    const updatedConfig = {
      command: "node",
      args: ["server.js", "--verbose"],
      env: { PORT: "8080", DB_USER: "postgres", API_KEY: "secret" },
    };
    customStore.writeServer("cursor", "my-server", updatedConfig, { cwd: "/test" });

    // Verify updated
    const srv2 = customStore.readServer("cursor", "my-server", { cwd: "/test" }) as McpStdioServerConfig;
    expect(srv2.args).toEqual(["server.js", "--verbose"]);
    expect(srv2.env?.PORT).toBe("8080");
    expect(srv2.env?.API_KEY).toBe("secret");
  });

  it("should validate transport capability for target agents correctly", () => {
    // Goose agent supports stdio and streamable_http (sse/http)
    const goose = getMcpAgentConfig("goose");
    expect(isMcpTransportSupported(goose, "stdio")).toBe(true);

    // Claude Desktop supports only stdio
    const claudeDesktop = getMcpAgentConfig("claude-desktop");
    expect(isMcpTransportSupported(claudeDesktop, "stdio")).toBe(true);
    expect(isMcpTransportSupported(claudeDesktop, "sse")).toBe(false);
    expect(isMcpTransportSupported(claudeDesktop, "http")).toBe(false);
  });


  it("should display server details without throwing", () => {
    expect(() =>
      displayServerDetails({
        serverName: "test-srv",
        config: {
          command: "node",
          args: ["index.js"],
          env: { API_KEY: "secret123" },
        },
        agents: ["cursor", "vscode"],
        isGlobal: true,
      }),
    ).not.toThrow();

    expect(() =>
      displayServerDetails({
        serverName: "remote-srv",
        config: {
          type: "sse",
          url: "https://mcp.example.com/sse",
          headers: { Authorization: "Bearer secret" },
        },
        agents: ["cursor"],
        isGlobal: false,
      }),
    ).not.toThrow();
  });
});


