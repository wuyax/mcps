import { getNestedValue } from "../utils/get-nested-value.ts";
import { isPlainObject } from "../utils/is-plain-object.ts";
import type { McpConfigFormat } from "../types.ts";
import {
  readJsoncConfig,
  removeJsoncConfigKey,
  setJsoncNestedValue,
  writeJsonConfigAtKey,
} from "./json.ts";
import { readTomlConfig, removeTomlConfigKey, writeTomlConfigAtKey } from "./toml.ts";
import { readYamlConfig, removeYamlConfigKey, writeYamlConfigAtKey } from "./yaml.ts";

export const readConfigFile = (
  filePath: string,
  format: McpConfigFormat,
): Record<string, unknown> => {
  switch (format) {
    case "json":
    case "jsonc":
      return readJsoncConfig(filePath);
    case "yaml":
      return readYamlConfig(filePath);
    case "toml":
      return readTomlConfig(filePath);
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }
};

export const writeServerToConfigFile = (
  filePath: string,
  format: McpConfigFormat,
  dottedKey: string,
  serverName: string,
  serverConfig: unknown,
): void => {
  switch (format) {
    case "jsonc":
      setJsoncNestedValue(filePath, dottedKey, serverName, serverConfig);
      return;
    case "json":
      writeJsonConfigAtKey(filePath, dottedKey, serverName, serverConfig);
      return;
    case "yaml":
      writeYamlConfigAtKey(filePath, dottedKey, serverName, serverConfig);
      return;
    case "toml":
      writeTomlConfigAtKey(filePath, dottedKey, serverName, serverConfig);
      return;
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }
};

export const removeServerFromConfigFile = (
  filePath: string,
  format: McpConfigFormat,
  dottedKey: string,
  serverName: string,
): boolean => {
  switch (format) {
    case "json":
    case "jsonc":
      return removeJsoncConfigKey(filePath, dottedKey, serverName);
    case "yaml":
      return removeYamlConfigKey(filePath, dottedKey, serverName);
    case "toml":
      return removeTomlConfigKey(filePath, dottedKey, serverName);
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }
};

export const listServersInConfigFile = (
  filePath: string,
  format: McpConfigFormat,
  dottedKey: string,
): Record<string, unknown> => {
  const config = readConfigFile(filePath, format);
  const entries = getNestedValue(config, dottedKey);
  return isPlainObject(entries) ? entries : {};
};
