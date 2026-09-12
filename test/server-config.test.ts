import { describe, expect, it } from "vitest";
import {
  applyServerConfigDelta,
  buildMcpServerConfig,
  detectUpdateTransition,
  isRemoteServerConfig,
  isStdioServerConfig,
  parseServerConfig,
  sanitizeUpdatedServerConfig,
  toRemoteServerConfig,
  toStdioServerConfig,
} from "../src/server-config.ts";

describe("server-config domain module", () => {
  describe("applyServerConfigDelta", () => {
    it("throws error when both url and command are specified", () => {
      expect(() =>
        applyServerConfigDelta(
          { command: "node" },
          { url: "https://example.com", command: "python" },
        ),
      ).toThrow('Cannot specify both "--url" (remote) and "--command" (stdio) simultaneously.');
    });

    it("applies stdio modifications and merges env in-place", () => {
      const base = {
        command: "node",
        args: ["index.js"],
        env: { FOO: "bar", KEEP: "me" },
      };

      const result = applyServerConfigDelta(base, {
        args: ["new.js"],
        env: { FOO: "updated", NEW: "val" },
      });

      expect(result.protocol).toBe("stdio");
      expect(result.transition).toBe("merge-stdio");
      expect(result.ignoredFlags).toEqual([]);
      expect(result.config).toEqual({
        command: "node",
        args: ["new.js"],
        env: { FOO: "updated", KEEP: "me", NEW: "val" },
      });
    });

    it("clears env and args when clear flags are set", () => {
      const base = {
        command: "node",
        args: ["index.js"],
        env: { FOO: "bar" },
      };

      const result = applyServerConfigDelta(base, {
        clearArgs: true,
        clearEnv: true,
      });

      expect(result.config.args).toBeUndefined();
      expect(result.config.env).toBeUndefined();
      expect(result.config.command).toBe("node");
    });

    it("switches from stdio to remote and flags ignored stdio options", () => {
      const base = {
        command: "node",
        args: ["index.js"],
        env: { FOO: "bar" },
      };

      const result = applyServerConfigDelta(base, {
        url: "https://example.com/sse",
        transport: "sse",
        args: ["ignored-arg"],
        env: { IGNORED: "true" },
      });

      expect(result.protocol).toBe("remote");
      expect(result.transition).toBe("switch-to-remote");
      expect(result.ignoredFlags).toContain("--args");
      expect(result.ignoredFlags).toContain("--env");
      expect(result.config).toEqual({
        type: "sse",
        url: "https://example.com/sse",
      });
    });

    it("switches from remote to stdio and flags ignored remote options", () => {
      const base = {
        type: "http" as const,
        url: "https://example.com/api",
        headers: { Authorization: "Bearer 123" },
      };

      const result = applyServerConfigDelta(base, {
        command: "python",
        headers: { "X-Ignored": "val" },
        transport: "sse",
      });

      expect(result.protocol).toBe("stdio");
      expect(result.transition).toBe("switch-to-stdio");
      expect(result.ignoredFlags).toContain("--header");
      expect(result.ignoredFlags).toContain("--transport");
      expect(result.config).toEqual({
        command: "python",
      });
    });

    it("merges remote headers in-place", () => {
      const base = {
        type: "http" as const,
        url: "https://example.com/api",
        headers: { Authorization: "Bearer 123", Old: "Header" },
      };

      const result = applyServerConfigDelta(base, {
        headers: { Authorization: "Bearer 456", New: "Header" },
      });

      expect(result.protocol).toBe("remote");
      expect(result.config.headers).toEqual({
        Authorization: "Bearer 456",
        Old: "Header",
        New: "Header",
      });
    });
  });

  describe("type guards and converters", () => {
    it("identifies remote configs", () => {
      expect(isRemoteServerConfig({ url: "https://api.com" })).toBe(true);
      expect(isRemoteServerConfig({ command: "node" })).toBe(false);
    });

    it("identifies stdio configs", () => {
      expect(isStdioServerConfig({ command: "node" })).toBe(true);
      expect(isStdioServerConfig({ url: "https://api.com" })).toBe(false);
    });
  });
});
