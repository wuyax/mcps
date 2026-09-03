import { describe, expect, it } from "vitest";

import { extractPackageName, parseMcpSource } from "../src/source-parser.ts";

describe("parseMcpSource: validation", () => {
  it("rejects empty input", () => {
    expect(() => parseMcpSource("")).toThrow(/empty/);
    expect(() => parseMcpSource("   ")).toThrow(/empty/);
  });
});

describe("parseMcpSource: remote URLs", () => {
  it("extracts the service brand from generic subdomains", () => {
    expect(parseMcpSource("https://mcp.example.com/api").inferredName).toBe("example");
    expect(parseMcpSource("https://api.company.com/mcp/v1").inferredName).toBe("company");
    expect(parseMcpSource("https://mcp.sentry.io/api").inferredName).toBe("sentry");
    expect(parseMcpSource("https://mcp.neon.tech/mcp").inferredName).toBe("neon");
    expect(parseMcpSource("https://app.vercel.com/mcp").inferredName).toBe("vercel");
  });

  it("handles apex-domain URLs", () => {
    expect(parseMcpSource("https://workos.com/mcp").inferredName).toBe("workos");
    expect(parseMcpSource("https://github.com/mcp").inferredName).toBe("github");
  });

  it("handles single-label hostnames", () => {
    expect(parseMcpSource("http://localhost:3000/mcp").inferredName).toBe("localhost");
  });

  it("preserves the URL value verbatim and reports type: remote", () => {
    const result = parseMcpSource("  https://mcp.example.com/mcp  ");
    expect(result).toMatchObject({
      type: "remote",
      value: "https://mcp.example.com/mcp",
    });
  });
});

describe("parseMcpSource: packages", () => {
  it("recognises simple kebab-case packages", () => {
    expect(parseMcpSource("mcp-server-postgres")).toMatchObject({
      type: "package",
      value: "mcp-server-postgres",
      inferredName: "postgres",
    });
  });

  it("strips mcp-server- / server- prefixes and -mcp-server / -mcp suffixes", () => {
    expect(parseMcpSource("server-filesystem").inferredName).toBe("filesystem");
    expect(parseMcpSource("github-mcp").inferredName).toBe("github");
    expect(parseMcpSource("foo-mcp-server").inferredName).toBe("foo");
  });

  it("recognises scoped packages", () => {
    expect(parseMcpSource("@modelcontextprotocol/server-postgres")).toMatchObject({
      type: "package",
      inferredName: "postgres",
    });
    expect(parseMcpSource("@scope/plain").inferredName).toBe("plain");
  });

  it("strips @version suffix from bare and scoped packages", () => {
    expect(parseMcpSource("mcp-server-github@1.0.0").inferredName).toBe("github");
    expect(parseMcpSource("@org/mcp-server@2.0.0").inferredName).toBe("mcp-server");
    expect(parseMcpSource("@scope/pkg@3.4.5")).toMatchObject({
      type: "package",
      inferredName: "pkg",
    });
  });

  it("rejects uppercase in npm package names", () => {
    expect(parseMcpSource("Express").type).not.toBe("package");
  });
});

describe("parseMcpSource: commands", () => {
  it("skips single-package runners (npx, node, python, bunx, uvx, deno) and extracts the next argument", () => {
    expect(parseMcpSource("npx -y @modelcontextprotocol/server-postgres")).toMatchObject({
      type: "command",
      inferredName: "postgres",
    });
    expect(parseMcpSource("npx -y mcp-server-github --token abc123").inferredName).toBe("github");
    expect(parseMcpSource("bunx @scope/server-foo").inferredName).toBe("foo");
    expect(parseMcpSource("uvx mcp-server-python").inferredName).toBe("python");
    expect(parseMcpSource("python -m mcp_server").inferredName).toBe("mcp_server");
  });

  it("falls back to script-like path tokens when no runner matches", () => {
    expect(parseMcpSource("node /path/to/server.js --port 3000").inferredName).toBe("server");
    expect(parseMcpSource("python /opt/mcp/weather.py").inferredName).toBe("weather");
    expect(parseMcpSource("/usr/local/bin/my-server --flag value").inferredName).toBe("my-server");
  });

  it("preserves the original command value verbatim", () => {
    const input = "npx -y @scope/foo --flag";
    expect(parseMcpSource(input).value).toBe(input);
  });
});

describe("extractPackageName", () => {
  it("handles bare names, scoped packages, and paths", () => {
    expect(extractPackageName("mcp-server-github")).toBe("github");
    expect(extractPackageName("@modelcontextprotocol/server-postgres")).toBe("postgres");
    expect(extractPackageName("/opt/bin/my-server")).toBe("my-server");
    expect(extractPackageName("./weather.py")).toBe("weather");
  });

  it("handles version suffixes", () => {
    expect(extractPackageName("@org/pkg@1.2.3")).toBe("pkg");
    expect(extractPackageName("pkg@latest")).toBe("pkg");
  });

  it("returns the fallback name when everything is stripped", () => {
    expect(extractPackageName("server-")).toBe("mcp-server");
    expect(extractPackageName("mcp-server-")).toBe("mcp-server");
  });
});
