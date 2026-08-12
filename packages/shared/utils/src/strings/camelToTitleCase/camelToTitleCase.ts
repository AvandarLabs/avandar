import { capitalize } from "@utils/strings/capitalize/capitalize.ts";

/**
 * Converts camelCase to title case.
 * @param str The string to convert.
 * @param options Options for the conversion.
 * @param options.capitalizeFirstLetter Whether to capitalize the first letter
 *   of the string. Defaults to `true`.
 * @returns The converted string.
 */
export function camelToTitleCase(
  str: string,
  options: { capitalizeFirstLetter?: boolean } = {},
): string {
  const { capitalizeFirstLetter = true } = options;
  const processedStr = str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  return capitalizeFirstLetter ? capitalize(processedStr) : processedStr;
}
