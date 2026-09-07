export const parseKeyValueList = (
  entries: string[] | undefined,
  separator: string,
): Record<string, string> => {
  if (!entries || entries.length === 0) return {};
  const result: Record<string, string> = {};
  for (const entry of entries) {
    const splitIndex = entry.indexOf(separator);
    if (splitIndex === -1) {
      throw new Error(`Invalid entry "${entry}": expected "${separator}" separator`);
    }
    const key = entry.slice(0, splitIndex).trim();
    const value = entry.slice(splitIndex + separator.length).trim();
    if (!key) throw new Error(`Invalid entry "${entry}": empty key`);
    result[key] = value;
  }
  return result;
};
