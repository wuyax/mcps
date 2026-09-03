import { describe, expect, it } from "vitest";

import {
  isRemoteServerConfig,
  isStdioServerConfig,
  parseServerConfig,
} from "../src/index.ts";

describe("parseServerConfig & type guards", () => {
  it("should correctly parse and detect a remote SSE server", () => {
    const raw = {
      type: "sse",
      url: "https://example.com/sse",
      headers: {
        Authorization: "Bearer token123",
      },
    };

    const parsed = parseServerConfig(raw);
    expect(isRemoteServerConfig(parsed)).toBe(true);
    expect(isStdioServerConfig(parsed)).toBe(false);
    expect(parsed).toEqual({
      type: "sse",
      url: "https://example.com/sse",
      headers: { Authorization: "Bearer token123" },
    });
  });

  it("should correctly parse and detect a stdio command server", () => {
    const raw = {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/db"],
      env: {
        DEBUG: "true",
      },
    };

    const parsed = parseServerConfig(raw);
    expect(isStdioServerConfig(parsed)).toBe(true);
    expect(isRemoteServerConfig(parsed)).toBe(false);
    expect(parsed.command).toBe("npx");
    expect(parsed.args).toEqual([
      "-y",
      "@modelcontextprotocol/server-postgres",
      "postgresql://localhost/db",
    ]);
    expect(parsed.env).toEqual({ DEBUG: "true" });
  });

  it("should handle null or invalid input gracefully", () => {
    expect(parseServerConfig(null)).toEqual({});
    expect(parseServerConfig("invalid string")).toEqual({});
    expect(parseServerConfig({})).toEqual({});
    expect(isRemoteServerConfig({})).toBe(false);
    expect(isStdioServerConfig({})).toBe(false);
  });
});
