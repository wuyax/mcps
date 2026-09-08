import pc from "picocolors";

import type { McpAgentType } from "../types.ts";
import { logger } from "./logger.ts";

export type CoHostedFeedbackKind = "configured" | "affected";

/**
 * Formats a trailing highlight badge for interactive wizards.
 * Example: " (co-configured: a, b)" or " (co-affected: a, b)"
 */
export const formatCoHostedBadge = (
  kind: CoHostedFeedbackKind,
  agents?: McpAgentType[],
): string => {
  if (!agents || agents.length === 0) return "";
  const label = kind === "configured" ? "co-configured" : "co-affected";
  return ` ${pc.yellow(`(${label}: ${agents.join(", ")})`)}`;
};

/**
 * Logs an indented notice for non-interactive CLI commands.
 * Example: "  Note: Also configured for co-hosted agent(s): ..."
 *          "  Note: Also affects co-hosted agent(s): ..."
 */
export const logCoHostedNotice = (
  kind: CoHostedFeedbackKind,
  agents?: McpAgentType[],
): void => {
  if (!agents || agents.length === 0) return;
  const actionText = kind === "configured" ? "Also configured for" : "Also affects";
  logger.info(
    `  ${pc.dim("Note:")} ${actionText} co-hosted agent(s): ${pc.yellow(agents.join(", "))}`,
  );
};
