import { confirm, input, password, select } from "@inquirer/prompts";
import pc from "picocolors";

import { logger } from "../../utils/logger.ts";
import { promptEditorText, readMultilineTextFromTerminal } from "./multiline.ts";

export interface PromptEditKeyValueOptions {
  title: string;
  itemNoun: string;
  itemsNoun: string;
  maskValue: (key: string, value: string) => string;
  isSecretKey: (key: string) => boolean;
  formatText: (items: Record<string, string>) => string;
  parseText: (text: string) => Record<string, string>;
  editorPostfix?: string;
  editorMessage: string;
  pasteMessage: string;
  keyPromptMessage: string;
  valuePromptMessage: string;
  separator: "=" | ":";
}

/**
 * Generic reusable interactive key-value editing loop supporting:
 * - Editor launch with pre-filled content ($EDITOR)
 * - Single item upsert (with secret detection & password masking)
 * - Single item deletion
 * - Multiline paste (with merge or replace choices)
 * - Clear all items
 */
export const promptEditKeyValueConfig = async (
  currentItems: Record<string, string> = {},
  options: PromptEditKeyValueOptions,
): Promise<Record<string, string>> => {
  let items: Record<string, string> = { ...currentItems };

  while (true) {
    const keys = Object.keys(items);
    console.log();
    if (keys.length === 0) {
      console.log(pc.dim(`  No ${options.itemsNoun} configured.`));
    } else {
      console.log(pc.cyan(pc.bold(`  Configured ${options.title} (${keys.length}):`)));
      for (const [k, v] of Object.entries(items)) {
        const sep = options.separator === "=" ? "=" : ": ";
        console.log(`    ${pc.bold(k)}${sep}${pc.dim(options.maskValue(k, v))}`);
      }
    }
    console.log();

    const choice = await select({
      message: `Manage ${options.itemsNoun}:`,
      choices: [
        {
          name: "Open in system default editor ($EDITOR)",
          value: "editor",
        },
        {
          name: `Add or modify a ${options.itemNoun}`,
          value: "upsert",
        },
        ...(keys.length > 0
          ? [
              {
                name: `Delete a ${options.itemNoun}`,
                value: "delete",
              },
            ]
          : []),
        {
          name: `Paste multiline ${options.itemsNoun} into terminal`,
          value: "paste",
        },
        ...(keys.length > 0
          ? [
              {
                name: `Clear all ${options.itemsNoun}`,
                value: "clear",
              },
            ]
          : []),
        {
          name: `Done (finish editing ${options.itemsNoun})`,
          value: "done",
        },
      ],
    });

    if (choice === "done") {
      return items;
    }

    if (choice === "editor") {
      const defaultText = options.formatText(items);
      const text = await promptEditorText({
        message: options.editorMessage,
        postfix: options.editorPostfix,
        defaultText,
      });
      const parsed = options.parseText(text);
      items = parsed;
      logger.success(`${options.title} updated (${Object.keys(items).length} total)`);
    } else if (choice === "upsert") {
      const key = await input({
        message: options.keyPromptMessage,
        validate: (val) => {
          const trimmed = val.trim();
          if (!trimmed) return `${options.itemNoun} name cannot be empty`;
          if (/\s/.test(trimmed)) return `${options.itemNoun} name cannot contain spaces`;
          return true;
        },
      });
      const trimmedKey = key.trim();
      const existingVal = items[trimmedKey];
      const isSecret = options.isSecretKey(trimmedKey);

      let newVal: string;
      if (isSecret) {
        newVal = await password({
          message:
            existingVal !== undefined
              ? `New value for (${trimmedKey}) [leave empty to keep current]:`
              : `${options.valuePromptMessage} for (${trimmedKey}) [sensitive content masked]:`,
          mask: "*",
        });
        if (existingVal !== undefined && newVal === "") {
          newVal = existingVal;
        }
      } else {
        newVal = await input({
          message: `${options.valuePromptMessage} for (${trimmedKey}):`,
          default: existingVal,
        });
      }

      items[trimmedKey] = newVal;
      logger.success(`${existingVal !== undefined ? "Updated" : "Added"}: ${pc.cyan(trimmedKey)}`);
    } else if (choice === "delete") {
      const toDelete = await select({
        message: `Select ${options.itemNoun} to delete:`,
        choices: [
          ...keys.map((k) => ({ name: k, value: k })),
          { name: "Cancel", value: "__cancel__" },
        ],
      });
      if (toDelete !== "__cancel__") {
        delete items[toDelete];
        logger.success(`Deleted: ${pc.cyan(toDelete)}`);
      }
    } else if (choice === "paste") {
      const pasted = await readMultilineTextFromTerminal(options.pasteMessage);
      const parsed = options.parseText(pasted);
      const count = Object.keys(parsed).length;
      if (count === 0) {
        logger.warn(`No valid ${options.itemsNoun} recognized`);
      } else {
        if (keys.length > 0) {
          const pasteMode = await select({
            message: `How to apply pasted ${options.itemsNoun}?`,
            choices: [
              { name: `Merge with existing ${options.itemsNoun}`, value: "merge" },
              { name: `Replace all existing ${options.itemsNoun}`, value: "replace" },
            ],
          });
          if (pasteMode === "replace") {
            items = parsed;
          } else {
            Object.assign(items, parsed);
          }
        } else {
          items = parsed;
        }
        logger.success(`Successfully applied ${pc.cyan(String(count))} ${options.itemsNoun}`);
      }
    } else if (choice === "clear") {
      const confirmClear = await confirm({
        message: `Are you sure you want to clear all ${options.itemsNoun}?`,
        default: false,
      });
      if (confirmClear) {
        items = {};
        logger.success(`Cleared all ${options.itemsNoun}`);
      }
    }
  }
};
