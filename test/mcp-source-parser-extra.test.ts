import { describe, expect, it } from "vitest";

import { parseMcpSource } from "../src/source-parser.ts";

describe("parseMcpSource: remote URL edge cases", () => {
  it("handles URLs with non-standard ports", () => {
    expect(parseMcpSource("http://localhost:8765/mcp").inferredName).toBe("localhost");
    expect(parseMcpSource("https://mcp.example.com:4443/mcp").inferredName).toBe("example");
  });

  it("preserves the path and query on remote URLs", () => {
    const result = parseMcpSource("https://mcp.example.com/v1/api?token=xyz");
    expect(result.value).toBe("https://mcp.example.com/v1/api?token=xyz");
    expect(result.type).toBe("remote");
  });

  it("extracts the meaningful label even when two generic prefixes are stacked", () => {
    expect(parseMcpSource("https://api.mcp.acme.io/mcp").inferredName).toBe("acme");
  });

  it("falls back to the second-to-last label when every label is a generic prefix", () => {
    expect(parseMcpSource("https://mcp.api/mcp").inferredName).toBe("mcp");
  });

  it("treats non-HTTP URLs as commands", () => {
    const result = parseMcpSource("ftp://example.com/server");
    expect(result.type).not.toBe("remote");
  });
});

describe("parseMcpSource: package edge cases", () => {
  it("strips multiple prefixes individually (first match wins)", () => {
    expect(parseMcpSource("mcp-server-weather").inferredName).toBe("weather");
    expect(parseMcpSource("server-weather").inferredName).toBe("weather");
  });

  it("handles scoped packages with versions", () => {
    expect(parseMcpSource("@scope/foo@latest").inferredName).toBe("foo");
    expect(parseMcpSource("@scope/server-foo@1.2.3").inferredName).toBe("foo");
  });

  it("does not treat a version-only string as a package", () => {
    const result = parseMcpSource("@1.0.0");
    expect(result.type).toBe("command");
  });
});

describe("parseMcpSource: command edge cases", () => {
  it("handles commands whose runner is the last path segment of an absolute path", () => {
    const result = parseMcpSource("/usr/local/bin/npx -y mcp-server-github");
    expect(result.type).toBe("command");
    expect(result.inferredName).toBe("github");
  });

  it("preserves argv order in value", () => {
    const value = "node /opt/servers/weather.js --port 3000 --verbose";
    expect(parseMcpSource(value).value).toBe(value);
  });

  it("returns the fallback name when the command is only flags", () => {
    expect(parseMcpSource("--flag-a --flag-b").inferredName).toBe("mcp-server");
  });
});
