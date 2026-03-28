import { normalizeDateInputString } from "@utils/dates/date-utils/normalizeDateInputString.ts";
import {
  buildFallbackFormatCandidates,
  classifyNormalizedInput,
  minCharsForFormatPattern,
} from "@utils/dates/date-utils/parseDateFallbackFormats.ts";
import { parseWithFormatPattern } from "@utils/dates/date-utils/parseWithFormatPattern.ts";

export type ParseDateOptions = {
  /** When set, parse using this token pattern (same tokens as `formatDate`). */
  format?: string;
};

/**
 * Parses a string or number into a `Date`.
 *
 * 1. **Numbers** - treated as epoch milliseconds (invalid values rejected).
 * 2. **Explicit `options.format`** - `parseWithFormatPattern` (native tokens).
 * 3. **`Date.parse`** on the original trimmed string.
 * 4. **Normalized fallback** - punctuation/spaces → `-`, then try common
 *    date/time/timezone format combinations until one matches.
 *
 * @param value The value to parse.
 * @param options The options to use.
 * @param options.format The format to use. If none is provided, the function
 *   will try to parse the value using the native `Date.parse` method. If that
 *   fails it will test the value using fallback formats.
 * @returns The parsed date or undefined if the value is not a valid date.
 */
export function parseDate(
  value: string | number,
  options?: ParseDateOptions,
): Date | undefined {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (options?.format !== undefined && options.format.length > 0) {
    const explicit = parseWithFormatPattern(trimmed, options.format);
    if (explicit) {
      return explicit;
    }
  }
  const nativeMs = Date.parse(trimmed);
  if (!Number.isNaN(nativeMs)) {
    return new Date(nativeMs);
  }
  const normalized = normalizeDateInputString(trimmed);
  if (normalized.length === 0) {
    return undefined;
  }
  const classification = classifyNormalizedInput(normalized);
  const candidates = buildFallbackFormatCandidates(classification, normalized);
  for (const format of candidates) {
    if (normalized.length < minCharsForFormatPattern(format)) {
      continue;
    }
    const parsed = parseWithFormatPattern(normalized, format);
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}
