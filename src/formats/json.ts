import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { applyEdits, modify, parse as parseJsonc } from "jsonc-parser";

import { ensureParentDir } from "../utils/ensure-parent-dir.ts";
import { isPlainObject } from "../utils/is-plain-object.ts";
import { setNestedValue } from "../utils/set-nested-value.ts";
import { walkNestedObject } from "../utils/walk-nested-object.ts";
import { DEFAULT_JSON_INDENT_SPACES } from "../constants.ts";

const JSONC_FORMATTING = {
  insertSpaces: true,
  tabSize: DEFAULT_JSON_INDENT_SPACES,
  eol: "\n",
} as const;

const readFileOrEmpty = (filePath: string): string =>
  existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";

const writeWithTrailingNewline = (filePath: string, contents: string): void => {
  writeFileSync(filePath, contents.endsWith("\n") ? contents : `${contents}\n`, "utf-8");
};

export const readJsoncConfig = (filePath: string): Record<string, unknown> => {
  const raw = readFileOrEmpty(filePath);
  if (!raw.trim()) return {};

  const parsed = parseJsonc(raw);
  return isPlainObject(parsed) ? parsed : {};
};

export const setJsoncNestedValue = (
  filePath: string,
  dottedKey: string,
  serverName: string,
  serverConfig: unknown,
): void => {
  ensureParentDir(filePath);
  const existingText = readFileOrEmpty(filePath);
  const sourceText = existingText.trim() ? existingText : "{}";

  const path = [...dottedKey.split("."), serverName];
  const edits = modify(sourceText, path, serverConfig, {
    formattingOptions: JSONC_FORMATTING,
  });
  writeWithTrailingNewline(filePath, applyEdits(sourceText, edits));
};

export const writeJsonConfigAtKey = (
  filePath: string,
  dottedKey: string,
  serverName: string,
  serverConfig: unknown,
): void => {
  ensureParentDir(filePath);
  const existing = readJsoncConfig(filePath);
  const existingServers = walkNestedObject(existing, dottedKey.split("."));

  const servers: Record<string, unknown> = existingServers ? { ...existingServers } : {};
  servers[serverName] = serverConfig;

  setNestedValue(existing, dottedKey, servers);
  writeFileSync(
    filePath,
    `${JSON.stringify(existing, null, DEFAULT_JSON_INDENT_SPACES)}\n`,
    "utf-8",
  );
};

export const removeJsoncConfigKey = (
  filePath: string,
  dottedKey: string,
  serverName: string,
): boolean => {
  if (!existsSync(filePath)) return false;
  const sourceText = readFileSync(filePath, "utf-8");
  if (!sourceText.trim()) return false;

  const existing = readJsoncConfig(filePath);
  const segments = dottedKey.split(".");
  const parentObject = walkNestedObject(existing, segments);
  if (!parentObject || !(serverName in parentObject)) return false;

  const path = [...segments, serverName];
  const edits = modify(sourceText, path, undefined, {
    formattingOptions: JSONC_FORMATTING,
  });
  if (edits.length === 0) return false;

  writeWithTrailingNewline(filePath, applyEdits(sourceText, edits));
  return true;
};
