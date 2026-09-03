import {
  COMMON_TLD_LABELS,
  GENERIC_HOST_PREFIXES,
  KNOWN_COMMAND_RUNNERS,
  MCP_DEFAULT_SERVER_NAME,
  PACKAGE_NAME_PREFIX_STRIP,
  PACKAGE_NAME_SUFFIX_STRIP,
  SCRIPT_EXTENSION_REGEX,
} from "./constants.ts";
import type { ParsedMcpSource } from "./types.ts";

const REMOTE_URL_REGEX = /^https?:\/\//i;
const HAS_WHITESPACE_REGEX = /\s/;
const PACKAGE_NAME_REGEX = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(?:@[^\s]+)?$/;
const PATH_SEPARATOR_REGEX = /[/\\]/;

const stripVersionSuffix = (input: string): string => {
  if (input.startsWith("@")) {
    const secondAtIndex = input.indexOf("@", 1);
    if (secondAtIndex > 0) return input.slice(0, secondAtIndex);
    return input;
  }
  const atIndex = input.lastIndexOf("@");
  if (atIndex > 0) return input.slice(0, atIndex);
  return input;
};

const stripScopePrefix = (input: string): string => {
  if (!input.startsWith("@") || !input.includes("/")) return input;
  const parts = input.split("/");
  return parts[1] || input;
};

const stripPathPrefix = (input: string): string => {
  if (!PATH_SEPARATOR_REGEX.test(input)) return input;
  const segments = input.split(PATH_SEPARATOR_REGEX);
  const basename = segments[segments.length - 1];
  return basename || input;
};

export const extractPackageName = (input: string): string => {
  let name = stripVersionSuffix(input);
  name = stripScopePrefix(name);
  name = stripPathPrefix(name);
  name = name.replace(SCRIPT_EXTENSION_REGEX, "");

  for (const prefix of PACKAGE_NAME_PREFIX_STRIP) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }
  for (const suffix of PACKAGE_NAME_SUFFIX_STRIP) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }

  return name || MCP_DEFAULT_SERVER_NAME;
};

const inferNameFromUrl = (input: string): string => {
  try {
    const url = new URL(input);
    const host = url.hostname;
    const labels = host.split(".").filter((segment) => segment.length > 0);
    if (labels.length === 0) return MCP_DEFAULT_SERVER_NAME;

    const meaningfulLabels = labels.filter((label) => {
      const lower = label.toLowerCase();
      if (COMMON_TLD_LABELS.has(lower)) return false;
      if (GENERIC_HOST_PREFIXES.has(lower)) return false;
      return true;
    });

    if (meaningfulLabels.length > 0) return meaningfulLabels[0];
    if (labels.length >= 2) return labels[labels.length - 2];
    return labels[labels.length - 1] || MCP_DEFAULT_SERVER_NAME;
  } catch {
    return MCP_DEFAULT_SERVER_NAME;
  }
};

const inferNameFromCommand = (command: string): string => {
  const tokens = command.trim().split(/\s+/);
  const runnerBase = tokens[0]?.split(PATH_SEPARATOR_REGEX).pop() ?? "";
  const startIndex = KNOWN_COMMAND_RUNNERS.has(runnerBase) ? 1 : 0;

  for (let tokenIndex = startIndex; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex];
    if (!token || token.startsWith("-")) continue;
    return extractPackageName(token);
  }

  const firstNonFlag = tokens.find((token) => !token.startsWith("-"));
  return firstNonFlag ? extractPackageName(firstNonFlag) : MCP_DEFAULT_SERVER_NAME;
};

export const parseMcpSource = (input: string): ParsedMcpSource => {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new Error(
      "Invalid MCP source: input is empty. Expected a remote URL, an npm package, or a command line.",
    );
  }

  if (REMOTE_URL_REGEX.test(trimmed)) {
    return {
      type: "remote",
      value: trimmed,
      inferredName: inferNameFromUrl(trimmed),
    };
  }

  if (HAS_WHITESPACE_REGEX.test(trimmed)) {
    return {
      type: "command",
      value: trimmed,
      inferredName: inferNameFromCommand(trimmed),
    };
  }

  if (PACKAGE_NAME_REGEX.test(trimmed)) {
    return {
      type: "package",
      value: trimmed,
      inferredName: extractPackageName(trimmed),
    };
  }

  return {
    type: "command",
    value: trimmed,
    inferredName: inferNameFromCommand(trimmed),
  };
};

export const isRemoteMcpSource = (parsed: ParsedMcpSource): boolean => parsed.type === "remote";
