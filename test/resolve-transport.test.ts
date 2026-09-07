import { describe, expect, it } from "vitest";

import { resolveTransport } from "../src/utils/resolve-transport.ts";

describe("resolveTransport", () => {
  it("returns undefined when input is undefined or empty", () => {
    expect(resolveTransport(undefined)).toBeUndefined();
    expect(resolveTransport("")).toBeUndefined();
  });

  it("resolves valid transport protocols", () => {
    expect(resolveTransport("http")).toBe("http");
    expect(resolveTransport("sse")).toBe("sse");
  });

  it("throws descriptive error for invalid transport protocols", () => {
    expect(() => resolveTransport("websocket")).toThrowError(
      'Unsupported transport "websocket" (expected: http, sse)',
    );
    expect(() => resolveTransport("tcp")).toThrowError(
      'Unsupported transport "tcp" (expected: http, sse)',
    );
  });
});
