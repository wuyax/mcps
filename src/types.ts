export type McpAgentType =
  | "amp"
  | "antigravity"
  | "antigravity-cli"
  | "augment"
  | "cline"
  | "cline-cli"
  | "claude-code"
  | "claude-desktop"
  | "codex"
  | "cursor"
  | "gemini-cli"
  | "grok"
  | "goose"
  | "github-copilot-cli"
  | "kimi-code-cli"
  | "kiro"
  | "opencode"
  | "pi"
  | "qoder"
  | "qwen-code"
  | "trae"
  | "vscode"
  | "zed";

export type McpConfigFormat = "json" | "jsonc" | "yaml" | "toml";

export type McpTransportType = "http" | "sse" | "stdio";

export type McpRemoteTransport = "http" | "sse";

export type McpSourceType = "remote" | "package" | "command";

export interface ParsedMcpSource {
  type: McpSourceType;
  value: string;
  inferredName: string;
}

export interface McpServerConfig {
  type?: McpRemoteTransport;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export type ServerConfigDialectName =
  | "vscode"
  | "augment"
  | "amp"
  | "trae"
  | "grok"
  | "cline"
  | "goose"
  | "kimi-code"
  | "kiro"
  | "opencode"
  | "pi"
  | "qwen-code"
  | "zed";

export interface ServerConfigDialectOptions {
  stdioTransport?: "none" | "type-stdio" | "transport-stdio" | "type-local";
  remoteTransport?:
    | "type-http-sse"
    | "sse-only-type"
    | "sse-only-transport"
    | "none"
    | "streamable-http"
    | "streamableHttp"
    | "streamable_http"
    | "remote-type"
    | "qwen";
  commandArray?: boolean;
  commandField?: string;
  argsField?: string;
  envField?: string;
  urlField?: string;
  defaultEnvEmpty?: boolean;
  defaultHeadersEmpty?: boolean;
  extraFields?: Record<string, unknown>;
  includeServerName?: boolean;
  timeoutSeconds?: number;
}

export type ServerConfigDialect = ServerConfigDialectName | ServerConfigDialectOptions;

export interface McpAgentConfig {
  name: McpAgentType;
  displayName: string;
  globalConfigPath: string;
  projectConfigPath?: string;
  configKey: string;
  projectConfigKey?: string;
  format: McpConfigFormat;
  supportedTransports: readonly McpTransportType[];
  unsupportedTransportMessage?: string;
  detectGlobalInstall: () => boolean;
  detectProjectInstall?: (cwd: string) => boolean;
  resolveConfigPath?: (options: { global: boolean; cwd: string }) => string;
  transformDialect?: ServerConfigDialect;
  transformConfig?: (
    serverName: string,
    config: McpServerConfig,
    context: { global: boolean },
  ) => unknown;
}

export interface McpScopeOptions {
  global?: boolean;
  cwd?: string;
}

export interface InstallMcpServerOptions extends McpScopeOptions {
  source: string;
  name?: string;
  agents?: McpAgentType[];
  args?: string[];
  transport?: McpRemoteTransport;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface McpInstallResultForAgent {
  agent: McpAgentType;
  success: boolean;
  path: string;
  coConfiguredAgents?: McpAgentType[];
  error?: string;
}

export interface InstallMcpServerResult {
  serverName: string;
  config: McpServerConfig;
  results: McpInstallResultForAgent[];
}

export interface ListedMcpServer {
  serverName: string;
  agent: McpAgentType;
  path: string;
  config: unknown;
  serverConfig?: McpServerConfig;
}

export interface GroupedInstalledServer {
  serverName: string;
  agents: McpAgentType[];
  paths: string[];
  config: McpServerConfig;
  hasDivergence?: boolean;
}

export interface RemoveMcpServerOptions extends McpScopeOptions {
  name: string;
  agents?: McpAgentType[];
}

export interface RemoveMcpServerResult {
  agent: McpAgentType;
  path: string;
  removed: boolean;
  coAffectedAgents?: McpAgentType[];
  error?: string;
}

export interface ConfigCluster {
  configPath: string;
  configKey: string;
  targetAgents: McpAgentType[];
  coHostedAgents: McpAgentType[];
}

export interface UpdateMcpServerOptions extends McpScopeOptions {
  serverName: string;
  config: McpServerConfig;
  previousConfig?: McpServerConfig;
  agents?: McpAgentType[];
}

export interface UpdateMcpServerResult {
  serverName: string;
  config: McpServerConfig;
  results: McpInstallResultForAgent[];
  incompatible: { agent: McpAgentType; reason: string }[];
}

export type UpdateTransitionType =
  | "switch-to-remote"
  | "switch-to-stdio"
  | "merge-remote"
  | "merge-stdio";

