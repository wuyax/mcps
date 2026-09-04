export {
  detectGloballyInstalledMcpAgents,
  detectProjectInstalledMcpAgents,
  getMcpAgentConfig,
  getMcpAgentTypes,
  getMcpAgentsSupportingProjectScope,
  isMcpAgentType,
  isMcpTransportSupported,
  mcpAgentAliases,
  mcpAgents,
  resolveMcpAgentAlias,
} from "./agents.ts";
export { buildMcpServerConfig } from "./build-server-config.ts";
export {
  isRemoteServerConfig,
  isStdioServerConfig,
  parseServerConfig,
  type McpRemoteServerConfig,
  type McpStdioServerConfig,
} from "./parse-server-config.ts";
export { DEFAULT_REMOTE_TRANSPORT, NPX_COMMAND, NPX_DASH_Y } from "./constants.ts";
export {
  listServersInConfigFile,
  readConfigFile,
  removeServerFromConfigFile,
  writeServerToConfigFile,
} from "./formats/index.ts";
export {
  AgentConfigStore,
  agentConfigStore,
  type AgentConfigStoreListResult,
  type AgentConfigStoreRemoveResult,
  type AgentConfigStoreWriteResult,
  type ConfigStoreAdapter,
  type ConfigTargetDescriptor,
} from "./config-store.ts";
export {
  installMcpServer,
  installMcpServer as add,
  installMcpServer as install,
} from "./install-mcp-server.ts";
export {
  resolveTargetAgents,
  type IncompatibleAgent,
  type TargetResolutionQuery,
  type TargetResolutionResult,
} from "./resolve-target-agents.ts";
export { installMcpServerForAgent, installMcpServerForAgents } from "./installer.ts";
export { resolveMcpConfigTarget } from "./resolve-config-target.ts";
export { listInstalledMcpServers, listInstalledMcpServers as list } from "./list.ts";
export {
  extractPackageName,
  isRemoteMcpSource,
  parseMcpSource,
  parseMcpSource as parseSource,
} from "./source-parser.ts";
export { removeMcpServer, removeMcpServer as remove, removeMcpServerFromAgent } from "./remove.ts";
export { mainMenu } from "./interactive/main-menu.ts";
export { wizardAdd } from "./interactive/wizard-add.ts";
export { wizardManage } from "./interactive/wizard-manage.ts";
export { wizardRemove } from "./interactive/wizard-remove.ts";
export { parseEnvText, promptEnvConfig } from "./interactive/prompts/env.ts";
export { parseHeadersText, promptHeadersConfig } from "./interactive/prompts/headers.ts";
export { parseArgsString, promptArgsConfig } from "./interactive/prompts/args.ts";
export { promptScopeAndAgents } from "./interactive/prompts/agents.ts";
export { promptScope } from "./interactive/prompts/scope.ts";
export {
  groupInstalledServersByName,
  normalizeServerConfig,
  type GroupedInstalledServer,
} from "./interactive/utils/group-installed-servers.ts";

export {
  createAgentTransform,
  transformServerConfig,
  transformServerConfigForAgent,
} from "./transforms/index.ts";

export type {
  InstallMcpServerOptions,
  InstallMcpServerResult,
  ListedMcpServer,
  McpAgentConfig,
  McpAgentType,
  McpConfigFormat,
  McpInstallResultForAgent,
  McpRemoteTransport,
  McpScopeOptions,
  McpServerConfig,
  McpSourceType,
  McpTransportType,
  ParsedMcpSource,
  RemoveMcpServerOptions,
  RemoveMcpServerResult,
  ServerConfigDialect,
  ServerConfigDialectName,
  ServerConfigDialectOptions,
} from "./types.ts";
