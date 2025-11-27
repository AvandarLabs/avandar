/**
 * Converts a string to PascalCase.
 *
 * Any non-alphanumeric characters are removed.
 *
 * Non-alphanumeric characters are treated as separators, therefore
 * something like "t@st" will be converted to "TSt" because the @ is treated
 * as a separator.
 *
 * @param str - The string to convert to PascalCase.
 * @returns The string converted to PascalCase.
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
}
