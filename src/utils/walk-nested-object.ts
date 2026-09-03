import { isPlainObject } from "./is-plain-object.ts";

export const walkNestedObject = (
  root: Record<string, unknown>,
  segments: readonly string[],
): Record<string, unknown> | undefined => {
  let cursor: unknown = root;
  for (const segment of segments) {
    if (!isPlainObject(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return isPlainObject(cursor) ? cursor : undefined;
};
