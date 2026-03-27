/**
 * Normalizes user input for heuristic parsing: spaces and common separators
 * become `-`, Unicode punctuation becomes `-`, `T`/`t` become `-`, repeated
 * `-` collapse to one. A trailing `Z` after a digit becomes `-Z` so
 * `...-07Z` matches `...-07-Z` patterns.
 */
export function normalizeDateInputString(input: string): string {
  let result = input
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[Tt]/g, "-")
    .replace(/\p{P}/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  result = result.replace(/(\d)(Z)$/i, "$1-$2");
  return result;
}
