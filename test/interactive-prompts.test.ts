import { describe, expect, it } from "vitest";

import { parseEnvText } from "../src/interactive/prompts/env.ts";

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
