import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { deleteNestedValue } from "../utils/delete-nested-value.ts";
import { ensureParentDir } from "../utils/ensure-parent-dir.ts";
import { isPlainObject } from "../utils/is-plain-object.ts";
import { setNestedValue } from "../utils/set-nested-value.ts";
import { walkNestedObject } from "../utils/walk-nested-object.ts";

export const readYamlConfig = (filePath: string): Record<string, unknown> => {
  if (!existsSync(filePath)) return {};
  const raw = readFileSync(filePath, "utf-8");
  if (!raw.trim()) return {};

  const parsed = parseYaml(raw);
  return isPlainObject(parsed) ? parsed : {};
};

export const writeYamlConfigAtKey = (
  filePath: string,
  dottedKey: string,
  serverName: string,
  serverConfig: unknown,
): void => {
  ensureParentDir(filePath);
  const existing = readYamlConfig(filePath);
  const existingServers = walkNestedObject(existing, dottedKey.split("."));

  const servers: Record<string, unknown> = existingServers ? { ...existingServers } : {};
  servers[serverName] = serverConfig;

  setNestedValue(existing, dottedKey, servers);
  writeFileSync(filePath, stringifyYaml(existing), "utf-8");
};

export const removeYamlConfigKey = (
  filePath: string,
  dottedKey: string,
  serverName: string,
): boolean => {
  if (!existsSync(filePath)) return false;
  const existing = readYamlConfig(filePath);
  const didRemove = deleteNestedValue(existing, `${dottedKey}.${serverName}`);
  if (didRemove) writeFileSync(filePath, stringifyYaml(existing), "utf-8");
  return didRemove;
};
