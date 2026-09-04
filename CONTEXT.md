# mcps Context

Orchestrates the configuration, installation, removal, and listing of Model Context Protocol (MCP) servers across various coding AI agents.

## Language

**Agent**:
An AI coding assistant, IDE, or CLI tool that consumes MCP servers (e.g., Cursor, VSCode, Cline, Claude Code).
_Avoid_: Client, tool, plugin, consumer

**Server Config**:
The normalized domain model describing an MCP server, specifying its transport (stdio, http, sse), command, args, environment variables, URL, and headers.
_Avoid_: Server definition, server payload, spec

**Server Config Dialect**:
A declarative profile describing the structural expectations and field conventions used by an Agent when persisting an MCP server into its native configuration file.
_Avoid_: Transform schema, config template, adapter type

**Scope**:
The target visibility level for an Agent's configuration, either global (user-level home directory) or project-level (current working directory).
_Avoid_: Target mode, installation level

**Agent Config Store**:
A deep module responsible for resolving configuration targets, reading, writing, removing, and querying MCP server configurations across various Agent file formats (JSONC, YAML, TOML).
_Avoid_: Config manager, config service, persistence layer
