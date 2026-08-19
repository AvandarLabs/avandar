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

/** Every subject clause in a sentence, used only to count them. */
const SUBJECT_CLAUSE_GLOBAL = new RegExp(SUBJECT_CLAUSE, "gu");

/**
 * Comma boundary between clauses.
 *
 * The trailing `\s+` is what makes this safe for a thousands separator:
 * `21,563` has no space after its comma, so a number is never cut in half.
 */
const FRAGMENT_SPLIT = /,\s+/gu;

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

/** One comma-delimited clause of a sentence, and the subject governing it. */
type Fragment = {
  /** Index of the fragment's first character in the whole sentence. */
  start: number;
  /** Index one past its last character. */
  end: number;
  subject: string | null;
};

/**
 * Splits a sentence into comma-delimited fragments and resolves who each one
 * is about.
 *
 * A single sentence routinely names more than one place: "...and one death in
 * West Darfur, and 166 cases and 13 deaths in South Darfur." Attaching the
 * first clause to every figure, as this used to, reported South Darfur's
 * figures under West Darfur, which is the one failure mode the whole design
 * exists to prevent. A wrong province is worse than no province.
 *
 * A fragment carrying its own clause governs its own figures. A fragment with
 * none borrows the sentence's clause only when the sentence has exactly one,
 * which is what keeps "There were 166 cases and 13 deaths in South Darfur."
 * attaching to both figures. Where a sentence offers several, an unclaimed
 * figure gets `null`: we genuinely cannot tell, and null is honest where a
 * guess is not.
 */
function _fragments(sentence: string): readonly Fragment[] {
  const clauseCount = [...sentence.matchAll(SUBJECT_CLAUSE_GLOBAL)].length;
  const fallback =
    clauseCount === 1 ?
      (SUBJECT_CLAUSE.exec(sentence)?.[1]?.trim() ?? null)
    : null;

  const bounds: Array<{ start: number; end: number }> = [];
  let start = 0;
  for (const separator of sentence.matchAll(FRAGMENT_SPLIT)) {
    bounds.push({ start, end: separator.index });
    start = separator.index + separator[0].length;
  }
  bounds.push({ start, end: sentence.length });

  return bounds.map((bound) => {
    const own = SUBJECT_CLAUSE.exec(sentence.slice(bound.start, bound.end));
    return {
      ...bound,
      subject: own ? own[1]!.trim() : fallback,
    };
  });
}

/**
 * The fragment a match at `position` belongs to.
 *
 * The first fragment ending after the position, rather than the one strictly
 * containing it: `MEASUREMENT` opens with an optional currency symbol and
 * `\s*`, so a match can begin on the space inside a ", " separator, which
 * belongs to no fragment. That space introduces the figure that follows it.
 */
function _fragmentAt(
  fragments: readonly Fragment[],
  position: number,
): Fragment | undefined {
  return fragments.find((fragment) => {
    return position < fragment.end;
  });
}

/**
 * Pulls measurements out of a sentence.
 *
 * Deliberately conservative: every branch below prefers extracting nothing to
 * extracting something wrong, because a wrong number in an imported dataset
 * is far more damaging than a missing one the user can see is missing. The
 * model assist exists to raise recall without loosening these rules.
 *
 * Matching runs over the whole sentence rather than fragment by fragment, so
 * that `_precedingWord` still sees the word before a figure even when a comma
 * separates them: "In June, 2024 cases" has to keep reading `june` and
 * rejecting 2024 as a year.
 */
export function extractMeasurements(sentence: string): readonly Measurement[] {
  const fragments = _fragments(sentence);

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
        subject: _fragmentAt(fragments, match.index ?? 0)?.subject ?? null,
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
