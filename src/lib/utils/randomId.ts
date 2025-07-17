/**
 * Generates a random ID.
 *
 * **WARNING**: This is not a secure random ID generator. Do not
 * use this in React keys or for data IDs.
 *
 * **Intended usage**: for DOM ids, for example when you need to link
 * a label to an input element, and you need a unique id to avoid
 * duplicates with other input elements.
 *
 * @param prefix - The prefix to use for the ID.
 * @returns A random ID.
 */
export function randomId(prefix = "avandar-"): string {
  return `${prefix}${Math.random().toString(36).substring(2, 11)}`;
}
