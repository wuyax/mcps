# mcps (@wuyax/mcps)

Cross-platform MCP (Model Context Protocol) server installer, synchronizer, and configuration manager for AI coding agents.

`mcps` bridges configuration divergence across AI coding tools. It parses MCP server sources, auto-detects installed coding agents, converts configuration shapes into agent-specific dialects, and persists settings into native configuration files across multiple formats (`json`, `jsonc`, `yaml`, `toml`).

---

## Key Features

- **23 Supported Agents**: Supports Cursor, VS Code, Claude Code, Claude Desktop, Antigravity, Amp, Augment, Codex, Goose, Grok, Kimi Code, Kiro, OpenCode, Pi, Qoder, Qwen Code, Trae, Zed, and more.
- **Multi-Format Persistence**: Native read and write support for JSON, JSONC (preserving comments), YAML, and TOML.
- **Dialect Transforms**: Declarative transformation layer mapping standard MCP server definitions into agent-specific field structures (`command` vs `cmd`, array vs string, transport types, headers, timeouts).
- **Source Auto-Detection**: Supports npm packages (via `npx -y`), remote HTTP and SSE URLs, and custom stdio commands/Docker containers. Automatically strips scopes, extensions, and server affixes to infer clean server names.
- **Cross-Agent Synchronization**: Inspect installed MCP servers and clone configurations across agents with automatic format and schema conversion.
- **Dual Mode (Interactive TTY + Non-Interactive CLI)**: Interactive terminal wizards with password masking for secrets, plus full flag support for headless scripts and CI automation.

---

## Installation

Run directly via `npx`:

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

You can run directly via `npx @wuyax/mcps [command]`, or run `mcps [command]` if installed globally.

### Interactive Wizard (Default)

Launch the interactive terminal wizard:

```bash
npx @wuyax/mcps
# or if installed globally:
mcps
```

The interactive wizard provides:
1. **Add MCP Server**: Step-by-step wizard to install npm packages, remote endpoints, or stdio commands. Supports multi-line `.env` pasting with password masking for sensitive tokens.
2. **Manage & Sync Installed MCP Servers**: Inspect installed servers in project or global scope, view parsed details, and sync/clone any server to other detected or selected agents.
3. **Remove MCP Server**: Select and remove MCP servers from target agent configs.

### Non-Interactive CLI

Install an npm MCP server into auto-detected project agents:

```bash
mcps add @modelcontextprotocol/server-filesystem
```

Install a remote SSE server to specific agents with authentication headers:

```bash
mcps add https://mcp.example.com/sse --transport sse --header "Authorization: Bearer token123" -a cursor vscode
```

List installed servers in the current project:

```bash
mcps list
```

Remove a server from all agents globally:

```bash
mcps remove server-filesystem -g --all
```

---

## Supported Agents

| Agent | Identifier | Aliases | Scopes | Transports | Config Format | Config Path (Project / Global) |
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

---

## CLI Reference

### Global Options

- `-v, --version`: Display version number.
- `-h, --help`: Display command-line help.

### `mcps add [source]`

Adds an MCP server to one or more agent configurations.

```bash
mcps add [source] [options]
```

#### Arguments
- `[source]`: Remote URL (`http://...`, `https://...`), npm package (`@modelcontextprotocol/server-git`), or shell command (`python -m my_server`). If omitted in TTY mode, opens the interactive wizard.

#### Options
- `-a, --agent <agents...>`: Target agents by identifier or alias. Pass `'*'` to target all agents.
- `--all`: Install to all supported agents for the specified scope.
- `-g, --global`: Install to user-level configuration files instead of the current project.
- `-t, --transport <type>`: Transport type for remote servers (`http` or `sse`).
- `--header <header...>`: HTTP headers formatted as `Key: Value`. Repeatable.
- `--env <env...>`: Environment variables formatted as `KEY=VALUE`. Repeatable.
- `--args <args...>`: Additional command-line arguments for stdio/package servers.
- `-n, --name <name>`: Explicit override for server name.
- `-y, --yes`: Non-interactive mode, bypass all confirmation prompts.

#### Examples

```bash
# Auto-detect project agents and install npm package
mcps add @modelcontextprotocol/server-postgres

# Install with explicit environment variables and custom arguments
mcps add @modelcontextprotocol/server-github \
  --env "GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx" \
  -a cursor claude-code

# Install custom python command with name override
mcps add "python -m my_mcp_server" -n custom-server -a vscode

# Install remote server with SSE transport and authorization header globally
mcps add https://mcp.company.internal/sse \
  -t sse \
  --header "Authorization: Bearer sse_secret" \
  -g -a cursor
```

### `mcps list` (alias: `mcps ls`)

Lists installed MCP servers across agents.

```bash
mcps list [options]
mcps ls [options]
```

#### Options
- `-g, --global`: List global configurations instead of current project.
- `-a, --agent <agents...>`: Filter listing by specific agent identifiers or aliases.
- `--json`: Output server configurations as structured JSON.

#### Examples

```bash
# List all servers configured in the current project
mcps list

# List all global servers as JSON
mcps list -g --json

# List servers configured in Cursor and VS Code
mcps list -a cursor vscode
```

### `mcps remove [name]` (alias: `mcps rm`)

Removes an MCP server from agent configuration files.

```bash
mcps remove [name] [options]
mcps rm [name] [options]
```

#### Arguments
- `[name]`: Name of the MCP server to remove. If omitted in TTY mode, opens the interactive removal wizard.

#### Options
- `-g, --global`: Remove from global user-level configurations.
- `-a, --agent <agents...>`: Filter removal to specific agents. Pass `'*'` for all agents.
- `-y, --yes`: Skip confirmation prompt.

#### Examples

```bash
# Remove from all configured project agents
mcps remove postgres

# Remove from Cursor in global scope without prompt
mcps remove github -a cursor -g -y
```

---

## Source Parsing Mechanics

When a source string is provided to `mcps add`, `mcps` classifies and normalizes it automatically:

1. **Remote URL**: Any source starting with `http://` or `https://`.
   - Transport defaults to `sse` if the URL contains `/sse`, otherwise `http`.
   - Server name is derived from the primary hostname label, stripping common TLDs and generic prefixes (`api`, `mcp`, `app`).
2. **npm Package**: Single token matching npm package naming rules.
   - Command is normalized to `npx -y <package>`.
   - Server name is inferred by stripping npm scope prefixes (`@modelcontextprotocol/`), package affixes (`mcp-server-`, `-mcp-server`, `mcp-`, `-mcp`, `-server`, `server-`), and script extensions.
3. **Command**: Any string containing spaces or command runners (`python`, `uvx`, `node`, `docker`).
   - Command runner and flags are parsed, extracting the target package or command name as the inferred server name.

---

## Programmatic Node API

`mcps` provides a strongly-typed TypeScript/ESM and CommonJS API.

```typescript
import {
  installMcpServer,
  listInstalledMcpServers,
  removeMcpServer,
  parseMcpSource,
  resolveTargetAgents,
  transformServerConfigForAgent,
  getMcpAgentConfig,
} from "mcps";

// 1. Install an MCP server
const installResult = installMcpServer({
  source: "@modelcontextprotocol/server-postgres",
  agents: ["cursor", "vscode", "codex"],
  env: {
    POSTGRES_CONNECTION_STRING: "postgresql://localhost/db",
  },
  global: false,
});

console.log(`Configured ${installResult.serverName}:`);
for (const res of installResult.results) {
  console.log(`- ${res.agent}: ${res.success ? "OK" : res.error} (${res.path})`);
}

// 2. List installed servers
const installedServers = listInstalledMcpServers({
  global: false,
  agents: ["cursor"],
});

// 3. Parse an MCP source string
const parsed = parseMcpSource("https://api.github.com/mcp/sse");
// { type: "remote", value: "https://api.github.com/mcp/sse", inferredName: "github" }

// 4. Remove an MCP server
const removeResults = removeMcpServer({
  name: "postgres",
  agents: ["cursor"],
  global: false,
});
```

---

## Architecture & Seams

`mcps` is structured as a collection of decoupled deep modules:

- **CLI Commands (`src/cli/`)**: Built on `commander`. Guarantees clean separation between non-interactive execution and interactive TTY fallback.
- **Interactive Wizards (`src/interactive/`)**: Terminal interface built with `@inquirer/prompts`. Handles scoped inspection, password masking for credentials, and cross-agent synchronization.
- **Target Agent Resolver (`src/resolve-target-agents.ts`)**: Resolves target agents by combining CLI arguments, wildcards, filesystem auto-detection, and transport capability filtering (e.g. preventing remote servers on stdio-only agents).
- **Agent Config Store (`src/config-store.ts`)**: Unified persistence engine managing path resolution, atomic updates, and format-specific serialization.
- **Format Adapters (`src/formats/`)**: Isolated adapters for `json`, `jsonc` (comment-preserving via `jsonc-parser`), `yaml` (`yaml`), and `toml` (`@iarna/toml`).
- **Server Config Dialects (`src/transforms/`)**: Declarative transformations standardizing variations in agent configuration schemas (e.g., Goose's `cmd`/`envs`, VS Code's `servers` and `type`, OpenCode's command arrays).

---

## Development & Verification

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
