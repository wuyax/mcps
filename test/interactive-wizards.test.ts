import { describe, expect, it } from "vitest";

import {
  groupInstalledServersByName,
  mainMenu,
  parseEnvText,
  promptEnvConfig,
  promptScope,
  promptScopeAndAgents,
  wizardAdd,
  wizardManage,
  wizardRemove,
} from "../src/index.ts";

describe("Interactive modules export and API", () => {
  it("should export all interactive wizards and prompt utilities", () => {
    expect(typeof mainMenu).toBe("function");
    expect(typeof wizardAdd).toBe("function");
    expect(typeof wizardManage).toBe("function");
    expect(typeof wizardRemove).toBe("function");
    expect(typeof promptEnvConfig).toBe("function");
    expect(typeof promptScopeAndAgents).toBe("function");
    expect(typeof promptScope).toBe("function");
    expect(typeof parseEnvText).toBe("function");
    expect(typeof groupInstalledServersByName).toBe("function");
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
});
