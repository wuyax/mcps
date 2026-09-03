import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import TOML from "@iarna/toml";
import { parse as parseJsonc } from "jsonc-parser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { removeServerFromConfigFile } from "../src/formats/index.ts";

describe("removeServerFromConfigFile: JSONC", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "agent-install-formats-remove-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("removes a server key and preserves siblings", () => {
    const filePath = join(tempDir, "mcp.json");
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          mcpServers: {
            neon: { url: "https://mcp.neon.tech/mcp" },
            github: { command: "npx", args: ["-y", "mcp-server-github"] },
          },
        },
        null,
        2,
      ),
    );

    const removed = removeServerFromConfigFile(filePath, "jsonc", "mcpServers", "neon");
    expect(removed).toBe(true);

    const parsed = parseJsonc(readFileSync(filePath, "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(parsed.mcpServers.neon).toBeUndefined();
    expect(parsed.mcpServers.github).toMatchObject({ command: "npx" });
  });

  it("removing the last server leaves an empty servers object", () => {
    const filePath = join(tempDir, "mcp.json");
    writeFileSync(filePath, JSON.stringify({ mcpServers: { neon: { url: "x" } } }, null, 2));

    expect(removeServerFromConfigFile(filePath, "jsonc", "mcpServers", "neon")).toBe(true);
    const parsed = parseJsonc(readFileSync(filePath, "utf-8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(parsed.mcpServers).toEqual({});
  });

  it("preserves comments in JSONC files", () => {
    const filePath = join(tempDir, "mcp.json");
    const initial = `{
  // This is a comment
  "mcpServers": {
    "neon": { "url": "https://mcp.neon.tech/mcp" },
    "github": { "url": "https://github.com/mcp" }
  }
}`;
    writeFileSync(filePath, initial, "utf-8");

    expect(removeServerFromConfigFile(filePath, "jsonc", "mcpServers", "neon")).toBe(true);

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("// This is a comment");
    const parsed = parseJsonc(content) as { mcpServers: Record<string, unknown> };
    expect(parsed.mcpServers.neon).toBeUndefined();
    expect(parsed.mcpServers.github).toBeDefined();
  });

  it("is a no-op on a nonexistent file", () => {
    expect(
      removeServerFromConfigFile(join(tempDir, "missing.json"), "jsonc", "mcpServers", "neon"),
    ).toBe(false);
  });

  it("is a no-op when the server name is not present", () => {
    const filePath = join(tempDir, "mcp.json");
    writeFileSync(filePath, JSON.stringify({ mcpServers: { github: { url: "x" } } }, null, 2));

    expect(removeServerFromConfigFile(filePath, "jsonc", "mcpServers", "neon")).toBe(false);
    expect(JSON.parse(readFileSync(filePath, "utf-8"))).toEqual({
      mcpServers: { github: { url: "x" } },
    });
  });

  it("handles a whitespace-only file without throwing", () => {
    const filePath = join(tempDir, "mcp.json");
    writeFileSync(filePath, "   \n", "utf-8");
    expect(removeServerFromConfigFile(filePath, "jsonc", "mcpServers", "neon")).toBe(false);
  });
});

describe("removeServerFromConfigFile: YAML", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "agent-install-formats-remove-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("removes a nested server", () => {
    const filePath = join(tempDir, "config.yaml");
    writeFileSync(
      filePath,
      stringifyYaml({
        extensions: {
          neon: {
            name: "neon",
            type: "streamable_http",
            uri: "https://mcp.neon.tech/mcp",
          },
          github: { name: "github", type: "stdio", cmd: "npx" },
        },
      }),
    );

    expect(removeServerFromConfigFile(filePath, "yaml", "extensions", "neon")).toBe(true);
    const parsed = parseYaml(readFileSync(filePath, "utf-8")) as {
      extensions: Record<string, unknown>;
    };
    expect(parsed.extensions.neon).toBeUndefined();
    expect(parsed.extensions.github).toBeDefined();
  });

  it("is a no-op on a nonexistent file", () => {
    expect(
      removeServerFromConfigFile(join(tempDir, "missing.yaml"), "yaml", "extensions", "neon"),
    ).toBe(false);
  });
});

describe("removeServerFromConfigFile: TOML", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "agent-install-formats-remove-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("removes a nested server", () => {
    const filePath = join(tempDir, "config.toml");
    writeFileSync(
      filePath,
      TOML.stringify({
        mcp_servers: {
          neon: { type: "http", url: "https://mcp.neon.tech/mcp" },
          github: { command: "npx", args: ["-y", "mcp-server-github"] },
        },
      }),
    );

    expect(removeServerFromConfigFile(filePath, "toml", "mcp_servers", "neon")).toBe(true);
    const parsed = TOML.parse(readFileSync(filePath, "utf-8")) as {
      mcp_servers: Record<string, unknown>;
    };
    expect(parsed.mcp_servers.neon).toBeUndefined();
    expect(parsed.mcp_servers.github).toBeDefined();
  });

  it("is a no-op on a nonexistent file", () => {
    expect(
      removeServerFromConfigFile(join(tempDir, "missing.toml"), "toml", "mcp_servers", "neon"),
    ).toBe(false);
  });
});
