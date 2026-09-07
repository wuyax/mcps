export const SECRET_KEY_PATTERN = /(token|key|secret|password|passwd|auth|credential)/i;

/**
 * Masks sensitive values for secure CLI display.
 */
export const maskSecretValue = (key: string, value: string): string => {
  if (!SECRET_KEY_PATTERN.test(key) || value.length <= 4) {
    return value;
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

export const SECRET_HEADER_PATTERN = /(authorization|token|key|secret|auth)/i;

/**
 * Masks sensitive HTTP header values for secure CLI display.
 */
export const maskSecretHeader = (key: string, value: string): string => {
  if (!SECRET_HEADER_PATTERN.test(key) || value.length <= 8) {
    return value;
  }
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
};
