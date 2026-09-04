import { describe, expect, it } from "vitest";

import {
  transformServerConfig,
  transformServerConfigForAgent,
} from "../src/transforms/index.ts";
import type { McpAgentConfig, McpServerConfig } from "../src/types.ts";

describe("Server Config Transform deep module", () => {
  const remoteHttp: McpServerConfig = {
    type: "http",
    url: "https://mcp.example.com/mcp",
    headers: { Authorization: "Bearer token" },
  };

  const remoteSse: McpServerConfig = {
    type: "sse",
    url: "https://mcp.example.com/sse",
  };

  const stdioWithEnv: McpServerConfig = {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    env: { DB_URL: "postgres://localhost" },
  };

  const stdioNoEnv: McpServerConfig = {
    command: "python3",
    args: ["-m", "server"],
  };

  it("throws error for unknown dialect name", () => {
    expect(() =>
      transformServerConfig(
        "srv",
        stdioNoEnv,
        // @ts-expect-error testing invalid dialect runtime check
        "non-existent-dialect",
      ),
    ).toThrow('Unknown server config dialect: "non-existent-dialect"');
  });

  describe("custom dialect options", () => {
    it("supports custom field aliases, wrapper, and extraFields", () => {
      const transformed = transformServerConfig("my-server", remoteHttp, {
        remoteTransport: "type-http-sse",
        urlField: "endpoint",
        wrapper: { namespace: "custom" },
        extraFields: { active: true },
        timeoutSeconds: 60,
      });

      expect(transformed).toEqual({
        namespace: "custom",
        active: true,
        type: "http",
        endpoint: remoteHttp.url,
        headers: remoteHttp.headers,
        timeout: 60,
      });
    });

    it("supports command array and environment alias for stdio", () => {
      const transformed = transformServerConfig("my-server", stdioWithEnv, {
        stdioTransport: "type-local",
        commandArray: true,
        commandField: "cmdList",
        envField: "environment",
        extraFields: { enabled: true },
      });

      expect(transformed).toEqual({
        type: "local",
        cmdList: ["npx", "-y", "@modelcontextprotocol/server-postgres"],
        environment: { DB_URL: "postgres://localhost" },
        enabled: true,
      });
    });

    it("defaults env and headers to empty objects when configured", () => {
      const remote = transformServerConfig("srv", remoteSse, {
        remoteTransport: "none",
        defaultHeadersEmpty: true,
      });
      expect(remote).toEqual({
        url: remoteSse.url,
        headers: {},
      });

      const stdio = transformServerConfig("srv", stdioNoEnv, {
        stdioTransport: "none",
        defaultEnvEmpty: true,
      });
      expect(stdio).toEqual({
        command: stdioNoEnv.command,
        args: stdioNoEnv.args,
        env: {},
      });
    });
  });

  describe("transformServerConfigForAgent", () => {
    it("uses transformConfig when defined on agent", () => {
      const agent: McpAgentConfig = {
        name: "cursor",
        displayName: "Cursor",
        globalConfigPath: "/path",
        configKey: "mcpServers",
        format: "jsonc",
        supportedTransports: ["stdio"],
        detectGlobalInstall: () => true,
        transformConfig: (name, cfg) => ({ custom: true, name, cfg }),
      };

      expect(transformServerConfigForAgent(agent, "test", stdioNoEnv)).toEqual({
        custom: true,
        name: "test",
        cfg: stdioNoEnv,
      });
    });

    it("falls back to transformDialect when transformConfig is not defined", () => {
      const agent: McpAgentConfig = {
        name: "cursor",
        displayName: "Cursor",
        globalConfigPath: "/path",
        configKey: "mcpServers",
        format: "jsonc",
        supportedTransports: ["stdio"],
        detectGlobalInstall: () => true,
        transformDialect: "vscode",
      };

      expect(transformServerConfigForAgent(agent, "test", stdioNoEnv)).toEqual({
        type: "stdio",
        command: stdioNoEnv.command,
        args: stdioNoEnv.args,
      });
    });

    it("returns raw serverConfig when neither transformConfig nor transformDialect is defined", () => {
      const agent: McpAgentConfig = {
        name: "cursor",
        displayName: "Cursor",
        globalConfigPath: "/path",
        configKey: "mcpServers",
        format: "jsonc",
        supportedTransports: ["stdio"],
        detectGlobalInstall: () => true,
      };

      expect(transformServerConfigForAgent(agent, "test", stdioNoEnv)).toEqual(stdioNoEnv);
    });
  });
});
