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
// Backward-compatible thin wrappers (previously in installer.ts, now delegating to Store)
export { installMcpServerForAgent, installMcpServerForAgents, installToCompatibleAgents } from "./install-compat.ts";
export type { InstallToCompatibleAgentsOptions } from "./install-compat.ts";
export { resolveMcpConfigTarget, getCandidateAgentsForScope } from "./config-store.ts";
export {
  getCoHostedAgents,
  resolveConfigClusters,
  sortAgentsWithClusters,
} from "./resolve-config-clusters.ts";
export {
  groupInstalledServersByName,
  listInstalledMcpServers,
  listInstalledMcpServers as list,
  normalizeServerConfig,
  queryGroupedInstalledServers,
} from "./list.ts";
export {
  extractPackageName,
  isRemoteMcpSource,
  parseMcpSource,
  parseMcpSource as parseSource,
} from "./source-parser.ts";
export { removeMcpServer, removeMcpServer as remove, removeMcpServerFromAgent } from "./remove.ts";
export {
  detectUpdateTransition,
  sanitizeUpdatedServerConfig,
  toRemoteServerConfig,
  toStdioServerConfig,
  updateMcpServer,
  updateMcpServer as update,
  type UpdateTransitionType,
} from "./update-mcp-server.ts";
export { mainMenu } from "./interactive/main-menu.ts";
export { wizardAdd } from "./interactive/wizard-add.ts";
export {
  displayServerDetails,
  type DisplayServerDetailsOptions,
} from "./utils/display-server-details.ts";
export { resolveTransport } from "./utils/resolve-transport.ts";
export {
  maskSecretHeader,
  maskSecretValue,
  SECRET_HEADER_PATTERN,
  SECRET_KEY_PATTERN,
} from "./utils/mask-secret.ts";
export {
  promptSwitchServerType,
  wizardManage,
  type EditServerConfigOptions,
  type WizardManageOptions,
} from "./interactive/wizard-manage.ts";

export { wizardRemove } from "./interactive/wizard-remove.ts";
export {
  promptEditKeyValueConfig,
  type PromptEditKeyValueOptions,
} from "./interactive/prompts/kv.ts";
export {
  formatEnvText,
  parseEnvText,
  promptEditEnvConfig,
  promptEnvConfig,
} from "./interactive/prompts/env.ts";
export {
  formatHeadersText,
  parseHeadersText,
  promptEditHeadersConfig,
  promptHeadersConfig,
} from "./interactive/prompts/headers.ts";
export {
  formatArgsString,
  parseArgsString,
  promptArgsConfig,
  promptEditArgs,
} from "./interactive/prompts/args.ts";
export { promptScopeAndAgents } from "./interactive/prompts/agents.ts";
export { promptScope } from "./interactive/prompts/scope.ts";
export {
  linkedCheckbox,
  type LinkedCheckboxPrompt,
  type LinkedChoice,
} from "./interactive/prompts/linked-checkbox.ts";
export { mcpManageCommand } from "./cli/manage.ts";
export {
  buildLinkedAgentChoices,
  type BuildLinkedAgentChoicesOptions,
} from "./interactive/utils/build-linked-agent-choices.ts";

export {
  createAgentTransform,
  transformServerConfig,
  transformServerConfigForAgent,
} from "./transforms/index.ts";

export type {
  ConfigCluster,
  GroupedInstalledServer,
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
  UpdateMcpServerOptions,
  UpdateMcpServerResult,
} from "./types.ts";
