# mcps (@wuyax/mcps)

Cross-platform Model Context Protocol (MCP) server manager, synchronizer, and configuration orchestrator for AI coding agents.

`mcps` bridges configuration divergence across AI coding tools. It classifies MCP server sources, auto-detects installed coding agents, converts configuration shapes into agent-specific dialects, and persists settings into native configuration files across multiple formats (`json`, `jsonc`, `yaml`, `toml`).

---

## Key Features

- **23 Supported Agents**: First-class support for Amp, Antigravity, Antigravity CLI, Augment, Claude Code, Claude Desktop, Cline (VS Code extension), Cline CLI, Codex, Cursor, Gemini CLI, GitHub Copilot CLI, Goose, Grok, Kimi Code CLI, Kiro, OpenCode, Pi, Qoder, Qwen Code, Trae, VS Code, and Zed.
- **Multi-Format Storage**: Native read and write engines for JSON, JSONC (preserving existing comments and AST structure via `jsonc-parser`), YAML, and TOML.
- **Declarative Dialect Transforms**: Intelligent transformation layer adapting standard `McpServerConfig` models into agent-specific field shapes (`command` array vs binary string, `cmd` vs `command`, `envs` vs `env` vs `environment`, `uri` vs `url`, transport indicators, timeouts, and metadata flags).
- **Intelligent Source Resolution**: Accepts npm package specs, remote HTTP/SSE endpoints, local CLI commands, and Docker containers. Automatically strips npm scopes, package affixes, script extensions, and URL host clutter to infer clean server names.
- **Cross-Agent Synchronization**: Inspect installed MCP servers across project and global scopes, view parsed details, and sync/clone configurations to other agents with automatic dialect and format translation.
- **Dual Mode (Interactive TTY + Headless CLI)**: Rich interactive terminal wizards with multiline `.env`/header pasting, `$EDITOR` launching, and password masking for secrets, combined with robust CLI flags and standard exit codes for CI/CD and autonomous agents.
- **Pluggable Architecture**: Decoupled deep modules including `AgentConfigStore` (supporting filesystem and in-memory test adapters), `resolveTargetAgents` (capability and transport filtering), and declarative transform dialects.

---

## Installation

Run directly using `npx`:

```bash
npx @wuyax/mcps
```

Or install globally:

```bash
npm install -g @wuyax/mcps
# or
pnpm add -g @wuyax/mcps
```

---

## Quick Start

Execute directly via `npx @wuyax/mcps [command]` or `mcps [command]` when installed globally.

### 1. Interactive Terminal Wizard (Default)

Running `mcps` without arguments in an interactive terminal launches the main menu wizard:

```bash
mcps
```

The interactive menu provides three workflows:
1. **Add MCP Server**: Step-by-step installation guiding source selection, protocol detection, scope and agent selection with auto-detection tags, command arguments, and environment variables.
2. **Manage & Sync Installed MCP Servers**: Inspect installed servers in project or global scope, view parsed server configurations, and clone/sync configurations across agents with automatic format and schema conversion.
3. **Remove MCP Server**: Select and remove MCP servers from target agent configs with safety confirmations.

### 2. Non-Interactive CLI Automation

Install an npm MCP server into auto-detected project agents:

```bash
mcps add @modelcontextprotocol/server-filesystem
```

Install a remote SSE server into specific agents with an authorization header:

```bash
mcps add https://mcp.example.com/sse --transport sse --header "Authorization: Bearer token123" -a cursor vscode
```

List installed MCP servers in the current project:

```bash
mcps list
```

Remove an MCP server from all agents globally without prompting:

```bash
mcps remove server-filesystem -g -a '*' -y
```

---

## Interactive Wizards

When running in an interactive terminal (TTY), `mcps` provides interactive wizards built with `@inquirer/prompts`.

### Main Menu (`mcps`)

When launched with no arguments, the main menu offers:
- **Add MCP Server**: Launches `wizardAdd`.
- **Manage & Sync Installed MCP Servers**: Launches `wizardManage`.
- **Remove MCP Server**: Launches `wizardRemove`.
- **Exit**: Cleanly exits the wizard.

### Add Wizard (`mcps add` without source)

1. **Source Type Selection**:
   - `npm package (run via npx)`: Enter package identifier (e.g. `@modelcontextprotocol/server-postgres`).
   - `Remote MCP server (via HTTP / SSE URL)`: Enter HTTP/HTTPS URL (e.g. `https://mcp.example.com/sse`).
   - `Local command / script / Docker (stdio)`: Enter command string (e.g. `python -m my_mcp_server`).
2. **Server Name**: Automatically inferred from the source with an editable default.
3. **Transport & Protocol** (for remote servers): Select between `HTTP` and `SSE (Server-Sent Events)`. Defaults to `sse` if URL contains `/sse`.
4. **Scope & Agent Selection**:
   - Choose between **Project** (`.`) and **Global** (user home directory).
   - Scans filesystem to auto-detect installed agents in the chosen scope.
   - Presents a checkbox list where detected agents are labeled with `[detected]` and pre-selected by default.
5. **Arguments**: Configure optional CLI arguments (quote-aware parsing for paths with spaces).
6. **Environment Variables & Secrets**:
   - `Skip / None`: Proceed without environment variables.
   - `Paste multiline .env text into terminal`: Supports `KEY=VALUE`, `export KEY=VALUE`, comments (`#`), and quoted values.
   - `Open in system default editor ($EDITOR)`: Opens temporary `.env` file in user's configured editor.
   - `Enter key-value pairs one by one`: Prompts for individual variables. Automatically detects sensitive keys (`token`, `key`, `secret`, `password`, `auth`, `credential`) and masks input using password prompts.
7. **HTTP Headers** (for remote servers):
   - Supports multiline terminal pasting (`Key: Value` or `Key=Value`), `$EDITOR` entry, or step-by-step entry with secret masking for authorization tokens.
8. **Configuration Preview & Confirmation**: Displays normalized parameters before writing to disk.

### Manage & Sync Wizard (`mcps` -> Manage)

1. Prompts for scope (**Project** or **Global**).
2. Lists all configured MCP servers grouped by server name along with the agents that currently configure them.
3. Inspects selected server details: transport type, URL or command, arguments, environment variables, and headers.
4. Allows triggering **Sync / clone to other agents**:
   - Identifies candidate agents that do not currently have the server configured.
   - Filters candidate agents by scope and transport capability.
   - Writes the server configuration to selected targets using their respective native config formats and schema dialects.

### Remove Wizard (`mcps remove` without name)

1. Prompts for scope (**Project** or **Global**).
2. Lists configured servers for selection.
3. Removes the selected server from target agent configuration files with safety confirmation.

---

## CLI Command Reference

### Exit Codes & Completion Criteria

- `0`: Operation completed successfully. Target configuration files were modified or queried as requested.
- `1`: Operation failed. Caused by missing required arguments in non-TTY mode, unresolvable or incompatible agents, invalid source syntax, or file system permission errors.

---

### `mcps add [source]`

Installs an MCP server into one or more agent configuration files.

```bash
mcps add [source] [options]
```

#### Arguments

- `[source]`: MCP server source. Can be an npm package (`@modelcontextprotocol/server-git`), a remote endpoint (`https://mcp.example.com/sse`), or a shell command (`python -m my_server`). If omitted in TTY mode, starts the interactive Add Wizard.

#### Options

- `-a, --agent <agents...>`: Target specific agents by identifier or alias (e.g. `-a cursor vscode`). Pass `'*'` to target all agents.
- `--all`: Target all supported agents that support the chosen scope.
- `-g, --global`: Install to user-level global configuration instead of current project directory.
- `-t, --transport <type>`: Explicit transport type for remote servers (`http` or `sse`). Defaults to `sse` if URL contains `/sse`, otherwise `http`.
- `--header <header...>`: HTTP header formatted as `Key: Value`. Repeatable.
- `--env <env...>`: Environment variable formatted as `KEY=VALUE`. Repeatable.
- `--args <args...>`: Additional command-line arguments for stdio/package servers.
- `-n, --name <name>`: Explicit override for server name.
- `-y, --yes`: Non-interactive mode; skips confirmation prompts.

#### Target Resolution & Auto-Detection

When neither `-a` nor `--all` is specified:
1. `mcps` scans the project root or global home directories for installed agents.
2. If agents are detected, filters them by transport capability (e.g. stdio-only agents like Claude Desktop are excluded when adding remote HTTP/SSE servers).
3. If no agents are detected, logs a diagnostic warning and exits with code `1`.

#### Examples

```bash
# Auto-detect project agents and install npm package
mcps add @modelcontextprotocol/server-postgres

# Install npm package with environment variables and custom arguments to specific agents
mcps add @modelcontextprotocol/server-github \
  --env "GITHUB_PERSONAL_ACCESS_TOKEN=ghp_secret" \
  -a cursor claude-code

# Install custom python command with explicit name
mcps add "python -m my_mcp_server" -n custom-server -a vscode

# Install Docker container stdio command
mcps add "docker run -i --rm mcp/fetch" -n fetch -a cursor

# Install remote SSE server globally with authorization header
mcps add https://mcp.internal.net/sse \
  -t sse \
  --header "Authorization: Bearer token_xyz" \
  -g -a cursor vscode

# Install to all supported global agents non-interactively
mcps add @modelcontextprotocol/server-memory -g --all -y
```

---

### `mcps list` (alias: `mcps ls`)

Lists installed MCP servers across agents.

```bash
mcps list [options]
mcps ls [options]
```

#### Options

- `-g, --global`: Query global user-level configurations instead of current project directory.
- `-a, --agent <agents...>`: Filter listing by specific agent identifiers or aliases.
- `--json`: Output server configurations as structured JSON.

#### Examples

```bash
# List servers configured in the current project
mcps list

# List servers configured globally across Cursor and VS Code
mcps list -g -a cursor vscode

# Output all project-configured servers in JSON format
mcps list --json
```

---

### `mcps remove [name]` (alias: `mcps rm`)

Removes an MCP server from agent configuration files.

```bash
mcps remove [name] [options]
mcps rm [name] [options]
```

#### Arguments

- `[name]`: Name of the MCP server to remove. If omitted in TTY mode, starts the interactive Remove Wizard.

#### Options

- `-g, --global`: Remove from global user-level configurations.
- `-a, --agent <agents...>`: Filter removal to specific agents. Pass `'*'` to target all agents.
- `-y, --yes`: Skip confirmation prompts.

#### Examples

```bash
# Remove server from all configured agents in current project
mcps remove postgres

# Remove server from Cursor global config without prompting
mcps remove github -a cursor -g -y

# Remove server from all agents globally
mcps remove memory -g -a '*' -y
```

---

## Source Parsing Mechanics

When a source string is provided to `mcps add`, `mcps` parses and normalizes it into a `ParsedMcpSource`:

### 1. Remote URLs (`type: "remote"`)

- Identified when string matches `^https?:\/\/` pattern.
- **Transport Inference**: Defaults to `sse` if the URL pathname contains `/sse`, otherwise `http`.
- **Name Inference**: Extracts meaningful domain labels, stripping generic prefixes (`api`, `mcp`, `app`) and common TLDs (`com`, `org`, `io`, `net`, `dev`, etc.). Example: `https://api.github.com/mcp/sse` -> `github`.

### 2. npm Packages (`type: "package"`)

- Matches npm package naming conventions (e.g. `@scope/name`, `package-name`).
- Normalized to `command: "npx"`, `args: ["-y", "<package>"]`.
- **Name Inference**:
  - Strips version tags (e.g. `@1.0.0`).
  - Strips npm scope prefixes (e.g. `@modelcontextprotocol/`).
  - Strips path prefixes and script extensions (`.js`, `.mjs`, `.cjs`, `.ts`, `.py`).
  - Strips common package prefixes (`mcp-server-`, `mcp-`, `server-`) and suffixes (`-mcp-server`, `-server`, `-mcp`).
  - Example: `@modelcontextprotocol/server-postgres` -> `postgres`.

### 3. Shell Commands (`type: "command"`)

- Identified when string contains whitespace or known runner prefixes (`python`, `python3`, `node`, `uvx`, `docker`).
- Tokenizes binary and arguments.
- **Name Inference**: Inspects tokens following the runner binary, ignoring flags, and extracts the target script or package name.
  - Example: `python -m my_mcp_server` -> `my_mcp_server`.
  - Example: `uvx mcp-server-sqlite` -> `sqlite`.
  - Example: `docker run -i --rm mcp/fetch` -> `fetch`.

---

## Supported Agents Matrix

`mcps` supports 23 AI coding agents and tools:

| Agent | Identifier | Aliases | Scopes | Transports | Format | Config Path (Project / Global) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Amp** | `amp` | `amp-cli`, `amp-code`, `ampcode` | Project, Global | stdio, http, sse | `jsonc` | `.amp/settings.json` / `~/.config/amp/settings.jsonc` |
| **Antigravity** | `antigravity` | - | Project, Global | stdio, http, sse | `jsonc` | `.agents/mcp_config.json` / `~/.gemini/config/mcp_config.json` |
| **Antigravity CLI** | `antigravity-cli` | `agy` | Project, Global | stdio, http, sse | `jsonc` | `.agents/mcp_config.json` / `~/.gemini/config/mcp_config.json` |
| **Augment** | `augment` | `auggie`, `augment-code`, `augmentcode` | Project, Global | stdio, http, sse | `jsonc` | `.augment/settings.json` / `~/.augment/settings.jsonc` |
| **Claude Code** | `claude-code` | - | Project, Global | stdio, http, sse | `jsonc` | `.mcp.json` / `~/.claude.json` |
| **Claude Desktop** | `claude-desktop` | - | Global | stdio | `jsonc` | User Application Support / Roaming `claude_desktop_config.json` |
| **Cline (VS Code)** | `cline` | `cline-vscode` | Project, Global | stdio, http, sse | `jsonc` | `.cline/mcp.json` / VS Code global storage `cline_mcp_settings.json` |
| **Cline CLI** | `cline-cli` | - | Project, Global | stdio, http, sse | `jsonc` | `.cline/mcp.json` / `~/.cline/mcp.json` |
| **Codex** | `codex` | - | Project, Global | stdio, http, sse | `toml` | `.codex/config.toml` / `~/.codex/config.toml` |
| **Cursor** | `cursor` | - | Project, Global | stdio, http, sse | `jsonc` | `.cursor/mcp.json` / `~/.cursor/mcp.json` |
| **Gemini CLI** | `gemini-cli` | `gemini` | Project, Global | stdio, http, sse | `jsonc` | `.gemini/settings.json` / `~/.gemini/settings.json` |
| **GitHub Copilot CLI** | `github-copilot-cli` | - | Project, Global | stdio, http, sse | `jsonc` | `.mcp.json` / `~/.copilot/mcp-config.json` |
| **Goose** | `goose` | - | Project, Global | stdio, http, sse | `yaml` | `.goose/config.yaml` / `~/.config/goose/config.yaml` |
| **Grok** | `grok` | `grok-cli`, `xai`, `xai-grok` | Project, Global | stdio, http, sse | `toml` | `.grok/config.toml` / `~/.grok/config.toml` |
| **Kimi Code CLI** | `kimi-code-cli` | `kimi`, `kimi-cli`, `kimi-code` | Project, Global | stdio, http, sse | `jsonc` | `.kimi-code/mcp.json` / `~/.kimi-code/mcp.json` |
| **Kiro** | `kiro` | `kiro-cli`, `kiro-ide` | Project, Global | stdio, http, sse | `jsonc` | `.kiro/settings/mcp.json` / `~/.kiro/settings/mcp.json` |
| **OpenCode** | `opencode` | - | Project, Global | stdio, http, sse | `jsonc` | `opencode.json` / `~/.config/opencode/opencode.json` |
| **Pi** | `pi` | `pi-agent` | Project, Global | stdio, http, sse | `jsonc` | `.pi/mcp.json` / `~/.pi/agent/mcp.json` |
| **Qoder** | `qoder` | `qoder-cli` | Project, Global | stdio, http, sse | `jsonc` | `.mcp.json` / `~/.qoder/settings.json` |
| **Qwen Code** | `qwen-code` | `qwen`, `qwen-cli`, `qwencode` | Project, Global | stdio, http, sse | `jsonc` | `.qwen/settings.json` / `~/.qwen/settings.json` |
| **Trae** | `trae` | `trae-code`, `traecode`, `trae-ide` | Project, Global | stdio, http, sse | `jsonc` | `.trae/mcp.json` / `~/.trae/mcp.json` |
| **VS Code** | `vscode` | `github-copilot` | Project, Global | stdio, http, sse | `jsonc` | `.vscode/mcp.json` / User `mcp.json` |
| **Zed** | `zed` | - | Project, Global | stdio, http, sse | `jsonc` | `.zed/settings.json` / `~/.config/zed/settings.json` |

### Environment Variable Overrides

For headless environments, Docker containers, and non-standard filesystem layouts, `mcps` respects environment variables for agent directories:

| Environment Variable | Target Agent | Description |
| :--- | :--- | :--- |
| `AMP_HOME` | Amp | Overrides global config directory (defaults to `~/.config/amp` or `~/.amp`). |
| `AUGMENT_HOME` | Augment | Overrides global config directory (defaults to `~/.augment`). |
| `CLINE_DIR` | Cline CLI | Overrides global directory (defaults to `~/.cline`). |
| `CODEX_HOME` | Codex | Overrides global directory (defaults to `~/.codex`). |
| `COPILOT_HOME` | GitHub Copilot CLI | Overrides global directory (defaults to `~/.copilot`). |
| `GROK_HOME` | Grok | Overrides global directory (defaults to `~/.grok`). |
| `KIMI_CODE_HOME` | Kimi Code CLI | Overrides global directory (defaults to `~/.kimi-code`). |
| `KIRO_HOME` | Kiro | Overrides global directory (defaults to `~/.kiro`). |
| `QODER_HOME` | Qoder | Overrides global directory (defaults to `~/.qoder`). |
| `QWEN_CODE_HOME` / `QWEN_HOME` | Qwen Code | Overrides global directory (defaults to `~/.qwen`). |
| `XDG_CONFIG_HOME` | Linux/macOS defaults | Sets standard XDG base directory for tools adhering to XDG (`amp`, `opencode`, `goose`, `zed`). |

---

## Server Config Dialects

Agent configurations diverge significantly in syntax and structure. `mcps` maps the normalized domain model (`McpServerConfig`) into each agent's native dialect via declarative presets:

- **VS Code (`vscode`, `github-copilot-cli`)**:
  - Root key: `servers`.
  - stdio transport: `type: "stdio"`, `command`, `args`.
  - remote transport: `type: "http" | "sse"`, `url`, `headers`.
- **Goose (`goose`)**:
  - Root key: `extensions`.
  - stdio transport: `cmd` (instead of `command`), `args`, `envs` (instead of `env`), `type: "stdio"`, `timeout: 30`, `description: ""`, `enabled: true`.
  - remote transport: `uri` (instead of `url`), `type: "streamable_http" | "sse"`, `headers`, `timeout: 30`, `description: ""`, `enabled: true`.
- **OpenCode (`opencode`)**:
  - Root key: `mcp`.
  - stdio transport: `command: [command, ...args]` (array format), `environment` (instead of `env`), `type: "local"`, `enabled: true`.
  - remote transport: `type: "remote"`, `url`, `headers`, `enabled: true`.
- **Pi (`pi`)**:
  - stdio transport: `transport: "stdio"`.
  - remote transport: `transport: "streamable-http" | "sse"`.
- **Qwen Code (`qwen-code`)**:
  - remote transport: Uses `url` for SSE and `httpUrl` for standard HTTP.
- **Cline (`cline`, `cline-cli`)**:
  - remote transport: `type: "sse" | "streamableHttp"`.
- **Grok & Trae (`grok`, `trae`)**:
  - remote transport: Sets `type: "sse"` only when SSE transport is active.
- **Zed (`zed`)**:
  - Root key: `context_servers`.
- **Codex (`codex`)**:
  - Format: TOML under `[mcp_servers.<name>]`.
- **Claude Desktop (`claude-desktop`)**:
  - Enforces stdio-only transport. Remote URLs trigger diagnostic warnings and are prevented from persisting.

---

## Programmatic Node / TypeScript API

`mcps` exports a strongly-typed API for ESM and CommonJS.

### Installation & Removal

```typescript
import {
  installMcpServer,
  listInstalledMcpServers,
  removeMcpServer,
  parseMcpSource,
  resolveTargetAgents,
} from "@wuyax/mcps";

// 1. Install an MCP server
const installResult = installMcpServer({
  source: "@modelcontextprotocol/server-postgres",
  agents: ["cursor", "vscode", "goose"],
  env: {
    POSTGRES_CONNECTION_STRING: "postgresql://localhost:5432/db",
  },
  args: ["--read-only"],
  global: false,
});

console.log(`Configured ${installResult.serverName}:`);
for (const record of installResult.results) {
  if (record.success) {
    console.log(`  ${record.agent}: OK -> ${record.path}`);
  } else {
    console.error(`  ${record.agent}: Error -> ${record.error}`);
  }
}

// 2. List installed MCP servers
const servers = listInstalledMcpServers({
  global: false,
  agents: ["cursor", "vscode"],
});

for (const s of servers) {
  console.log(`${s.serverName} on ${s.agent} (${s.path})`);
}

// 3. Remove an MCP server
const removeResults = removeMcpServer({
  name: "postgres",
  agents: ["cursor", "vscode"],
  global: false,
});
```

### Parsing Sources & Resolving Agents

```typescript
import { parseMcpSource, resolveTargetAgents } from "@wuyax/mcps";

// Parse any source string
const parsed = parseMcpSource("https://api.github.com/mcp/sse");
// { type: "remote", value: "https://api.github.com/mcp/sse", inferredName: "github" }

// Resolve target agents with capability checks
const targets = resolveTargetAgents({
  requested: ["cursor", "claude-desktop"],
  transport: "sse",
  global: true,
});

console.log("Compatible:", targets.compatibleAgents); // ['cursor']
console.log("Incompatible:", targets.incompatible);
// [{ agent: 'claude-desktop', reason: 'Claude Desktop currently supports only stdio MCP servers...' }]
```

### Pluggable AgentConfigStore

`AgentConfigStore` decouples file persistence, allowing in-memory testing:

```typescript
import {
  AgentConfigStore,
  MemoryConfigStoreAdapter,
  agentConfigStore, // Default singleton using FsConfigStoreAdapter
} from "@wuyax/mcps";

// Use memory adapter for isolated testing
const memoryStore = new AgentConfigStore(new MemoryConfigStoreAdapter());

memoryStore.writeServer("cursor", "test-server", {
  command: "npx",
  args: ["-y", "test-mcp"],
});

const server = memoryStore.readServer("cursor", "test-server");
console.log(server);
```

### Exported Interactive Utilities

The interactive wizard flows and prompt components are also exported for programmatic embedding:

```typescript
import {
  mainMenu,
  wizardAdd,
  wizardManage,
  wizardRemove,
  promptScopeAndAgents,
  promptEnvConfig,
  promptHeadersConfig,
  promptArgsConfig,
  parseEnvText,
  parseHeadersText,
} from "@wuyax/mcps";
```

---

## Architecture & Seams

`mcps` is organized around decoupled deep modules:

- **CLI Commands (`src/cli/`)**: Built with `commander`. Provides non-interactive execution with full flags and TTY wizard fallbacks.
- **Interactive Wizards (`src/interactive/`)**: Terminal UI built with `@inquirer/prompts`. Handles scope selection, credential masking, multiline terminal and `$EDITOR` input, and cross-agent synchronization.
- **Target Agent Resolver (`src/resolve-target-agents.ts`)**: Resolves target agents from CLI arguments, wildcards, auto-detection, and transport capability constraints.
- **Agent Config Store (`src/config-store.ts`)**: Unified persistence engine behind a pluggable storage seam (`ConfigStoreAdapter`), handling path resolution, existence checks, and file serialization.
- **Format Adapters (`src/formats/`)**: Isolated adapters for `json`, comment-preserving `jsonc` (via `jsonc-parser`), `yaml`, and `toml`.
- **Server Config Dialects (`src/transforms/`)**: Declarative dialect transformations mapping standard `McpServerConfig` records into native agent schema variations.

---

## Quality Gates & Verification

Every change must pass all three gates:

```bash
# 1. Type check
pnpm run typecheck

# 2. Unit and integration tests
pnpm test

# 3. Build ESM and CJS bundles
pnpm build
```

---

## License

MIT
