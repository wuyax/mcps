# mcps

Cross-platform MCP (Model Context Protocol) server installer and manager for AI coding agents.

Supports **15 agents**, multiple config formats (`json`, `jsonc`, `yaml`, `toml`), and all MCP server types (`remote` HTTP/SSE, `package` via npx, and custom `command` stdio).

---

## Supported Agents

| Agent Name | Identifier | Scope | Transports | Config Format |
| :--- | :--- | :--- | :--- | :--- |
| **Antigravity** | `antigravity` | Project / Global | stdio, http, sse | `jsonc` |
| **Antigravity CLI** | `antigravity-cli` | Project / Global | stdio, http, sse | `jsonc` |
| **Cline (VSCode)** | `cline` | Global | stdio, http, sse | `jsonc` |
| **Cline CLI** | `cline-cli` | Global | stdio, http, sse | `jsonc` |
| **Claude Code** | `claude-code` | Project / Global | stdio, http, sse | `jsonc` |
| **Claude Desktop** | `claude-desktop` | Global | stdio only | `jsonc` |
| **Codex** | `codex` | Project / Global | stdio, http, sse | `toml` |
| **Cursor** | `cursor` | Project / Global | stdio, http, sse | `jsonc` |
| **Gemini CLI** | `gemini-cli` | Project / Global | stdio, http, sse | `jsonc` |
| **Goose** | `goose` | Project / Global | stdio, http, sse | `yaml` |
| **GitHub Copilot CLI** | `github-copilot-cli` | Project / Global | stdio, http, sse | `jsonc` |
| **MCPorter** | `mcporter` | Project / Global | stdio, http, sse | `jsonc` |
| **OpenCode** | `opencode` | Project / Global | stdio, http, sse | `jsonc` |
| **VS Code** | `vscode` | Project / Global | stdio, http, sse | `jsonc` |
| **Zed** | `zed` | Project / Global | stdio, http, sse | `jsonc` |

---

## CLI Usage

### Interactive Wizard (Recommended)

Run `mcps` without arguments to launch the interactive terminal wizard:

```bash
mcps
```

The interactive wizard guides you through:
- **Interactive Source Selection**: npm packages, remote URLs, or local commands/Docker
- **Environment Perception**: Automatically detects installed agents in your project or global environment and pre-selects them
- **Flexible Config & Env Entry**: Support for one-by-one key-value entry (with automatic password mask for secrets) or pasting multi-line `.env` files
- **Cross-Agent Synchronization**: Inspect installed MCPs and clone/sync configurations across multiple coding agents with automatic format translation
- **Interactive Removal**: Pick and remove MCP servers from specific or all agents

---

### 1. Add / Install an MCP Server

```bash
# Install npm package MCP to detected agents in current project
mcps add @modelcontextprotocol/server-filesystem

# Install to specific agent (e.g. Cursor, VS Code)
mcps add @modelcontextprotocol/server-postgres -a cursor vscode

# Install to all supported agents globally
mcps add mcp-server-git --all -g

# Install remote MCP server (HTTP or SSE)
mcps add https://mcp.example.com/api --transport sse --header "Authorization: Bearer token"

# Install custom command with env vars
mcps add "python -m my_mcp_server" --env "API_KEY=xyz" -n my-mcp
```

### 2. List Installed MCP Servers

```bash
# List in current project
mcps list

# List globally installed servers
mcps list -g

# Output as JSON
mcps list --json
```

### 3. Remove an MCP Server

```bash
# Remove from project configs
mcps remove server-filesystem

# Remove from specific agent globally
mcps remove server-filesystem -a cursor -g
```

---

## Node API Usage

```typescript
import {
  installMcpServer,
  listInstalledMcpServers,
  removeMcpServer,
  parseMcpSource,
} from "mcps";

// Install an MCP server
const result = installMcpServer({
  source: "@modelcontextprotocol/server-github",
  agents: ["cursor", "vscode"],
  env: { GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxx" },
  global: false,
});

// List MCP servers
const servers = listInstalledMcpServers({ global: false });

// Remove an MCP server
removeMcpServer({
  name: "github",
  agents: ["cursor"],
  global: false,
});
```

---

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Typecheck
pnpm typecheck
```
