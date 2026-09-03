export const DEFAULT_REMOTE_TRANSPORT = "http" as const;
export const NPX_COMMAND = "npx";
export const NPX_DASH_Y = "-y";

export const GOOSE_TIMEOUT_SECONDS = 300;
export const DEFAULT_JSON_INDENT_SPACES = 2;

export const MCP_DEFAULT_SERVER_NAME = "mcp-server";

export const GENERIC_HOST_PREFIXES: ReadonlySet<string> = new Set([
  "mcp",
  "api",
  "app",
  "www",
  "server",
  "servers",
  "remote",
]);

export const COMMON_TLD_LABELS: ReadonlySet<string> = new Set([
  "com",
  "org",
  "net",
  "io",
  "dev",
  "ai",
  "tech",
  "co",
  "app",
  "cloud",
  "sh",
  "run",
]);

export const PACKAGE_NAME_PREFIX_STRIP: readonly string[] = ["mcp-server-", "server-"];
export const PACKAGE_NAME_SUFFIX_STRIP: readonly string[] = ["-mcp-server", "-mcp"];

export const KNOWN_COMMAND_RUNNERS: ReadonlySet<string> = new Set([
  "npx",
  "node",
  "python",
  "python3",
  "uvx",
  "bunx",
  "deno",
]);

export const SCRIPT_EXTENSION_REGEX = /\.(?:js|ts|mjs|cjs|py|sh|rb|go)$/i;
