import { expandMacrosInRawSegment } from "@utils/dates/date-utils/formatPatternConstants.ts";

export type FormatSegment =
  | { kind: "literal"; text: string }
  | { kind: "pattern"; text: string };

/**
 * Splits on `[` … `]` pairs (dayjs / moment style). Text inside brackets is
 * literal. `L` macros run only on pattern segments.
 */
export function parseFormatSegments(format: string): FormatSegment[] {
  const segments: FormatSegment[] = [];
  let index = 0;
  while (index < format.length) {
    if (format[index] === "[") {
      const end = format.indexOf("]", index + 1);
      if (end === -1) {
        segments.push({ kind: "literal", text: format.slice(index + 1) });
        break;
      }
      segments.push({
        kind: "literal",
        text: format.slice(index + 1, end),
      });
      index = end + 1;
    } else {
      const start = index;
      while (index < format.length && format[index] !== "[") {
        index++;
      }
      segments.push({
        kind: "pattern",
        text: expandMacrosInRawSegment(format.slice(start, index)),
      });
    }
  }
  return segments;
}
