import { isPlainObject } from "./is-plain-object.ts";

export const getNestedValue = (
  source: Record<string, unknown> | undefined | null,
  dottedKey: string,
): unknown => {
  if (!source) return undefined;
  const segments = dottedKey.split(".");
  let cursor: unknown = source;

  for (const segment of segments) {
    if (!isPlainObject(cursor)) return undefined;
    cursor = cursor[segment];
  }

  return cursor;
};
