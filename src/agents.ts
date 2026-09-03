import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

import { transformCodexServerConfig } from "./transforms/codex.ts";
import { transformGooseServerConfig } from "./transforms/goose.ts";
import { transformOpenCodeServerConfig } from "./transforms/opencode.ts";
import { transformVscodeServerConfig } from "./transforms/vscode.ts";
import { transformZedServerConfig } from "./transforms/zed.ts";
import type { McpAgentConfig, McpAgentType, McpTransportType } from "./types.ts";

const home = homedir();

interface PlatformPaths {
  appSupport: string;
  vscodePath: string;
  gooseConfigPath: string;
  zedConfigPath: string;
}

const getPlatformPaths = (): PlatformPaths => {
  const currentPlatform = platform();

  if (currentPlatform === "win32") {
    const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
    return {
      appSupport: appData,
      vscodePath: join(appData, "Code", "User"),
      gooseConfigPath: join(appData, "Block", "goose", "config", "config.yaml"),
      zedConfigPath: join(appData, "Zed", "settings.json"),
    };
  }

  if (currentPlatform === "darwin") {
    return {
      appSupport: join(home, "Library", "Application Support"),
      vscodePath: join(home, "Library", "Application Support", "Code", "User"),
      gooseConfigPath: join(home, ".config", "goose", "config.yaml"),
      zedConfigPath: join(home, ".config", "zed", "settings.json"),
    };
  }

  const configDir = process.env.XDG_CONFIG_HOME || join(home, ".config");
  return {
    appSupport: configDir,
    vscodePath: join(configDir, "Code", "User"),
    gooseConfigPath: join(configDir, "goose", "config.yaml"),
    zedConfigPath: join(configDir, "zed", "settings.json"),
  };
};

const { appSupport, vscodePath, gooseConfigPath, zedConfigPath } = getPlatformPaths();

const antigravityConfigPath = join(home, ".gemini", "antigravity", "mcp_config.json");
const antigravityCliConfigPath = join(home, ".gemini", "config", "mcp_config.json");
const clineCliConfigPath = join(
  process.env.CLINE_DIR || join(home, ".cline"),
  "data",
  "settings",
  "cline_mcp_settings.json",
);
const clineExtensionConfigPath = join(
  vscodePath,
  "globalStorage",
  "saoudrizwan.claude-dev",
  "settings",
  "cline_mcp_settings.json",
);
const copilotConfigPath = join(
  process.env.COPILOT_HOME?.trim() || join(home, ".copilot"),
  "mcp-config.json",
);

const ALL_TRANSPORTS: readonly McpTransportType[] = ["stdio", "http", "sse"];

export const mcpAgents: Record<McpAgentType, McpAgentConfig> = {
  antigravity: {
    name: "antigravity",
    displayName: "Antigravity",
    globalConfigPath: antigravityConfigPath,
    projectConfigPath: ".agents/mcp_config.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(antigravityConfigPath) || existsSync(join(home, ".gemini", "antigravity")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".agents", "mcp_config.json")) ||
      existsSync(join(cwd, ".agents")),
  },
  "antigravity-cli": {
    name: "antigravity-cli",
    displayName: "Antigravity CLI",
    globalConfigPath: antigravityCliConfigPath,
    projectConfigPath: ".agents/mcp_config.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(join(home, ".gemini", "antigravity-cli")) ||
      existsSync(antigravityCliConfigPath),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".agents", "mcp_config.json")) ||
      existsSync(join(cwd, ".agents")),
  },
  cline: {
    name: "cline",
    displayName: "Cline (VSCode extension)",
    globalConfigPath: clineExtensionConfigPath,
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(clineExtensionConfigPath),
  },
  "cline-cli": {
    name: "cline-cli",
    displayName: "Cline CLI",
    globalConfigPath: clineCliConfigPath,
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(join(home, ".cline")),
  },
  "claude-code": {
    name: "claude-code",
    displayName: "Claude Code",
    globalConfigPath: join(home, ".claude.json"),
    projectConfigPath: ".mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(join(home, ".claude.json")),
    detectProjectInstall: (cwd) => existsSync(join(cwd, ".mcp.json")),
  },
  "claude-desktop": {
    name: "claude-desktop",
    displayName: "Claude Desktop",
    globalConfigPath: join(appSupport, "Claude", "claude_desktop_config.json"),
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ["stdio"],
    unsupportedTransportMessage:
      "Claude Desktop currently supports only stdio MCP servers. Use a package name or command instead of a URL.",
    detectGlobalInstall: () => existsSync(join(appSupport, "Claude", "claude_desktop_config.json")),
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    globalConfigPath: join(process.env.CODEX_HOME?.trim() || join(home, ".codex"), "config.toml"),
    projectConfigPath: ".codex/config.toml",
    configKey: "mcp_servers",
    format: "toml",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(process.env.CODEX_HOME?.trim() || join(home, ".codex")),
    detectProjectInstall: (cwd) => existsSync(join(cwd, ".codex", "config.toml")),
    transformConfig: (_name, config) => transformCodexServerConfig(config),
  },
  cursor: {
    name: "cursor",
    displayName: "Cursor",
    globalConfigPath: join(home, ".cursor", "mcp.json"),
    projectConfigPath: ".cursor/mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(join(home, ".cursor")),
    detectProjectInstall: (cwd) => existsSync(join(cwd, ".cursor", "mcp.json")),
  },
  "gemini-cli": {
    name: "gemini-cli",
    displayName: "Gemini CLI",
    globalConfigPath: join(home, ".gemini", "settings.json"),
    projectConfigPath: ".gemini/settings.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(join(home, ".gemini")),
    detectProjectInstall: (cwd) => existsSync(join(cwd, ".gemini", "settings.json")),
  },
  goose: {
    name: "goose",
    displayName: "Goose",
    globalConfigPath: gooseConfigPath,
    projectConfigPath: ".goose/config.yaml",
    configKey: "extensions",
    format: "yaml",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(gooseConfigPath),
    detectProjectInstall: (cwd) => existsSync(join(cwd, ".goose", "config.yaml")),
    transformConfig: (name, config) => transformGooseServerConfig(name, config),
  },
  "github-copilot-cli": {
    name: "github-copilot-cli",
    displayName: "GitHub Copilot CLI",
    globalConfigPath: copilotConfigPath,
    projectConfigPath: ".mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(copilotConfigPath) ||
      existsSync(process.env.COPILOT_HOME?.trim() || join(home, ".copilot")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".mcp.json")) ||
      existsSync(join(cwd, ".github", "mcp.json")),
  },
  mcporter: {
    name: "mcporter",
    displayName: "MCPorter",
    globalConfigPath: join(home, ".mcporter", "mcporter.json"),
    projectConfigPath: "config/mcporter.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(join(home, ".mcporter")),
    detectProjectInstall: (cwd) => existsSync(join(cwd, "config", "mcporter.json")),
  },
  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    globalConfigPath: join(
      process.env.XDG_CONFIG_HOME || join(home, ".config"),
      "opencode",
      "opencode.json",
    ),
    projectConfigPath: "opencode.json",
    configKey: "mcp",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "opencode")),
    detectProjectInstall: (cwd) => existsSync(join(cwd, "opencode.json")),
    transformConfig: (_name, config) => transformOpenCodeServerConfig(config),
  },
  vscode: {
    name: "vscode",
    displayName: "VS Code",
    globalConfigPath: join(vscodePath, "mcp.json"),
    projectConfigPath: ".vscode/mcp.json",
    configKey: "servers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(join(vscodePath, "mcp.json")),
    detectProjectInstall: (cwd) => existsSync(join(cwd, ".vscode", "mcp.json")),
    transformConfig: (_name, config) => transformVscodeServerConfig(config),
  },
  zed: {
    name: "zed",
    displayName: "Zed",
    globalConfigPath: zedConfigPath,
    projectConfigPath: ".zed/settings.json",
    configKey: "context_servers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(zedConfigPath) ||
      existsSync(join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "zed")) ||
      existsSync(join(appSupport, "Zed")),
    detectProjectInstall: (cwd) => existsSync(join(cwd, ".zed", "settings.json")),
    transformConfig: (_name, config) => transformZedServerConfig(config),
  },
};

export const mcpAgentAliases: Record<string, McpAgentType> = {
  agy: "antigravity-cli",
  "cline-vscode": "cline",
  gemini: "gemini-cli",
  "github-copilot": "vscode",
};

export const getMcpAgentConfig = (agentType: McpAgentType): McpAgentConfig => mcpAgents[agentType];

export const getMcpAgentTypes = (): McpAgentType[] =>
  Object.values(mcpAgents).map((config) => config.name);

export const isMcpAgentType = (value: string): value is McpAgentType => value in mcpAgents;

export const resolveMcpAgentAlias = (input: string): McpAgentType | null => {
  if (isMcpAgentType(input)) return input;
  return mcpAgentAliases[input] ?? null;
};

export const isMcpTransportSupported = (
  agent: McpAgentConfig,
  transport: McpTransportType,
): boolean => agent.supportedTransports.includes(transport);

export const detectProjectInstalledMcpAgents = (cwd: string): McpAgentType[] =>
  getMcpAgentTypes().filter((type) =>
    mcpAgents[type].detectProjectInstall ? mcpAgents[type].detectProjectInstall!(cwd) : false,
  );

export const detectGloballyInstalledMcpAgents = (): McpAgentType[] =>
  getMcpAgentTypes().filter((type) => mcpAgents[type].detectGlobalInstall());

export const getMcpAgentsSupportingProjectScope = (): McpAgentType[] =>
  getMcpAgentTypes().filter((type) => Boolean(mcpAgents[type].projectConfigPath));
