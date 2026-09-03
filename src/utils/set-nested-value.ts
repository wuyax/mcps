import { isPlainObject } from "./is-plain-object.ts";

const DANGEROUS_KEY_SEGMENTS: ReadonlySet<string> = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

const assertSafeSegment = (segment: string): void => {
  if (DANGEROUS_KEY_SEGMENTS.has(segment)) {
    throw new Error(`Refusing to write to unsafe key segment "${segment}"`);
  }
};

export const setNestedValue = (
  target: Record<string, unknown>,
  dottedKey: string,
  value: unknown,
): void => {
  const segments = dottedKey.split(".");
  let cursor: Record<string, unknown> = target;

  for (let segmentIndex = 0; segmentIndex < segments.length - 1; segmentIndex += 1) {
    const segment = segments[segmentIndex];
    assertSafeSegment(segment);
    const existing = cursor[segment];
    if (isPlainObject(existing)) {
      cursor = existing;
      continue;
    }
    const next: Record<string, unknown> = {};
    cursor[segment] = next;
    cursor = next;
  }

  const finalSegment = segments[segments.length - 1];
  assertSafeSegment(finalSegment);
  cursor[finalSegment] = value;
};
