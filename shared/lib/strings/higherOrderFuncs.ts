/**
 * Returns a function that wraps a string in a given character.
 *
 * Example:
 * ```ts
 * const wrapInQuotes = wrapString('"');
 * wrapInQuotes('hello'); // "hello"
 * ```
 *
 * @param wrapChar The character to wrap the string in.
 * @returns A function that takes a string and returns the string
 * wrapped in the given character.
 */
export function wrapString(wrapChar: string) {
  return (str: string): string => {
    return `${wrapChar}${str}${wrapChar}`;
  };
}
