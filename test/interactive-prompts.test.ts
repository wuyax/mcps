import { describe, expect, it } from "vitest";

import { parseEnvText } from "../src/interactive/prompts/env.ts";
import { buildLinkedAgentChoices } from "../src/interactive/utils/build-linked-agent-choices.ts";

describe("parseEnvText", () => {
  it("should parse standard KEY=VALUE pairs", () => {
    const raw = `
      FOO=bar
      HELLO=world
    `;
    expect(parseEnvText(raw)).toEqual({
      FOO: "bar",
      HELLO: "world",
    });
  });

  it("should ignore empty lines and comment lines", () => {
    const raw = `
      # Database connection
      DB_HOST=localhost
      # DB_PORT=5432

      DB_USER=postgres
    `;
    expect(parseEnvText(raw)).toEqual({
      DB_HOST: "localhost",
      DB_USER: "postgres",
    });
  });

  it("should handle export prefix", () => {
    const raw = `
      export GITHUB_TOKEN=ghp_secret123
      export API_URL=https://api.github.com
    `;
    expect(parseEnvText(raw)).toEqual({
      GITHUB_TOKEN: "ghp_secret123",
      API_URL: "https://api.github.com",
    });
  });

  it("should strip surrounding quotes", () => {
    const raw = `
      DOUBLE_QUOTED="hello world"
      SINGLE_QUOTED='single world'
      PLAIN=regular
    `;
    expect(parseEnvText(raw)).toEqual({
      DOUBLE_QUOTED: "hello world",
      SINGLE_QUOTED: "single world",
      PLAIN: "regular",
    });
  });

  it("should preserve equal signs in values", () => {
    const raw = `
      TOKEN=secret=abc=123==
      URL=https://example.com?foo=bar&baz=qux
    `;
    expect(parseEnvText(raw)).toEqual({
      TOKEN: "secret=abc=123==",
      URL: "https://example.com?foo=bar&baz=qux",
    });
  });

  it("should return empty object for invalid or empty text", () => {
    expect(parseEnvText("")).toEqual({});
    expect(parseEnvText("# only comments\n# here")).toEqual({});
    expect(parseEnvText("invalid line without equals")).toEqual({});
  });
});

import { parseArgsString } from "../src/interactive/prompts/args.ts";

describe("parseArgsString", () => {
  it("should parse whitespace-separated arguments", () => {
    expect(parseArgsString("arg1 arg2 arg3")).toEqual(["arg1", "arg2", "arg3"]);
  });

  it("should handle arguments with spaces inside single or double quotes", () => {
    expect(
      parseArgsString('--path "/Users/John Doe/My Documents" --flag \'single value\' regular'),
    ).toEqual([
      "--path",
      "/Users/John Doe/My Documents",
      "--flag",
      "single value",
      "regular",
    ]);
  });

  it("should handle empty or whitespace string", () => {
    expect(parseArgsString("")).toEqual([]);
    expect(parseArgsString("   ")).toEqual([]);
  });
});

import { parseHeadersText } from "../src/interactive/prompts/headers.ts";

describe("parseHeadersText", () => {
  it("should parse standard Key: Value header format", () => {
    const raw = `
      Authorization: Bearer token123
      X-Custom-Header: custom-value
    `;
    expect(parseHeadersText(raw)).toEqual({
      Authorization: "Bearer token123",
      "X-Custom-Header": "custom-value",
    });
  });

  it("should handle quotes and comments in headers", () => {
    const raw = `
      # Auth settings
      Authorization: "Bearer secret"
      # Cookie: session=1
      X-API-KEY: 'api-key-999'
    `;
    expect(parseHeadersText(raw)).toEqual({
      Authorization: "Bearer secret",
      "X-API-KEY": "api-key-999",
    });
  });

  it("should return empty object for invalid or empty text", () => {
    expect(parseHeadersText("")).toEqual({});
    expect(parseHeadersText("no delimiter here")).toEqual({});
  });
});

import { formatEnvText, maskSecretValue } from "../src/interactive/prompts/env.ts";

describe("formatEnvText and maskSecretValue", () => {
  it("should format key-value pairs to valid .env text", () => {
    const env = {
      DB_HOST: "localhost",
      API_TOKEN: "my-secret-token",
      QUERY: "SELECT * FROM users",
    };
    const formatted = formatEnvText(env);
    expect(formatted).toContain("DB_HOST=localhost");
    expect(formatted).toContain("API_TOKEN=my-secret-token");
    expect(formatted).toContain('QUERY="SELECT * FROM users"');

    // Round-trip parse test
    const reparsed = parseEnvText(formatted);
    expect(reparsed).toEqual(env);
  });

  it("should mask secrets while preserving normal values", () => {
    expect(maskSecretValue("GITHUB_TOKEN", "ghp_abcdef123456")).toBe("gh***56");
    expect(maskSecretValue("DB_PASSWORD", "supersecret123")).toBe("su***23");
    expect(maskSecretValue("API_KEY", "short")).toBe("sh***rt");
    expect(maskSecretValue("PORT", "5432")).toBe("5432");
    expect(maskSecretValue("PUBLIC_NAME", "my-app")).toBe("my-app");
  });
});

import { formatArgsString } from "../src/interactive/prompts/args.ts";

describe("formatArgsString", () => {
  it("should format arguments into a space-separated CLI string with quotes when needed", () => {
    const args = ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/my db"];
    const formatted = formatArgsString(args);
    expect(formatted).toBe('-y @modelcontextprotocol/server-postgres "postgresql://localhost:5432/my db"');

    // Round-trip parse test
    const reparsed = parseArgsString(formatted);
    expect(reparsed).toEqual(args);
  });
});

import { formatHeadersText, maskSecretHeader } from "../src/interactive/prompts/headers.ts";

describe("formatHeadersText and maskSecretHeader", () => {
  it("should format headers into Key: Value lines", () => {
    const headers = {
      Authorization: "Bearer token123",
      "Content-Type": "application/json",
    };
    const formatted = formatHeadersText(headers);
    expect(formatted).toContain("Authorization: Bearer token123");
    expect(formatted).toContain("Content-Type: application/json");

    // Round-trip parse test
    const reparsed = parseHeadersText(formatted);
    expect(reparsed).toEqual(headers);
  });

  it("should mask secret headers properly", () => {
    expect(maskSecretHeader("Authorization", "Bearer secret-token-xyz")).toBe("Bear***xyz");
    expect(maskSecretHeader("X-API-Key", "my-long-api-key-value")).toBe("my-l***lue");
    expect(maskSecretHeader("Content-Type", "application/json")).toBe("application/json");
  });
});

import { parseKeyValueList } from "../src/utils/parse-key-value-list.ts";

describe("parseKeyValueList", () => {
  it("should parse = separated key-value pairs", () => {
    const list = ["FOO=bar", "KEY=val=with=equals", "EMPTY="];
    expect(parseKeyValueList(list, "=")).toEqual({
      FOO: "bar",
      KEY: "val=with=equals",
      EMPTY: "",
    });
  });

  it("should parse : separated key-value pairs", () => {
    const list = ["Authorization: Bearer token", "X-Custom: val:123"];
    expect(parseKeyValueList(list, ":")).toEqual({
      Authorization: "Bearer token",
      "X-Custom": "val:123",
    });
  });

  it("should throw on invalid format or empty key", () => {
    expect(() => parseKeyValueList(["invalid_no_sep"], "=")).toThrow();
    expect(() => parseKeyValueList(["=noval"], "=")).toThrow();
  });

  it("should return empty object for undefined or empty list", () => {
    expect(parseKeyValueList(undefined, "=")).toEqual({});
    expect(parseKeyValueList([], "=")).toEqual({});
  });
});

describe("buildLinkedAgentChoices", () => {
  it("builds choices with linkedValues and shared description for co-hosted agents", () => {
    const choices = buildLinkedAgentChoices({
      agents: ["antigravity", "antigravity-cli", "cursor"],
      checkedAgents: ["antigravity"],
      detectedAgents: ["antigravity"],
      scopeOptions: { global: true },
    });

    expect(choices).toHaveLength(3);

    const agyChoice = choices.find((c) => c.value === "antigravity");
    const cliChoice = choices.find((c) => c.value === "antigravity-cli");
    const cursorChoice = choices.find((c) => c.value === "cursor");

    expect(agyChoice?.checked).toBe(true);
    expect(agyChoice?.linkedValues).toContain("antigravity-cli");
    expect(agyChoice?.name).toContain("[detected]");
    expect(agyChoice?.name).toContain("[shared: antigravity-cli]");
    expect(agyChoice?.description).toContain("Antigravity CLI");

    expect(cliChoice?.checked).toBe(false);
    expect(cliChoice?.linkedValues).toContain("antigravity");
    expect(cliChoice?.name).toContain("[shared: antigravity]");

    expect(cursorChoice?.checked).toBe(false);
    expect(cursorChoice?.linkedValues).toEqual([]);
    expect(cursorChoice?.description).toBeUndefined();
  });
});


