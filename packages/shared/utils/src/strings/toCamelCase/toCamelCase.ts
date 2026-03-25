import type { CamelCase } from "@utils/types/utilities.types.ts";

/**
 * Converts a string to camelCase.
 *
 * Any character that is not a letter or digit is treated as a separator and
 * removed. Consecutive separators are collapsed. Separator runs split the
 * string into segments; the first segment is lower-cased (with optional
 * preservation of successive uppercase letters), and each later segment is
 * capitalized and concatenated.
 *
 * When `preserveConsecutiveUppercase` is true (the default), an all-uppercase
 * word after a lowercase run (e.g. `SQL` in `rawSQL`) is kept as-is. When
 * false, that word is turned into leading uppercase with the rest lower-case
 * (e.g. `rawSql`).
 *
 * NOTE(jpsyx): this function was human-specified but AI-written. I apologize
 * for any slop.
 *
 * @param input The string to convert.
 * @param options Conversion options.
 * @param options.preserveConsecutiveUppercase When true, preserves runs like
 *   `SQL` in `rawSQL`; when false, normalizes them to `Sql`. Defaults to true.
 * @returns The camelCase string.
 */
export function toCamelCase<
  T extends string,
  PreserveUppercase extends boolean | undefined = true,
>(
  input: T,
  {
    preserveConsecutiveUppercase = true,
  }: {
    preserveConsecutiveUppercase?: PreserveUppercase;
  } = {},
): CamelCase<T, PreserveUppercase> {
  const segments: string[] = _splitIntoSegments(input);

  if (segments.length === 0) {
    return "" as CamelCase<T, PreserveUppercase>;
  }

  const [firstSegment, ...otherSegments] = segments;

  if (firstSegment === undefined) {
    return "" as CamelCase<T, PreserveUppercase>;
  }

  const first: string = _processFirstSegment(
    firstSegment,
    preserveConsecutiveUppercase,
  );

  const rest: string = otherSegments
    .map((segment) => {
      return _processLaterSegment(segment, preserveConsecutiveUppercase);
    })
    .join("");

  return `${first}${rest}` as CamelCase<T, PreserveUppercase>;
}

/**
 * Splits `input` on runs of characters that are not alphanumeric.
 */
function _splitIntoSegments(input: string): string[] {
  return input.split(/[^a-zA-Z0-9]+/g).filter((segment) => {
    return segment.length > 0;
  });
}

/**
 * Inserts word boundaries for camelCase / PascalCase style strings.
 */
function _splitIntoWords(input: string): string[] {
  const withSpaces: string = input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  return withSpaces.split(/\s+/).filter((word) => {
    return word.length > 0;
  });
}

function _processFirstSegment(
  segment: string,
  preserveConsecutiveUppercase: boolean,
): string {
  const words: string[] = _splitIntoWords(segment);

  if (words.length === 0) {
    return "";
  }

  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }

      if (preserveConsecutiveUppercase && _isAllUpperCaseWord(word)) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

function _processLaterSegment(
  segment: string,
  preserveConsecutiveUppercase: boolean,
): string {
  const words: string[] = _splitIntoWords(segment);

  if (words.length === 0) {
    return "";
  }

  return words
    .map((word) => {
      if (preserveConsecutiveUppercase && _isAllUpperCaseWord(word)) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

function _isAllUpperCaseWord(word: string): boolean {
  return /^[A-Z]+$/.test(word);
}
