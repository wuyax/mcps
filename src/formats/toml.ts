import { existsSync, readFileSync, writeFileSync } from "node:fs";

import TOML from "@iarna/toml";

import { deleteNestedValue } from "../utils/delete-nested-value.ts";
import { ensureParentDir } from "../utils/ensure-parent-dir.ts";
import { isPlainObject } from "../utils/is-plain-object.ts";
import { setNestedValue } from "../utils/set-nested-value.ts";
import { walkNestedObject } from "../utils/walk-nested-object.ts";

const toTomlJsonMap = (value: Record<string, unknown>): TOML.JsonMap =>
  JSON.parse(JSON.stringify(value)) as TOML.JsonMap;

export const readTomlConfig = (filePath: string): Record<string, unknown> => {
  if (!existsSync(filePath)) return {};
  const raw = readFileSync(filePath, "utf-8");
  if (!raw.trim()) return {};
  const parsed = TOML.parse(raw);
  return isPlainObject(parsed) ? parsed : {};
};

export const writeTomlConfigAtKey = (
  filePath: string,
  dottedKey: string,
  serverName: string,
  serverConfig: unknown,
): void => {
  ensureParentDir(filePath);
  const existing = readTomlConfig(filePath);
  const existingServers = walkNestedObject(existing, dottedKey.split("."));

  const servers: Record<string, unknown> = existingServers ? { ...existingServers } : {};
  servers[serverName] = serverConfig;

  setNestedValue(existing, dottedKey, servers);
  writeFileSync(filePath, TOML.stringify(toTomlJsonMap(existing)), "utf-8");
};

export const removeTomlConfigKey = (
  filePath: string,
  dottedKey: string,
  serverName: string,
): boolean => {
  if (!existsSync(filePath)) return false;
  const existing = readTomlConfig(filePath);
  const didRemove = deleteNestedValue(existing, `${dottedKey}.${serverName}`);
  if (didRemove) writeFileSync(filePath, TOML.stringify(toTomlJsonMap(existing)), "utf-8");
  return didRemove;
};
