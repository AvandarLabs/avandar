/**
 * Date-only token patterns (dashes as separators; used with normalized
 * inputs).
 */
export const PARSE_DATE_PORTION_FORMATS: readonly string[] = [
  "YYYY-MM-DD",
  "MM-DD-YYYY",
  "DD-MM-YYYY",
  "MMM-DD-YYYY",
  "MMMM-DD-YYYY",
];

/**
 * Time suffixes joined with `-` after the date portion. Empty means date-only.
 */
export const PARSE_TIME_PORTION_FORMATS: readonly string[] = [
  "",
  "HH-mm",
  "HH-mm-ss",
  "HH-mm-ss-SSS",
  "hh-mm-A",
  "hh-mm-a",
  "H-m-s",
];

/**
 * Appended after date (and time if present) with a `-` before `Z`.
 */
export const PARSE_TIMEZONE_SUFFIX_FORMATS: readonly string[] = ["", "Z"];

export type NormalizedInputClassification = {
  hasAmPmToken: boolean;
  hasFourDigitYear: boolean;
  hasLikelyTime: boolean;
};

export function classifyNormalizedInput(
  normalized: string,
): NormalizedInputClassification {
  const parts = normalized.split("-").filter(Boolean);
  const hasFourDigitYear = /\d{4}/.test(normalized);
  const hasAmPmToken = /(?:^|-)(?:AM|PM|am|pm)(?:-|$)/.test(normalized);
  const hasLikelyTime = parts.length >= 4 || hasAmPmToken;
  return {
    hasAmPmToken,
    hasFourDigitYear,
    hasLikelyTime,
  };
}

/**
 * Lower bound on character length for a format to possibly match `input`.
 */
export function minCharsForFormatPattern(format: string): number {
  let min = 0;
  if (format.includes("YYYY")) {
    min += 4;
  } else if (format.includes("YY")) {
    min += 2;
  }
  if (format.includes("MMMM")) {
    min += 3;
  } else if (format.includes("MMM")) {
    min += 3;
  } else if (format.includes("MM")) {
    min += 1;
  } else if (format.includes("M")) {
    min += 1;
  }
  if (format.includes("DD")) {
    min += 1;
  } else if (format.includes("D")) {
    min += 1;
  }
  if (format.includes("HH") || format.includes("hh")) {
    min += 1;
  } else if (format.includes("H") || format.includes("h")) {
    min += 1;
  }
  if (format.includes("mm")) {
    min += 1;
  } else if (format.includes("m")) {
    min += 1;
  }
  if (format.includes("ss")) {
    min += 1;
  } else if (format.includes("s")) {
    min += 1;
  }
  if (format.includes("SSS")) {
    min += 3;
  } else if (format.includes("SS")) {
    min += 2;
  } else if (format.includes("S")) {
    min += 1;
  }
  if (format.includes("Z")) {
    min += 1;
  }
  return Math.max(min, 4);
}

/**
 * Builds candidate format strings (deduped) for normalized dash-separated
 * inputs. Skips unlikely combinations using `classification` and `segment`
 * counts for performance.
 */
export function buildFallbackFormatCandidates(
  classification: NormalizedInputClassification,
  normalized: string,
): string[] {
  const segmentCount = normalized.split("-").filter(Boolean).length;
  const out: string[] = [];
  for (const datePart of PARSE_DATE_PORTION_FORMATS) {
    if (!classification.hasFourDigitYear && datePart.includes("YYYY")) {
      continue;
    }
    for (const timePart of PARSE_TIME_PORTION_FORMATS) {
      if (
        timePart !== "" &&
        !classification.hasLikelyTime &&
        segmentCount <= 3
      ) {
        continue;
      }
      if (
        (timePart === "hh-mm-A" || timePart === "hh-mm-a") &&
        !classification.hasAmPmToken &&
        segmentCount < 5
      ) {
        continue;
      }
      const dateTime = timePart === "" ? datePart : `${datePart}-${timePart}`;
      for (const tz of PARSE_TIMEZONE_SUFFIX_FORMATS) {
        const fmt = tz === "" ? dateTime : `${dateTime}-${tz}`;
        out.push(fmt);
      }
    }
  }
  return [...new Set(out)];
}
