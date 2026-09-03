import { createInterface } from "node:readline";
import { editor } from "@inquirer/prompts";
import pc from "picocolors";

export interface ReadMultilineOptions {
  message: string;
  defaultText?: string;
  postfix?: string;
}

/**
 * Reliably reads multiline text from terminal stdin without premature line truncation.
 * Completes when user enters empty line after content or types 'END'.
 */
export const readMultilineTextFromTerminal = async (
  message: string,
  endHint = "When done pasting, enter END on a new line or press Enter twice to finish",
): Promise<string> => {
  console.log(pc.cyan(`\n${message}`));
  console.log(pc.dim(`  (Hint: ${endHint})\n`));

  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const lines: string[] = [];
    let consecutiveEmpty = 0;

    const cleanup = () => {
      rl.removeAllListeners();
      rl.close();
    };

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed === "END") {
        cleanup();
        resolve(lines.join("\n"));
        return;
      }

      if (line === "") {
        consecutiveEmpty++;
        // If content already pasted/entered, an empty line triggers completion
        if (lines.length > 0) {
          cleanup();
          resolve(lines.join("\n"));
          return;
        }
        if (consecutiveEmpty >= 2) {
          cleanup();
          resolve("");
          return;
        }
      } else {
        consecutiveEmpty = 0;
        lines.push(line);
      }
    });

    rl.on("close", () => {
      resolve(lines.join("\n"));
    });
  });
};

/**
 * Opens system $EDITOR (or nano/vi) to edit/paste multiline text with fallback.
 */
export const promptEditorText = async (
  options: ReadMultilineOptions,
): Promise<string> => {
  try {
    return await editor({
      message: options.message,
      default: options.defaultText ?? "",
      postfix: options.postfix,
    });
  } catch {
    return readMultilineTextFromTerminal(options.message);
  }
};
