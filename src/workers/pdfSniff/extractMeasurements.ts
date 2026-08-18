/** One figure read out of a sentence, with what it counts and of what. */
export type Measurement = {
  subject: string | null;
  metric: string;
  value: number;
  unit: "n" | "percent" | "usd";
  sourceText: string;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const SCALE_WORDS: Record<string, number> = {
  hundred: 100,
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

/**
 * A scale word is part of the number, never the thing counted, so it must
 * never survive into a metric: "of 50 million" measures dollars, not
 * millions.
 */
const SCALE_WORD_SET = new Set(Object.keys(SCALE_WORDS));

/** A trailing "in <Place>" clause naming the subject of the measurements. */
const SUBJECT_CLAUSE =
  /\bin\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})\b(?=[.,;]|$)/u;

/**
 * A number, optionally preceded by a currency symbol and followed by a
 * percent sign, a scale word or "per cent", then the noun phrase it measures.
 *
 * The whitespace before the percent sign sits *inside* its optional group.
 * Hoisting it out looks tidier and is wrong: a greedy `\s*` ahead of the
 * group swallows the space that the scale word and "per cent" need, and
 * because everything after it is optional the match still succeeds, so no
 * backtracking ever repairs it. "33.5 million" then reads as 33.5.
 */
const MEASUREMENT = new RegExp(
  String.raw`([$€£])?\s*` +
    String.raw`(\d+(?:,\d{3})*(?:\.\d+)?|\b(?:${Object.keys(NUMBER_WORDS).join("|")})\b)` +
    String.raw`(?:\s*(%))?` +
    String.raw`(?:\s+(hundred|thousand|million|billion))?` +
    String.raw`(?:\s+(per\s+cent))?` +
    String.raw`((?:\s+[a-z][A-Za-z-]*){0,3})`,
  "gu",
);

/** The last word before a position, lowercased, or "" at the start. */
const PRECEDING_WORD = /([A-Za-z]+)[^A-Za-z]*$/u;

/**
 * Words that mark the number following them as a point in time rather than a
 * quantity, so that "since 2024 cases have risen" is not read as 2024 cases.
 */
const TEMPORAL_CUES = new Set([
  "in",
  "since",
  "during",
  "by",
  "from",
  "until",
  "through",
  "before",
  "after",
  "between",
  "throughout",
  "year",
  "years",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

/**
 * Words that follow a number without naming what it counts. The list stops a
 * captured phrase at the first word that cannot belong to a metric, so that
 * "21,563 cases have been reported" yields "cases" and "573 health facilities
 * in Darfur" yields "health facilities" rather than "health facilities in".
 */
const STOP_WORDS = new Set([
  "have",
  "has",
  "had",
  "was",
  "were",
  "is",
  "are",
  "been",
  "being",
  "and",
  "or",
  "of",
  "to",
  "from",
  "with",
  "in",
  "at",
  "on",
  "for",
  "per",
  "than",
  "across",
  "among",
  "between",
  "during",
  "since",
  "into",
  "within",
  "that",
  "which",
  "will",
  "would",
  "reported",
  "recorded",
  "documented",
  "needed",
  "alone",
]);

function _parseNumber(raw: string): number {
  const word = NUMBER_WORDS[raw.toLowerCase()];
  if (word !== undefined) {
    return word;
  }
  return Number(raw.replace(/,/gu, ""));
}

function _precedingWord(sentence: string, upTo: number): string {
  const before = PRECEDING_WORD.exec(sentence.slice(0, upTo));
  return before ? before[1]!.toLowerCase() : "";
}

/**
 * Decides whether a four-digit number is a year rather than a measurement.
 *
 * A bare `19xx`/`20xx` is rejected when nothing names what it counts, and
 * also when a month or a temporal preposition introduces it, which is what
 * catches a year in the middle of a sentence ("...has risen since July 2024
 * in Darfur"). A thousands separator, currency symbol, percent sign or scale
 * word all mark the number as a quantity and exempt it: "$2024 million" is
 * money and "2,024 cases" is a count.
 */
function _isYear(
  rawNumber: string,
  metric: string,
  precedingWord: string,
  isQuantityMarked: boolean,
): boolean {
  if (isQuantityMarked || !/^(?:19|20)\d{2}$/u.test(rawNumber)) {
    return false;
  }
  return metric.length === 0 || TEMPORAL_CUES.has(precedingWord);
}

/** Trims a captured phrase to the words that name what was measured. */
function _cleanMetric(phrase: string): string {
  const words: string[] = [];
  for (const word of phrase.trim().split(/\s+/u).filter(Boolean)) {
    const lower = word.toLowerCase();
    if (STOP_WORDS.has(lower) || SCALE_WORD_SET.has(lower)) {
      break;
    }
    words.push(word);
  }
  return words.join(" ");
}

/**
 * Pulls measurements out of a sentence.
 *
 * Deliberately conservative: every branch below prefers extracting nothing to
 * extracting something wrong, because a wrong number in an imported dataset
 * is far more damaging than a missing one the user can see is missing. The
 * model assist exists to raise recall without loosening these rules.
 */
export function extractMeasurements(sentence: string): readonly Measurement[] {
  const subjectMatch = SUBJECT_CLAUSE.exec(sentence);
  // A subject that arrives at the end governs every figure before it, so it
  // is attached to all of them rather than only to the nearest.
  const subject = subjectMatch ? subjectMatch[1]!.trim() : null;

  const found: Measurement[] = [];

  for (const match of sentence.matchAll(MEASUREMENT)) {
    const [, currency, rawNumber, percentSign, scaleWord, perCent, tail] =
      match;
    const metric = _cleanMetric(tail ?? "");

    const isPercent = Boolean(percentSign) || Boolean(perCent);
    const hasMeaning = metric.length > 0 || isPercent || Boolean(currency);
    const isQuantityMarked =
      isPercent || Boolean(currency) || Boolean(scaleWord);
    const precedingWord = _precedingWord(sentence, match.index ?? 0);

    if (
      hasMeaning &&
      !_isYear(rawNumber!, metric, precedingWord, isQuantityMarked)
    ) {
      const scale = scaleWord ? SCALE_WORDS[scaleWord]! : 1;
      found.push({
        subject,
        metric: isPercent && metric.length === 0 ? "percentage" : metric,
        value: _parseNumber(rawNumber!) * scale,
        unit:
          currency ? "usd"
          : isPercent ? "percent"
          : "n",
        sourceText: sentence.trim(),
      });
    }
  }

  return found;
}
