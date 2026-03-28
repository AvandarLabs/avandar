/** Longest token sequences first (single pass), matching `formatDate`. */
export const FORMAT_TOKEN_ORDER = [
  "MMMM",
  "MMM",
  "MM",
  "M",
  "YYYY",
  "YY",
  "DD",
  "D",
  "dddd",
  "ddd",
  "dd",
  "d",
  "HH",
  "H",
  "hh",
  "h",
  "mm",
  "m",
  "ss",
  "s",
  "SSS",
  "SS",
  "S",
  "A",
  "a",
  "Z",
] as const;

export type FormatToken = (typeof FORMAT_TOKEN_ORDER)[number];

/**
 * Expands `L` macros in a raw format segment (outside `[` `]` brackets).
 */
export function expandMacrosInRawSegment(raw: string): string {
  return raw
    .replace(/LLLL/g, "dddd, MMMM D, YYYY h:mm A")
    .replace(/LLL/g, "MMMM D, YYYY h:mm A")
    .replace(/LL/g, "MMMM D, YYYY")
    .replace(/L/g, "MM/DD/YYYY");
}
