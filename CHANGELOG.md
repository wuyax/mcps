# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-13

### Architecture Deepening & Major Refactoring

#### 1. Agent Config Store (`src/config-store.ts`)
- **Deep Multi-Agent Persistence**: Internalized physical path resolution, configuration clustering, per-agent dialect transformation, and co-hosted awareness into `AgentConfigStore`.
- **Batch Operations**:
  - `agentConfigStore.writeServers(agents, serverName, serverConfig, options)`: Automatically resolves target clusters, applies declarative dialects per agent, deduplicates writes to shared physical files, and returns structured results with `coConfiguredAgents`.
  - `agentConfigStore.removeServers(agents, serverName, options)`: Symmetrically removes servers across multiple agents with deduplicated physical writes and `coAffectedAgents` feedback.
- **Cluster Query Methods**:
  - `agentConfigStore.getCoHostedAgents(agentType, options)`: Resolves agents sharing the same physical configuration target.
  - `agentConfigStore.resolveConfigClusters(agentTypes, options)`: Groups requested agents by configuration target.
  - `agentConfigStore.sortAgentsByClusters(agentTypes, options)`: Sorts agents for adjacency in interactive selection prompts.

#### 2. Server Config Domain Module (`src/server-config.ts`)
- **Unified Domain Lifecycle**: Consolidated fragmented operations across building, parsing, type guards, protocol transitions, and delta validation into a cohesive deep domain module.
- **Delta Application & Validation**:
  - Added `applyServerConfigDelta(previousConfig, options)`: Validates mutual exclusion between `--url` (remote) and `--command` (stdio), calculates target protocol, detects ignored incompatible flags, and produces sanitized configurations.
  - Greatly simplified `src/cli/manage.ts` by removing ~60 lines of imperative flag checking.
- **Type Guards & Transitions**:
  - Centralized `isRemoteServerConfig`, `isStdioServerConfig`, `toRemoteServerConfig`, `toStdioServerConfig`, `detectUpdateTransition`, and `sanitizeUpdatedServerConfig`.

#### 3. Deep Server Query & Clean Dependency Seam (`src/list.ts`)
- **Server Grouping & Divergence Detection**:
  - Absorbed `groupInstalledServersByName(installed)` and divergence analysis (`hasDivergence`) into `src/list.ts`.
  - Added `queryGroupedInstalledServers(options)` for convenient single-call listing and grouping.
- **I/O Caching**: Added internal physical file read caching to avoid redundant disk operations when querying co-hosted agents.
- **Eliminated Layer Inversion**: Deleted `src/interactive/utils/group-installed-servers.ts`, removing an architectural violation where non-interactive CLI commands (`manage.ts`) imported from interactive wizard utilities.

### Public API Compatibility & Migration Guide

To balance clean architecture with secondary development ergonomics, public API functions remain accessible from the root package entrypoint (`src/index.ts`):

- **Installer Functions**:
  - `src/installer.ts` has been removed.
  - `installMcpServerForAgent`, `installMcpServerForAgents`, and `installToCompatibleAgents` are preserved via `src/install-compat.ts` and continue to be exported from `@wuyax/mcps`.
  - *Recommended Migration*: Call `agentConfigStore.writeServers(agents, name, config, options)` directly.
- **Server Listing & Grouping**:
  - `queryGroupedInstalledServers`, `listInstalledMcpServers`, and `type GroupedInstalledServer` are exported from `@wuyax/mcps`, providing clean, single-call server querying and grouping.
- **Server Config Helpers**:
  - `buildMcpServerConfig` (`src/build-server-config.ts`) and `parseServerConfig` (`src/parse-server-config.ts`) are maintained as thin re-exports from `src/server-config.ts`.
  - Added exports for `applyServerConfigDelta`, `type ServerConfigDeltaOptions`, and `type ApplyServerConfigDeltaResult`.

---

## [0.1.0-beta.3] - 2026-09-08

### Added
- Configuration clustering and co-hosted agent deduplication across multi-agent environments.
- Linked-checkbox interactive prompt (`linkedCheckbox`) for selecting co-hosted agents with visual link indicators.
- Co-hosted feedback notices and badges (`formatCoHostedBadge`, `logCoHostedNotice`).

### Changed
- Refactored server removal to report `coAffectedAgents` when removing from shared configuration targets.
- Improved ASCII prompt styling and clean error handling.

---

## [0.1.0-beta.2] - 2026-09-07

### Added
- Server management command (`mcps manage`) supporting in-place configuration inspection, modification, and synchronization.
- Interactive management wizard (`wizardManage`) with step-by-step editing for environment variables, arguments, headers, and protocol switching.
- Protocol switching support between stdio and remote transports with dirty field sanitization.
- Orchestration API `updateMcpServer`.

---

## [0.1.0-beta.1] - 2026-09-06

### Added
- Core multi-agent MCP installation, removal, and listing (`add`, `install`, `remove`, `list`).
- Declarative Server Config Dialect transformation supporting 20+ coding AI agents (Cursor, VSCode, Claude Code, Claude Desktop, Cline, Windsurf, Zed, Goose, Pi, etc.).
- Multi-format file persistence for JSON, JSONC, YAML, and TOML configurations.
- Dual-mode support: fully non-interactive CLI commands alongside interactive Inquirer-based terminal wizards.
