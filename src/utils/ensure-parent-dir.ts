import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const ensureParentDir = (filePath: string): void => {
  const parentDir = dirname(filePath);
  if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
};
