// ============================================================================
// @wuyax/mcps/interactive
// Interactive terminal UI wizards and Inquirer prompts for MCP orchestration.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Linked Checkbox & Choice Builders
// ---------------------------------------------------------------------------
export {
  linkedCheckbox,
  type LinkedCheckboxConfig,
  type LinkedCheckboxPrompt,
  type LinkedCheckboxTheme,
  type LinkedChoice,
  type NormalizedLinkedChoice,
} from "./prompts/linked-checkbox.ts";

export {
  buildLinkedAgentChoices,
  type BuildLinkedAgentChoicesOptions,
} from "./utils/build-linked-agent-choices.ts";

// ---------------------------------------------------------------------------
// 2. Scope & Target Agent Selection Prompts
// ---------------------------------------------------------------------------
export {
  promptScope,
  type PromptScopeOptions,
} from "./prompts/scope.ts";

export {
  promptScopeAndAgents,
  type PromptScopeAndAgentsOptions,
  type ScopeAndAgentsResult,
} from "./prompts/agents.ts";

// ---------------------------------------------------------------------------
// 3. Configuration Editing Prompts
// ---------------------------------------------------------------------------
export {
  formatEnvText,
  parseEnvText,
  promptEditEnvConfig,
  promptEnvConfig,
} from "./prompts/env.ts";

export {
  formatHeadersText,
  parseHeadersText,
  promptEditHeadersConfig,
  promptHeadersConfig,
} from "./prompts/headers.ts";

export {
  formatArgsString,
  parseArgsString,
  promptArgsConfig,
  promptEditArgs,
} from "./prompts/args.ts";

export {
  promptEditKeyValueConfig,
  type PromptEditKeyValueOptions,
} from "./prompts/kv.ts";

export {
  promptEditorText,
  readMultilineTextFromTerminal,
  type ReadMultilineOptions,
} from "./prompts/multiline.ts";

export {
  promptSwitchServerType,
  type EditServerConfigOptions,
} from "./wizard-manage.ts";

// ---------------------------------------------------------------------------
// 4. End-to-End Interactive Wizards
// ---------------------------------------------------------------------------
export { mainMenu } from "./main-menu.ts";
export { wizardAdd, type WizardAddOptions } from "./wizard-add.ts";
export { wizardManage, type WizardManageOptions } from "./wizard-manage.ts";
export { wizardRemove, type WizardRemoveOptions } from "./wizard-remove.ts";
