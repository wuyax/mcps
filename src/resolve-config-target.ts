export { resolveMcpConfigTarget, type McpConfigTarget } from "./config-store.ts";

export type ResolveMcpConfigTargetOptions = {
  global?: boolean;
  cwd?: string;
};
