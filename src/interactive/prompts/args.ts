import { confirm, input } from "@inquirer/prompts";

/**
 * Parses a command-line argument string into an array of arguments,
 * respecting single and double quotes for arguments with spaces.
 */
export const parseArgsString = (rawText: string): string[] => {
  const matches = rawText.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  if (!matches) return [];

  return matches.map((arg) => {
    if (
      (arg.startsWith('"') && arg.endsWith('"')) ||
      (arg.startsWith("'") && arg.endsWith("'"))
    ) {
      return arg.slice(1, -1);
    }
    return arg;
  });
};

/**
 * Prompts the user for additional command-line arguments.
 */
export const promptArgsConfig = async (
  initialArgs: string[] = [],
): Promise<string[]> => {
  if (initialArgs.length > 0) {
    return initialArgs;
  }

  const needArgs = await confirm({
    message: "Configure command arguments (e.g. file paths, connection strings)?",
    default: false,
  });

  if (!needArgs) {
    return [];
  }

  const raw = await input({
    message: "Enter command arguments (space-separated, wrap paths with spaces in quotes):",
    validate: (val) => (val.trim() ? true : "Arguments cannot be empty"),
  });

  return parseArgsString(raw.trim());
};
