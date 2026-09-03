import { input, password, select } from "@inquirer/prompts";
import pc from "picocolors";

import { logger } from "../../utils/logger.ts";
import { promptEditorText, readMultilineTextFromTerminal } from "./multiline.ts";

const SECRET_KEY_PATTERN = /(token|key|secret|password|passwd|auth|credential)/i;

/**
 * Parses multiline .env formatted text into a key-value record.
 * Supports:
 * - Empty lines and comments (#)
 * - `export KEY=VALUE` or `KEY=VALUE`
 * - Values with `=` inside
 * - Single/double quoted values
 */
export const parseEnvText = (rawText: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const lines = rawText.split(/\r?\n/);

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("export ")) {
      line = line.slice(7).trim();
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (!key) continue;

    // Strip wrapping quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
};

/**
 * Prompts user for environment variables.
 * Offers choices:
 * 1. Skip / No env vars
 * 2. Paste multiline .env text
 * 3. Add key-value one by one (with secret mask detection)
 */
export const promptEnvConfig = async (
  initialEnv: Record<string, string> = {},
): Promise<Record<string, string>> => {
  const env: Record<string, string> = { ...initialEnv };

  const initialCount = Object.keys(env).length;
  if (initialCount > 0) {
    logger.info(`Includes ${pc.cyan(String(initialCount))} preset environment variables`);
  }

  const mode = await select({
    message: "Configure environment variables?",
    choices: [
      {
        name: "Skip / None",
        value: "skip",
      },
      {
        name: "Paste multiline .env text into terminal",
        value: "paste",
      },
      {
        name: "Open in system default editor ($EDITOR)",
        value: "editor",
      },
      {
        name: "Enter key-value pairs one by one",
        value: "manual",
      },
    ],
  });

  if (mode === "skip") {
    return env;
  }

  if (mode === "paste" || mode === "editor") {
    const pasted =
      mode === "editor"
        ? await promptEditorText({
            message: "Paste or edit environment variables in editor, then save and exit:",
            postfix: ".env",
          })
        : await readMultilineTextFromTerminal("Paste .env formatted content (multiline supported):");

    const parsed = parseEnvText(pasted);
    const count = Object.keys(parsed).length;

    if (count === 0) {
      logger.warn("No valid KEY=VALUE pairs recognized");
    } else {
      Object.assign(env, parsed);
      logger.success(`Successfully parsed ${pc.cyan(String(count))} environment variables:`);
      for (const [k, v] of Object.entries(parsed)) {
        const masked =
          SECRET_KEY_PATTERN.test(k) && v.length > 4
            ? `${v.slice(0, 2)}***${v.slice(-2)}`
            : v;
        console.log(`  ${pc.bold(k)}=${pc.dim(masked)}`);
      }
    }
    return env;
  }

  // Manual entry loop
  logger.info("Entering environment variables (leave key empty and press enter to finish):");
  while (true) {
    const key = await input({
      message: "Variable name (Key, leave empty to finish):",
      validate: (val) => {
        const trimmed = val.trim();
        if (!trimmed) return true;
        if (/\s/.test(trimmed)) return "Variable name cannot contain spaces";
        return true;
      },
    });

    const trimmedKey = key.trim();
    if (!trimmedKey) break;

    const isSecret = SECRET_KEY_PATTERN.test(trimmedKey);
    let val: string;

    if (isSecret) {
      val = await password({
        message: `Value for (${trimmedKey}) [secret masked]:`,
        mask: "*",
      });
    } else {
      val = await input({
        message: `Value for (${trimmedKey}):`,
      });
    }

    env[trimmedKey] = val;
    logger.success(`Added: ${pc.cyan(trimmedKey)}`);
  }

  return env;
};
