/**
 * Prefixes a string with a given prefix.
 * @param prefixStr The prefix to add.
 * @param str The string to prefix.
 * @returns The prefixed string.
 */
export function prefix<Prefix extends string, T extends string>(
  prefixStr: Prefix,
  str: T,
): `${Prefix}${T}` {
  return `${prefixStr}${str}`;
}
