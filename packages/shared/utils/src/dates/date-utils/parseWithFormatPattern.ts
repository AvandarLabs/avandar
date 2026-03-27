import { escapeRegexLiteral } from "@utils/dates/date-utils/escapeRegexLiteral.ts";
import { FORMAT_TOKEN_ORDER } from "@utils/dates/date-utils/formatPatternConstants.ts";
import {
  monthLongIndex,
  monthLongRegexSource,
  monthShortIndex,
  monthShortRegexSource,
} from "@utils/dates/date-utils/monthNameRegex.ts";
import { parseFormatSegments } from "@utils/dates/date-utils/parseFormatSegments.ts";
import {
  weekdayLongRegexSource,
  weekdayShortRegexSource,
} from "@utils/dates/date-utils/weekdayNameRegex.ts";
import type { FormatToken } from "@utils/dates/date-utils/formatPatternConstants.ts";

type PatternPiece =
  | { kind: "literal"; text: string }
  | { kind: "token"; token: FormatToken };

type ParsedCapture = {
  day?: number;
  dayPeriod?: "AM" | "PM";
  hour12?: number;
  hour24?: number;
  millisecond?: number;
  minute?: number;
  month?: number;
  offsetMinutes?: number;
  second?: number;
  year?: number;
};

function matchTokenAt(format: string, index: number): FormatToken | undefined {
  const slice = format.slice(index);
  for (const token of FORMAT_TOKEN_ORDER) {
    if (slice.startsWith(token)) {
      return token;
    }
  }
  return undefined;
}

function tokenizePattern(pattern: string): PatternPiece[] {
  const pieces: PatternPiece[] = [];
  let index = 0;
  while (index < pattern.length) {
    const token = matchTokenAt(pattern, index);
    if (token) {
      pieces.push({ kind: "token", token });
      index += token.length;
    } else {
      pieces.push({ kind: "literal", text: pattern[index] ?? "" });
      index++;
    }
  }
  return pieces;
}

function tokenToRegexSource(token: FormatToken): string {
  switch (token) {
    case "YYYY":
      return "(\\d{4})";
    case "YY":
      return "(\\d{2})";
    case "MM":
      return "(\\d{1,2})";
    case "M":
      return "(\\d{1,2})";
    case "DD":
      return "(\\d{1,2})";
    case "D":
      return "(\\d{1,2})";
    case "HH":
      return "(\\d{1,2})";
    case "H":
      return "(\\d{1,2})";
    case "hh":
      return "(\\d{1,2})";
    case "h":
      return "(\\d{1,2})";
    case "mm":
      return "(\\d{1,2})";
    case "m":
      return "(\\d{1,2})";
    case "ss":
      return "(\\d{1,2})";
    case "s":
      return "(\\d{1,2})";
    case "SSS":
      return "(\\d{3})";
    case "SS":
      return "(\\d{2})";
    case "S":
      return "(\\d)";
    case "A":
      return "(AM|PM)";
    case "a":
      return "(am|pm|AM|PM)";
    case "MMM":
      return `(${monthShortRegexSource()})`;
    case "MMMM":
      return `(${monthLongRegexSource()})`;
    case "Z":
      return "(Z|GMT|UTC|[+-]\\d{2}:?\\d{2})";
    case "d":
      return "([0-6])";
    case "dd":
      return "(\\d{1,2})";
    case "ddd":
      return `(${weekdayShortRegexSource()})`;
    case "dddd":
      return `(${weekdayLongRegexSource()})`;
    default: {
      const _exhaustive: never = token;
      return _exhaustive;
    }
  }
}

function expandTwoDigitYear(yy: number): number {
  return yy >= 70 ? 1900 + yy : 2000 + yy;
}

function parseOffsetToSignedMinutes(s: string): number | undefined {
  const upper = s.toUpperCase();
  if (upper === "Z" || upper === "GMT" || upper === "UTC") {
    return 0;
  }
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(s);
  if (!m) {
    return undefined;
  }
  const sign = m[1] === "-" ? -1 : 1;
  const h = m[2] ?? "00";
  const min = m[3] ?? "00";
  return sign * (Number.parseInt(h, 10) * 60 + Number.parseInt(min, 10));
}

function applyCaptures(
  capturePieces: PatternPiece[],
  exec: RegExpExecArray,
): ParsedCapture | undefined {
  let groupIndex = 1;
  const out: ParsedCapture = {};
  for (const piece of capturePieces) {
    if (piece.kind === "literal") {
      continue;
    }
    const raw = exec[groupIndex];
    groupIndex++;
    if (raw === undefined) {
      return undefined;
    }
    const token = piece.token;
    switch (token) {
      case "YYYY":
        out.year = Number.parseInt(raw, 10);
        break;
      case "YY":
        out.year = expandTwoDigitYear(Number.parseInt(raw, 10));
        break;
      case "MM":
      case "M":
        out.month = Number.parseInt(raw, 10);
        break;
      case "MMM": {
        const mo = monthShortIndex(raw);
        if (mo === undefined) {
          return undefined;
        }
        out.month = mo;
        break;
      }
      case "MMMM": {
        const mo = monthLongIndex(raw);
        if (mo === undefined) {
          return undefined;
        }
        out.month = mo;
        break;
      }
      case "DD":
      case "D":
        out.day = Number.parseInt(raw, 10);
        break;
      case "HH":
      case "H":
        out.hour24 = Number.parseInt(raw, 10);
        break;
      case "hh":
      case "h":
        out.hour12 = Number.parseInt(raw, 10);
        break;
      case "mm":
      case "m":
        out.minute = Number.parseInt(raw, 10);
        break;
      case "ss":
      case "s":
        out.second = Number.parseInt(raw, 10);
        break;
      case "SSS":
        out.millisecond = Number.parseInt(raw, 10);
        break;
      case "SS":
        out.millisecond = Number.parseInt(raw, 10) * 10;
        break;
      case "S":
        out.millisecond = Number.parseInt(raw, 10) * 100;
        break;
      case "A":
      case "a": {
        const u = raw.toUpperCase();
        out.dayPeriod = u === "PM" ? "PM" : "AM";
        break;
      }
      case "Z": {
        const om = parseOffsetToSignedMinutes(raw);
        if (om === undefined) {
          return undefined;
        }
        out.offsetMinutes = om;
        break;
      }
      case "d":
      case "dd":
      case "ddd":
      case "dddd":
        break;
      default: {
        const _e: never = token;
        return _e;
      }
    }
  }
  return out;
}

function toHour24(hour12: number, period: "AM" | "PM"): number {
  if (hour12 < 1 || hour12 > 12) {
    return Number.NaN;
  }
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
}

function buildDateFromParsed(
  parsed: ParsedCapture,
  formatHasZ: boolean,
): Date | undefined {
  const y = parsed.year;
  const m = parsed.month;
  const d = parsed.day;
  if (
    y === undefined ||
    m === undefined ||
    d === undefined ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    return undefined;
  }

  let hour24 = parsed.hour24;
  if (hour24 === undefined && parsed.hour12 !== undefined && parsed.dayPeriod) {
    hour24 = toHour24(parsed.hour12, parsed.dayPeriod);
  }
  if (hour24 === undefined) {
    hour24 = 0;
  }
  if (Number.isNaN(hour24) || hour24 < 0 || hour24 > 23) {
    return undefined;
  }
  const min = parsed.minute ?? 0;
  const sec = parsed.second ?? 0;
  const ms = parsed.millisecond ?? 0;
  if (min < 0 || min > 59 || sec < 0 || sec > 59 || ms < 0 || ms > 999) {
    return undefined;
  }

  if (formatHasZ || parsed.offsetMinutes !== undefined) {
    const offset = parsed.offsetMinutes ?? 0;
    const utcMs = Date.UTC(y, m - 1, d, hour24, min, sec, ms) - offset * 60_000;
    const result = new Date(utcMs);
    return Number.isNaN(result.getTime()) ? undefined : result;
  }

  const result = new Date(y, m - 1, d, hour24, min, sec, ms);
  if (
    result.getFullYear() !== y ||
    result.getMonth() !== m - 1 ||
    result.getDate() !== d
  ) {
    return undefined;
  }
  return result;
}

function collectPatternPieces(format: string): {
  capturePieces: PatternPiece[];
  hasZ: boolean;
  regexSource: string;
} {
  const segments = parseFormatSegments(format);
  let regexSource = "";
  const capturePieces: PatternPiece[] = [];
  let hasZ = false;
  for (const seg of segments) {
    if (seg.kind === "literal") {
      regexSource += escapeRegexLiteral(seg.text);
    } else {
      const pieces = tokenizePattern(seg.text);
      for (const p of pieces) {
        if (p.kind === "literal") {
          regexSource += escapeRegexLiteral(p.text);
        } else {
          if (p.token === "Z") {
            hasZ = true;
          }
          regexSource += tokenToRegexSource(p.token);
          capturePieces.push(p);
        }
      }
    }
  }
  return { capturePieces, hasZ, regexSource };
}

/**
 * Parses `input` with the same token vocabulary as `formatDate`. Bracket
 * literals and `L` macros are supported.
 */
export function parseWithFormatPattern(
  input: string,
  format: string,
): Date | undefined {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const { capturePieces, hasZ, regexSource } = collectPatternPieces(format);
  if (capturePieces.length === 0) {
    return undefined;
  }
  let regex: RegExp;
  try {
    regex = new RegExp(`^${regexSource}$`, "i");
  } catch {
    return undefined;
  }
  const exec = regex.exec(trimmed);
  if (!exec) {
    return undefined;
  }
  const parsed = applyCaptures(capturePieces, exec);
  if (!parsed) {
    return undefined;
  }
  return buildDateFromParsed(parsed, hasZ);
}
