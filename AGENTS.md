# AGENTS.md

Repository guidelines, architecture seams, and coding standards for `mcps`.

## Architecture & Seams

- **CLI Commands (`src/cli/`)**: Built with `commander`. Every command must support non-interactive usage with full arguments/flags (for CI/scripts) and gracefully fall back to interactive wizards in TTY mode when arguments are missing.
- **Interactive Wizards (`src/interactive/`)**: Terminal UI built with `@inquirer/prompts`. Catch `ExitPromptError` for clean Ctrl+C exits. Keep prompt utilities modular under `src/interactive/prompts/`.
- **Core Orchestration (`src/install-mcp-server.ts`, `src/installer.ts`, `src/remove.ts`, `src/list.ts`)**: Pure functions orchestrating agent detection, config transformation, and persistence.
- **Agent Config Store (`src/config-store.ts`)**: Unified persistence deep module encapsulating path resolution, existence checking, and multi-format adapters behind a pluggable storage seam.
- **Target Agent Resolver (`src/resolve-target-agents.ts`)**: Deep module resolving candidate agents from CLI arguments, wildcards, auto-detection, and transport capability constraints.
- **Format Adapters (`src/formats/`)**: Isolated handlers for JSON, JSONC, YAML, and TOML reading and writing.
- **Transforms (`src/transforms/`)**: Unified Server Config Transform deep module mapping standard `McpServerConfig` to agent-specific config shapes via declarative dialects.

## Coding Standards

### 1. TypeScript & Modules
- **ESM Imports**: Use explicit `.ts` extension in relative imports (`import { foo } from "./foo.ts"`).
- **Strict Typing**: Avoid `any`. Use `unknown` paired with type guards or schemas when parsing external files or unvalidated configs.
- **Data Encapsulation**: Bundle paired parameters (`{ cwd?: string; global?: boolean }`) into reusable types rather than spreading unbundled parameters.

### 2. CLI & Interactive Experience
- **Dual Mode (CLI + TTY)**: Commands must check `process.stdin.isTTY` and options like `--yes` before prompting. Missing arguments in non-TTY mode must log an error and exit with code 1 without hanging.
- **Security by Default**: Mask sensitive inputs (tokens, keys, secrets, passwords) using password prompts or token redaction.
- **Uniform Feedback**: Use `src/utils/logger.ts` for user messages (`logger.info`, `logger.success`, `logger.warn`, `logger.error`) and `picocolors` for styling.
- **Language & Tone**: All user-facing text, CLI prompts, options, logs, error messages, and documentation must be written strictly in English.
- **No Emojis**: Do not use emojis anywhere in the codebase (including CLI output, logs, prompts, comments, and documentation). Use clean text, standard ASCII indicators, or `picocolors` styling instead.

### 3. Error Handling
- Use `toErrorMessage(error)` from `src/utils/to-error-message.ts` when catching unknown errors to ensure readable diagnostic output.
- Avoid throwing unhandled exceptions across CLI boundaries; set `process.exitCode = 1` or exit cleanly.

## Quality Gates & Verification

Every change must pass all three gates before completion:
1. `pnpm run typecheck` — Type check with TypeScript.
2. `pnpm test` — Run all unit and integration tests with vitest.
3. `pnpm build` — Build ESM/CJS bundles with tsup.
