import { input, password, select } from "@inquirer/prompts";
import pc from "picocolors";

import { logger } from "../../utils/logger.ts";
import { promptEditorText, readMultilineTextFromTerminal } from "./multiline.ts";

const SECRET_HEADER_PATTERN = /(authorization|token|key|secret|auth)/i;

/**
 * Parses multiline HTTP headers text (Key: Value or Key=Value) into a Record<string, string>.
 */
export const parseHeadersText = (rawText: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const lines = rawText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // Split on first ':' or '='
    const colonIndex = line.indexOf(":");
    const equalIndex = line.indexOf("=");
    let splitIndex = -1;

    if (colonIndex !== -1 && equalIndex !== -1) {
      splitIndex = Math.min(colonIndex, equalIndex);
    } else if (colonIndex !== -1) {
      splitIndex = colonIndex;
    } else {
      splitIndex = equalIndex;
    }

    if (splitIndex === -1) continue;

    const key = line.slice(0, splitIndex).trim();
    let value = line.slice(splitIndex + 1).trim();

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
 * Interactively prompts user for HTTP headers.
 */
export const promptHeadersConfig = async (
  initialHeaders: Record<string, string> = {},
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { ...initialHeaders };

  const mode = await select({
    message: "Select HTTP headers configuration method:",
    choices: [
      {
        name: "Paste multiline headers into terminal (Key: Value format)",
        value: "paste",
      },
      {
        name: "Open in system default editor ($EDITOR)",
        value: "editor",
      },
      {
        name: "Enter headers one by one (e.g. Authorization: Bearer ...)",
        value: "manual",
      },
      {
        name: "Skip / None",
        value: "skip",
      },
    ],
  });

  if (mode === "skip") {
    return headers;
  }

  if (mode === "paste" || mode === "editor") {
    const pasted =
      mode === "editor"
        ? await promptEditorText({
            message: "Paste or edit HTTP headers in editor, then save and exit:",
          })
        : await readMultilineTextFromTerminal(
            "Paste HTTP headers content (multiline supported, e.g. Authorization: Bearer ...):",
          );

    const parsed = parseHeadersText(pasted);
    const count = Object.keys(parsed).length;

    if (count === 0) {
      logger.warn("No valid Key: Value pairs recognized");
    } else {
      Object.assign(headers, parsed);
      logger.success(`Successfully parsed ${pc.cyan(String(count))} headers:`);
      for (const [k, v] of Object.entries(parsed)) {
        const masked =
          SECRET_HEADER_PATTERN.test(k) && v.length > 8
            ? `${v.slice(0, 4)}***${v.slice(-3)}`
            : v;
        console.log(`  ${pc.bold(k)}: ${pc.dim(masked)}`);
      }
    }
    return headers;
  }

  // Manual entry loop
  logger.info("Entering HTTP headers (leave header name empty and press enter to finish):");
  while (true) {
    const name = await input({
      message: "Header name (e.g. Authorization, leave empty to finish):",
      validate: (val) => {
        const trimmed = val.trim();
        if (!trimmed) return true;
        if (/\s/.test(trimmed)) return "Header name cannot contain spaces";
        return true;
      },
    });

    const trimmedName = name.trim();
    if (!trimmedName) break;

    const isSecret = SECRET_HEADER_PATTERN.test(trimmedName);
    let val: string;

    if (isSecret) {
      val = await password({
        message: `Header value for (${trimmedName}) [sensitive content masked]:`,
        mask: "*",
      });
    } else {
      val = await input({
        message: `Header value for (${trimmedName}):`,
      });
    }

    headers[trimmedName] = val;
    logger.success(`Added: ${pc.cyan(trimmedName)}`);
  }

  return headers;
};
