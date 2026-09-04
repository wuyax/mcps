import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

import { transformAmpServerConfig } from "./transforms/amp.ts";
import { transformAugmentServerConfig } from "./transforms/augment.ts";
import { transformClineServerConfig } from "./transforms/cline.ts";
import { transformCodexServerConfig } from "./transforms/codex.ts";
import { transformGooseServerConfig } from "./transforms/goose.ts";
import { transformGrokServerConfig } from "./transforms/grok.ts";
import { transformKimiCodeServerConfig } from "./transforms/kimi-code.ts";
import { transformKiroServerConfig } from "./transforms/kiro.ts";
import { transformOpenCodeServerConfig } from "./transforms/opencode.ts";
import { transformPiServerConfig } from "./transforms/pi.ts";
import { transformQwenCodeServerConfig } from "./transforms/qwen-code.ts";
import { transformTraeServerConfig } from "./transforms/trae.ts";
import { transformVscodeServerConfig } from "./transforms/vscode.ts";
import { transformZedServerConfig } from "./transforms/zed.ts";
import type { McpAgentConfig, McpAgentType, McpTransportType } from "./types.ts";

const home = homedir();

interface PlatformPaths {
  appSupport: string;
  vscodePath: string;
  traePath: string;
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
      traePath: join(appData, "Trae", "User"),
      gooseConfigPath: join(appData, "Block", "goose", "config", "config.yaml"),
      zedConfigPath: join(appData, "Zed", "settings.json"),
    };
  }

  if (currentPlatform === "darwin") {
    return {
      appSupport: join(home, "Library", "Application Support"),
      vscodePath: join(home, "Library", "Application Support", "Code", "User"),
      traePath: join(home, "Library", "Application Support", "Trae", "User"),
      gooseConfigPath: join(home, ".config", "goose", "config.yaml"),
      zedConfigPath: join(home, ".config", "zed", "settings.json"),
    };
  }

  const configDir = process.env.XDG_CONFIG_HOME || join(home, ".config");
  return {
    appSupport: configDir,
    vscodePath: join(configDir, "Code", "User"),
    traePath: join(configDir, "Trae", "User"),
    gooseConfigPath: join(configDir, "goose", "config.yaml"),
    zedConfigPath: join(configDir, "zed", "settings.json"),
  };
};

const { appSupport, vscodePath, traePath, gooseConfigPath, zedConfigPath } = getPlatformPaths();

const ampConfigDir =
  process.env.AMP_HOME?.trim() ||
  join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "amp");
const ampGlobalConfigPath = existsSync(join(ampConfigDir, "settings.jsonc"))
  ? join(ampConfigDir, "settings.jsonc")
  : join(ampConfigDir, "settings.json");
const antigravityMcpConfigPath = join(home, ".gemini", "config", "mcp_config.json");
const augmentConfigDir =
  process.env.AUGMENT_HOME?.trim() || join(home, ".augment");
const augmentGlobalConfigPath = existsSync(join(augmentConfigDir, "settings.jsonc"))
  ? join(augmentConfigDir, "settings.jsonc")
  : join(augmentConfigDir, "settings.json");
const clineDir = process.env.CLINE_DIR || join(home, ".cline");
const clineCliConfigPath = existsSync(join(clineDir, "mcp.json"))
  ? join(clineDir, "mcp.json")
  : existsSync(join(clineDir, "data", "settings", "cline_mcp_settings.json"))
    ? join(clineDir, "data", "settings", "cline_mcp_settings.json")
    : join(clineDir, "mcp.json");
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
const grokConfigPath = join(
  process.env.GROK_HOME?.trim() || join(home, ".grok"),
  "config.toml",
);
const kimiCodeConfigPath = join(
  process.env.KIMI_CODE_HOME?.trim() || join(home, ".kimi-code"),
  "mcp.json",
);
const kiroConfigPath = join(
  process.env.KIRO_HOME?.trim() || join(home, ".kiro"),
  "settings",
  "mcp.json",
);
const qoderConfigPath = join(
  process.env.QODER_HOME?.trim() || join(home, ".qoder"),
  "settings.json",
);
const qwenCodeConfigPath = join(
  process.env.QWEN_CODE_HOME?.trim() ||
    process.env.QWEN_HOME?.trim() ||
    join(home, ".qwen"),
  "settings.json",
);
const traeConfigPath = existsSync(join(home, ".trae", "mcp.json"))
  ? join(home, ".trae", "mcp.json")
  : join(traePath, "mcp.json");

const ALL_TRANSPORTS: readonly McpTransportType[] = ["stdio", "http", "sse"];

export const mcpAgents: Record<McpAgentType, McpAgentConfig> = {
  // https://ampcode.com/docs/markdown/customize/mcp
  amp: {
    name: "amp",
    displayName: "Amp",
    globalConfigPath: ampGlobalConfigPath,
    projectConfigPath: ".amp/settings.json",
    configKey: "amp.mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(ampConfigDir) ||
      existsSync(join(home, ".amp")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".amp", "settings.json")) ||
      existsSync(join(cwd, ".amp", "settings.jsonc")) ||
      existsSync(join(cwd, ".amp")),
    resolveConfigPath: ({ global: isGlobal, cwd }) => {
      if (isGlobal) {
        if (existsSync(join(ampConfigDir, "settings.jsonc"))) {
          return join(ampConfigDir, "settings.jsonc");
        }
        return ampGlobalConfigPath;
      }
      if (existsSync(join(cwd, ".amp", "settings.jsonc"))) {
        return join(cwd, ".amp", "settings.jsonc");
      }
      return join(cwd, ".amp", "settings.json");
    },
    transformConfig: (_name, config) => transformAmpServerConfig(config),
  },
  antigravity: {
    name: "antigravity",
    displayName: "Antigravity",
    globalConfigPath: antigravityMcpConfigPath,
    projectConfigPath: ".agents/mcp_config.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(join(home, ".gemini", "antigravity")) ||
      existsSync(join(home, ".gemini", "config")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".agents", "mcp_config.json")) ||
      existsSync(join(cwd, ".agents")),
  },
  // https://antigravity.google/docs/cli/mcp/
  "antigravity-cli": {
    name: "antigravity-cli",
    displayName: "Antigravity CLI",
    globalConfigPath: antigravityMcpConfigPath,
    projectConfigPath: ".agents/mcp_config.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(join(home, ".gemini", "antigravity-cli")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".agents", "mcp_config.json")) ||
      existsSync(join(cwd, ".agents")),
  },
  // https://docs.augmentcode.com/cli/integrations.md
  augment: {
    name: "augment",
    displayName: "Augment",
    globalConfigPath: augmentGlobalConfigPath,
    projectConfigPath: ".augment/settings.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(augmentConfigDir) ||
      existsSync(join(home, ".augment")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".augment", "settings.json")) ||
      existsSync(join(cwd, ".augment", "settings.jsonc")) ||
      existsSync(join(cwd, ".augment")),
    resolveConfigPath: ({ global: isGlobal, cwd }) => {
      if (isGlobal) {
        if (existsSync(join(augmentConfigDir, "settings.jsonc"))) {
          return join(augmentConfigDir, "settings.jsonc");
        }
        return augmentGlobalConfigPath;
      }
      if (existsSync(join(cwd, ".augment", "settings.jsonc"))) {
        return join(cwd, ".augment", "settings.jsonc");
      }
      return join(cwd, ".augment", "settings.json");
    },
    transformConfig: (_name, config) => transformAugmentServerConfig(config),
  },
  cline: {
    name: "cline",
    displayName: "Cline (VSCode extension)",
    globalConfigPath: clineExtensionConfigPath,
    projectConfigPath: ".cline/mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(clineExtensionConfigPath),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".cline", "mcp.json")) ||
      existsSync(join(cwd, ".cline")),
    resolveConfigPath: ({ global: isGlobal, cwd }) => {
      if (isGlobal) {
        return clineExtensionConfigPath;
      }
      return join(cwd, ".cline", "mcp.json");
    },
    transformConfig: (_name, config) => transformClineServerConfig(config),
  },
  "cline-cli": {
    name: "cline-cli",
    displayName: "Cline CLI",
    globalConfigPath: clineCliConfigPath,
    projectConfigPath: ".cline/mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(clineDir),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".cline", "mcp.json")) ||
      existsSync(join(cwd, ".cline")),
    resolveConfigPath: ({ global: isGlobal, cwd }) => {
      if (isGlobal) {
        if (existsSync(join(clineDir, "mcp.json"))) {
          return join(clineDir, "mcp.json");
        }
        if (existsSync(join(clineDir, "data", "settings", "cline_mcp_settings.json"))) {
          return join(clineDir, "data", "settings", "cline_mcp_settings.json");
        }
        return clineCliConfigPath;
      }
      return join(cwd, ".cline", "mcp.json");
    },
    transformConfig: (_name, config) => transformClineServerConfig(config),
  },
  // https://code.claude.com/docs/en/mcp-quickstart#edit-mcp-json-directly
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
  // https://learn.chatgpt.com/docs/extend/mcp?surface=app
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
  // https://docs.x.ai/build/features/mcp-servers.md
  grok: {
    name: "grok",
    displayName: "Grok",
    globalConfigPath: grokConfigPath,
    projectConfigPath: ".grok/config.toml",
    configKey: "mcp_servers",
    format: "toml",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(grokConfigPath) ||
      existsSync(process.env.GROK_HOME?.trim() || join(home, ".grok")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".grok", "config.toml")) ||
      existsSync(join(cwd, ".grok")),
    transformConfig: (_name, config) => transformGrokServerConfig(config),
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
  // https://www.kimi.com/code/docs/en/kimi-code-cli/customization/mcp.html
  "kimi-code-cli": {
    name: "kimi-code-cli",
    displayName: "Kimi Code CLI",
    globalConfigPath: kimiCodeConfigPath,
    projectConfigPath: ".kimi-code/mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(kimiCodeConfigPath) ||
      existsSync(process.env.KIMI_CODE_HOME?.trim() || join(home, ".kimi-code")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".kimi-code", "mcp.json")) ||
      existsSync(join(cwd, ".kimi-code")),
    transformConfig: (_name, config) => transformKimiCodeServerConfig(config),
  },
  // https://kiro.dev/docs/mcp/configuration.md
  kiro: {
    name: "kiro",
    displayName: "Kiro",
    globalConfigPath: kiroConfigPath,
    projectConfigPath: ".kiro/settings/mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(kiroConfigPath) ||
      existsSync(process.env.KIRO_HOME?.trim() || join(home, ".kiro")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".kiro", "settings", "mcp.json")) ||
      existsSync(join(cwd, ".kiro")),
    transformConfig: (_name, config) => transformKiroServerConfig(config),
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
  // https://pi.dev/packages/pi-mcp-extension
  pi: {
    name: "pi",
    displayName: "Pi",
    globalConfigPath: join(home, ".pi", "agent", "mcp.json"),
    projectConfigPath: ".pi/mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () => existsSync(join(home, ".pi")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".pi", "mcp.json")) || existsSync(join(cwd, ".pi")),
    transformConfig: (_name, config) => transformPiServerConfig(config),
  },
  // https://docs.qoder.com/zh/cli/mcp-servers
  qoder: {
    name: "qoder",
    displayName: "Qoder",
    globalConfigPath: qoderConfigPath,
    projectConfigPath: ".mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(qoderConfigPath) ||
      existsSync(process.env.QODER_HOME?.trim() || join(home, ".qoder")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".mcp.json")) ||
      existsSync(join(cwd, ".qoder", "settings.json")) ||
      existsSync(join(cwd, ".qoder")),
    resolveConfigPath: ({ global: isGlobal, cwd }) => {
      if (isGlobal) return qoderConfigPath;
      if (existsSync(join(cwd, ".qoder", "settings.json"))) {
        return join(cwd, ".qoder", "settings.json");
      }
      return join(cwd, ".mcp.json");
    },
  },
  // https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/
  "qwen-code": {
    name: "qwen-code",
    displayName: "Qwen Code",
    globalConfigPath: qwenCodeConfigPath,
    projectConfigPath: ".qwen/settings.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(qwenCodeConfigPath) ||
      existsSync(
        process.env.QWEN_CODE_HOME?.trim() ||
          process.env.QWEN_HOME?.trim() ||
          join(home, ".qwen"),
      ),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".qwen", "settings.json")) ||
      existsSync(join(cwd, ".qwen")),
    transformConfig: (_name, config) => transformQwenCodeServerConfig(config),
  },
  // https://docs.trae.ai/ide/add-mcp-servers?_lang=en
  trae: {
    name: "trae",
    displayName: "Trae",
    globalConfigPath: traeConfigPath,
    projectConfigPath: ".trae/mcp.json",
    configKey: "mcpServers",
    format: "jsonc",
    supportedTransports: ALL_TRANSPORTS,
    detectGlobalInstall: () =>
      existsSync(traeConfigPath) ||
      existsSync(join(home, ".trae", "mcp.json")) ||
      existsSync(join(home, ".trae")) ||
      existsSync(traePath) ||
      existsSync(join(appSupport, "Trae")),
    detectProjectInstall: (cwd) =>
      existsSync(join(cwd, ".trae", "mcp.json")) ||
      existsSync(join(cwd, ".trae")),
    resolveConfigPath: ({ global: isGlobal, cwd }) => {
      if (isGlobal) {
        if (existsSync(join(home, ".trae", "mcp.json"))) {
          return join(home, ".trae", "mcp.json");
        }
        return traeConfigPath;
      }
      return join(cwd, ".trae", "mcp.json");
    },
    transformConfig: (_name, config) => transformTraeServerConfig(config),
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
  "amp-cli": "amp",
  "amp-code": "amp",
  ampcode: "amp",
  auggie: "augment",
  "augment-code": "augment",
  augmentcode: "augment",
  "cline-vscode": "cline",
  gemini: "gemini-cli",
  "github-copilot": "vscode",
  "grok-cli": "grok",
  kimi: "kimi-code-cli",
  "kimi-cli": "kimi-code-cli",
  "kimi-code": "kimi-code-cli",
  "kiro-cli": "kiro",
  "kiro-ide": "kiro",
  "pi-agent": "pi",
  "qoder-cli": "qoder",
  qwen: "qwen-code",
  "qwen-cli": "qwen-code",
  qwencode: "qwen-code",
  "trae-code": "trae",
  traecode: "trae",
  "trae-ide": "trae",
  xai: "grok",
  "xai-grok": "grok",
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
