import { isPlainObject } from "./is-plain-object.ts";

const DANGEROUS_KEY_SEGMENTS: ReadonlySet<string> = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

export const deleteNestedValue = (
  target: Record<string, unknown> | undefined | null,
  dottedKey: string,
): boolean => {
  if (!target) return false;
  const segments = dottedKey.split(".");
  if (segments.some((segment) => DANGEROUS_KEY_SEGMENTS.has(segment))) return false;

  let cursor: Record<string, unknown> = target;

  for (let segmentIndex = 0; segmentIndex < segments.length - 1; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    const existing = cursor[segment];
    if (!isPlainObject(existing)) return false;
    cursor = existing;
  }

  const lastSegment = segments[segments.length - 1];
  if (!(lastSegment in cursor)) return false;
  delete cursor[lastSegment];
  return true;
};
