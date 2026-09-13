// ============================================================================
// @wuyax/mcps — Public Programmatic SDK
// Clean, robust, and headless API surface for programmatic MCP orchestration.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Agent Detection & Metadata
// ---------------------------------------------------------------------------
export {
  detectGloballyInstalledMcpAgents,
  detectProjectInstalledMcpAgents,
  getMcpAgentConfig,
  getMcpAgentsSupportingProjectScope,
  getMcpAgentTypes,
  isMcpAgentType,
  isMcpTransportSupported,
  resolveMcpAgentAlias,
} from "./agents.ts";

// ---------------------------------------------------------------------------
// 2. Server Config Domain Model, Protocols & State Transitions
// ---------------------------------------------------------------------------
export {
  applyServerConfigDelta,
  buildMcpServerConfig,
  detectUpdateTransition,
  isRemoteServerConfig,
  isStdioServerConfig,
  parseServerConfig,
  sanitizeUpdatedServerConfig,
  toRemoteServerConfig,
  toStdioServerConfig,
  type ApplyServerConfigDeltaResult,
  type BuildMcpServerConfigOptions,
  type McpRemoteServerConfig,
  type McpStdioServerConfig,
  type ServerConfigDeltaOptions,
  type UpdateTransitionType,
} from "./server-config.ts";

// ---------------------------------------------------------------------------
// 3. Constants
// ---------------------------------------------------------------------------
export { DEFAULT_REMOTE_TRANSPORT } from "./constants.ts";

// ---------------------------------------------------------------------------
// 4. Source Parsing
// ---------------------------------------------------------------------------
export {
  extractPackageName,
  isRemoteMcpSource,
  parseMcpSource,
} from "./source-parser.ts";

// ---------------------------------------------------------------------------
// 5. Config Store & Pluggable Storage Seam
// ---------------------------------------------------------------------------
export {
  AgentConfigStore,
  agentConfigStore,
  getCandidateAgentsForScope,
  resolveMcpConfigTarget,
  type AgentConfigStoreListResult,
  type AgentConfigStoreRemoveResult,
  type AgentConfigStoreWriteResult,
  type ConfigStoreAdapter,
  type ConfigTargetDescriptor,
  type McpConfigTarget,
} from "./config-store.ts";

// ---------------------------------------------------------------------------
// 6. Target Resolution & Config Clustering
// ---------------------------------------------------------------------------
export {
  getCoHostedAgents,
  resolveConfigClusters,
  sortAgentsByClusters,
} from "./resolve-config-clusters.ts";
export {
  resolveTargetAgents,
  type IncompatibleAgent,
  type TargetResolutionQuery,
  type TargetResolutionResult,
} from "./resolve-target-agents.ts";

// ---------------------------------------------------------------------------
// 7. Core High-Level Orchestration (Programmatic Workflows)
// ---------------------------------------------------------------------------
export { installMcpServer } from "./install-mcp-server.ts";
export {
  installMcpServerForAgents,
  installMcpServerForAgent,
  installToCompatibleAgents,
  type InstallToCompatibleAgentsOptions,
} from "./install-compat.ts";
export { updateMcpServer } from "./update-mcp-server.ts";
export { removeMcpServer } from "./remove.ts";
export {
  listInstalledMcpServers,
  queryGroupedInstalledServers,
} from "./list.ts";

// ---------------------------------------------------------------------------
// 8. Declarative Dialect Transforms
// ---------------------------------------------------------------------------
export {
  createAgentTransform,
  transformServerConfigForAgent,
} from "./transforms/index.ts";

// ---------------------------------------------------------------------------
// 9. Security & Masking Utilities
// ---------------------------------------------------------------------------
export {
  maskSecretHeader,
  maskSecretValue,
  SECRET_HEADER_PATTERN,
  SECRET_KEY_PATTERN,
} from "./utils/mask-secret.ts";

// ---------------------------------------------------------------------------
// 10. TypeScript Types
// ---------------------------------------------------------------------------
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
