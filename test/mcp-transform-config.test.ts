import { describe, expect, it } from "vitest";

import { mcpAgents } from "../src/agents.ts";
import type { McpServerConfig } from "../src/types.ts";

const remote: McpServerConfig = {
  type: "http",
  url: "https://mcp.example.com/mcp",
  headers: { Authorization: "Bearer x" },
};

const stdio: McpServerConfig = {
  command: "npx",
  args: ["-y", "@scope/server"],
  env: { KEY: "value" },
};

describe("transformConfig: goose", () => {
  const transform = mcpAgents.goose.transformConfig!;

  it("maps remote to streamable_http with timeout", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      name: "foo",
      description: "",
      type: "streamable_http",
      uri: remote.url,
      headers: remote.headers,
      enabled: true,
      timeout: 300,
    });
  });

  it("maps stdio to goose's cmd/envs shape", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      name: "foo",
      description: "",
      cmd: stdio.command,
      args: stdio.args,
      enabled: true,
      envs: stdio.env,
      type: "stdio",
      timeout: 300,
    });
  });
});

describe("transformConfig: zed", () => {
  const transform = mcpAgents.zed.transformConfig!;

  it("emits source=custom for remote", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      source: "custom",
      type: "http",
      url: remote.url,
      headers: remote.headers,
    });
  });

  it("emits source=custom for stdio", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      source: "custom",
      command: stdio.command,
      args: stdio.args,
      env: stdio.env,
    });
  });
});

describe("transformConfig: opencode", () => {
  const transform = mcpAgents.opencode.transformConfig!;

  it("maps remote to type=remote", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      type: "remote",
      url: remote.url,
      enabled: true,
      headers: remote.headers,
    });
  });

  it("maps stdio to type=local with command array", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      type: "local",
      command: [stdio.command, ...(stdio.args ?? [])],
      enabled: true,
      environment: stdio.env,
    });
  });
});

describe("transformConfig: codex", () => {
  const transform = mcpAgents.codex.transformConfig!;

  it("emits stdio shape with optional env", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
      env: stdio.env,
    });
    const { env: _env, ...stdioNoEnv } = stdio;
    expect(transform("foo", stdioNoEnv, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
    });
  });

  it("emits remote shape with optional headers", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      type: "http",
      url: remote.url,
      headers: remote.headers,
    });
    expect(transform("foo", { type: "sse", url: remote.url }, { global: true })).toEqual({
      type: "sse",
      url: remote.url,
    });
  });
});

describe("transformConfig: pi", () => {
  const transform = mcpAgents.pi.transformConfig!;

  it("maps remote http to streamable-http and includes headers", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      transport: "streamable-http",
      url: remote.url,
      headers: remote.headers,
    });
  });

  it("maps remote sse to sse transport", () => {
    expect(transform("foo", { type: "sse", url: remote.url }, { global: true })).toEqual({
      transport: "sse",
      url: remote.url,
    });
  });

  it("maps stdio to transport=stdio with command, args, and env", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
      transport: "stdio",
      env: stdio.env,
    });

    const { env: _env, ...stdioNoEnv } = stdio;
    expect(transform("foo", stdioNoEnv, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
      transport: "stdio",
    });
  });
});

describe("transformConfig: kimi-code-cli", () => {
  const transform = mcpAgents["kimi-code-cli"].transformConfig!;

  it("maps remote http to url and headers without transport", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      url: remote.url,
      headers: remote.headers,
    });
  });

  it("maps remote sse to transport=sse", () => {
    expect(transform("foo", { type: "sse", url: remote.url }, { global: true })).toEqual({
      transport: "sse",
      url: remote.url,
    });
  });

  it("maps stdio to command and args with optional env", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
      env: stdio.env,
    });

    const { env: _env, ...stdioNoEnv } = stdio;
    expect(transform("foo", stdioNoEnv, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
    });
  });
});

describe("transformConfig: qwen-code", () => {
  const transform = mcpAgents["qwen-code"].transformConfig!;

  it("maps remote http to httpUrl and headers", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      httpUrl: remote.url,
      headers: remote.headers,
    });
  });

  it("maps remote sse to url without transport and with optional headers", () => {
    expect(transform("foo", { type: "sse", url: remote.url }, { global: true })).toEqual({
      url: remote.url,
    });
    expect(
      transform(
        "foo",
        { type: "sse", url: remote.url, headers: remote.headers },
        { global: true },
      ),
    ).toEqual({
      url: remote.url,
      headers: remote.headers,
    });
  });

  it("maps stdio to command and args with optional env", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
      env: stdio.env,
    });

    const { env: _env, ...stdioNoEnv } = stdio;
    expect(transform("foo", stdioNoEnv, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
    });
  });
});

describe("transformConfig: kiro", () => {
  const transform = mcpAgents.kiro.transformConfig!;

  it("maps remote http to url with headers and without type", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      url: remote.url,
      headers: remote.headers,
    });
  });

  it("maps remote sse to url without type", () => {
    expect(transform("foo", { type: "sse", url: remote.url }, { global: true })).toEqual({
      url: remote.url,
    });
  });

  it("maps stdio to command and args with optional env", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
      env: stdio.env,
    });

    const { env: _env, ...stdioNoEnv } = stdio;
    expect(transform("foo", stdioNoEnv, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
    });
  });
});

describe("transformConfig: grok", () => {
  const transform = mcpAgents.grok.transformConfig!;

  it("maps remote http to url and headers without type", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      url: remote.url,
      headers: remote.headers,
    });
  });

  it("maps remote sse to type=sse and url", () => {
    expect(transform("foo", { type: "sse", url: remote.url }, { global: true })).toEqual({
      type: "sse",
      url: remote.url,
    });
  });

  it("maps stdio to command and args with optional env", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
      env: stdio.env,
    });

    const { env: _env, ...stdioNoEnv } = stdio;
    expect(transform("foo", stdioNoEnv, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
    });
  });
});

describe("transformConfig: trae", () => {
  const transform = mcpAgents.trae.transformConfig!;

  it("maps remote http to url and headers without type", () => {
    expect(transform("foo", remote, { global: true })).toEqual({
      url: remote.url,
      headers: remote.headers,
    });
  });

  it("maps remote sse to type=sse and url", () => {
    expect(transform("foo", { type: "sse", url: remote.url }, { global: true })).toEqual({
      type: "sse",
      url: remote.url,
    });
  });

  it("maps stdio to command and args with optional env", () => {
    expect(transform("foo", stdio, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
      env: stdio.env,
    });

    const { env: _env, ...stdioNoEnv } = stdio;
    expect(transform("foo", stdioNoEnv, { global: true })).toEqual({
      command: stdio.command,
      args: stdio.args,
    });
  });
});




