import {
  createNameScorer,
  getEntryNameFromColumnName,
  getNameScore,
  getTokensFromColumnName,
  getWordsFromColumnName,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfileModule/columnNameHelpers.ts";
import type {
  ColumnMatchProfile,
  ColumnMatchScore,
  ColumnProfileT,
  ColumnProfileValue,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.types.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

const MAX_LISTED_VALUES = 50;
const MAX_CATEGORICAL_VALUES = 20;
const MAX_SCALE_LENGTH = 10;

/** Past this many distinct values, almost no repeats means unique per row. */
const MIN_UNIQUE_PER_ROW_VALUES = 5;
const UNIQUE_PER_ROW_SHARE = 0.95;
const MATCH_SCORE = 0.9;
const SUGGESTION_SCORE = 0.6;

/** A column whose last word is one of these and is mostly unique is an id. */
const IDENTIFIER_WORDS = new Set(["id", "no", "num", "number", "nbr", "key"]);

/** Words that make a short run of integer codes read as a scale. */
const SCALE_TOKENS = new Set([
  "level",
  "grade",
  "ses",
  "score",
  "quartile",
  "stage",
  "cat",
]);

/** Values that stand for a missing answer rather than a level or group. */
const MISSING_WORDS = new Set([
  "unknown",
  "unk",
  "missing",
  "na",
  "n/a",
  "not stated",
  "not known",
  "refused",
  "declined",
  "don't know",
  "dont know",
]);

/** Ordered vocabularies, lowest level first. */
const ORDERED_VOCABULARIES: ReadonlyArray<readonly string[]> = [
  ["none", "low", "medium", "high"],
  ["low", "moderate", "high"],
  ["none", "partial", "full"],
  ["never", "rarely", "sometimes", "often", "always"],
  ["mild", "moderate", "severe"],
  ["poor", "fair", "good", "very good", "excellent"],
  ["strongly disagree", "disagree", "neutral", "agree", "strongly agree"],
];

/** Types in one family compare as compatible. */
const TYPE_FAMILIES: Record<AvaDataType.T, string> = {
  bigint: "number",
  double: "number",
  date: "date",
  timestamp: "date",
  time: "time",
  boolean: "boolean",
  varchar: "text",
};

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

/** A code made only of digits, with an optional sign or decimals. */
const NUMERIC_CODE = /^-?\d+(\.\d+)?$/;

/**
 * The key two values are compared by: trimmed and lowercased, and a numeric
 * code without its leading zeros, so `01` and `1` are one code. Only
 * comparisons use it: a code list keeps the spelling it first saw.
 */
function getComparisonKey(value: string): string {
  const key = normalizeValue(value);
  return NUMERIC_CODE.test(key) ? key.replace(/^(-?)0+(?=\d)/, "$1") : key;
}

function isMissingValue(value: string): boolean {
  return MISSING_WORDS.has(normalizeValue(value));
}

function _getDistinctShare(profile: Readonly<ColumnProfileT>): number {
  return profile.nonNullCount === 0
    ? 0
    : profile.distinctCount / profile.nonNullCount;
}

function _isIdentifier(profile: Readonly<ColumnProfileT>): boolean {
  const share = _getDistinctShare(profile);
  const lastWord = getWordsFromColumnName(profile.columnName).at(-1) ?? "";
  return (
    (share > 0.95 && profile.distinctCount > MAX_CATEGORICAL_VALUES) ||
    // A small line list can have fewer than 21 rows, so a column with a
    // different value on every row is an identifier there too.
    (share >= UNIQUE_PER_ROW_SHARE &&
      profile.distinctCount > MIN_UNIQUE_PER_ROW_VALUES) ||
    (IDENTIFIER_WORDS.has(lastWord) && share > 0.8 && profile.distinctCount > 2)
  );
}

function _isDate(profile: Readonly<ColumnProfileT>): boolean {
  return (
    profile.dataType === "date" ||
    profile.dataType === "timestamp" ||
    (profile.dateShare ?? 0) >= 0.9
  );
}

function _isCategorical(profile: Readonly<ColumnProfileT>): boolean {
  return (
    profile.values !== undefined &&
    profile.distinctCount > 0 &&
    profile.distinctCount <= MAX_CATEGORICAL_VALUES &&
    (_getDistinctShare(profile) <= 0.2 || profile.rowCount < 100)
  );
}

function _isIntegerScale(profile: Readonly<ColumnProfileT>): boolean {
  const codes = (profile.values ?? []).map((item) => {
    return item.value.trim();
  });
  const isEveryCodeAnInteger = codes.every((code) => {
    return /^\d+$/.test(code);
  });
  if (codes.length < 2 || codes.length > MAX_SCALE_LENGTH) {
    return false;
  }
  const sorted = codes.map(Number).sort((codeA, codeB) => {
    return codeA - codeB;
  });
  const isOneToK = sorted.every((code, index) => {
    return code === index + 1;
  });
  return (
    isEveryCodeAnInteger &&
    isOneToK &&
    getTokensFromColumnName(profile.columnName).some((token) => {
      return SCALE_TOKENS.has(token);
    })
  );
}

function _findVocabulary(
  values: readonly ColumnProfileValue[],
): readonly string[] | undefined {
  const words = values
    .map((item) => {
      return normalizeValue(item.value);
    })
    .filter((word) => {
      return !MISSING_WORDS.has(word);
    });
  if (words.length < 2) {
    return undefined;
  }
  return ORDERED_VOCABULARIES.find((vocabulary) => {
    return words.every((word) => {
      return vocabulary.includes(word);
    });
  });
}

function getEntryKind(
  profile: Readonly<ColumnProfileT>,
): DataDictionaryEntry.Kind {
  // Dates come first: a timestamp is unique per row, but it is a date.
  if (_isDate(profile)) {
    return "date";
  }
  if (_isIdentifier(profile)) {
    return "identifier";
  }
  if (_isCategorical(profile)) {
    const isScale =
      _isIntegerScale(profile) ||
      _findVocabulary(profile.values ?? []) !== undefined;
    return isScale ? "ordered" : "categorical";
  }
  if (profile.dataType === "bigint" || profile.dataType === "double") {
    return "number";
  }
  return "text";
}

/**
 * Whether profiling alone calls this column coded: a categorical or ordered
 * kind. Unlike an entry's kind, which a user can change, this only moves
 * with the data.
 */
function isCodedColumn(profile: Readonly<ColumnProfileT>): boolean {
  const kind = getEntryKind(profile);
  return kind === "categorical" || kind === "ordered";
}

/** Worked out once per profile so scoring many pairs rebuilds nothing. */
function prepareProfileForMatching(
  profile: Readonly<ColumnProfileT>,
): ColumnMatchProfile {
  if (!profile.values) {
    return { profile, valueRows: undefined, totalValueRows: 0 };
  }
  const valueRows = new Map<string, number>();
  let totalValueRows = 0;
  profile.values.forEach((item) => {
    const key = getComparisonKey(item.value);
    valueRows.set(key, (valueRows.get(key) ?? 0) + item.rowCount);
    totalValueRows += item.rowCount;
  });
  return { profile, valueRows, totalValueRows };
}

/** The share of `from`'s rows whose value `other` lists too. */
function _getListedShare(
  from: Readonly<ColumnMatchProfile>,
  other: ReadonlyMap<string, number>,
): number {
  if (!from.valueRows || from.totalValueRows === 0) {
    return 0;
  }
  let sharedRows = 0;
  from.valueRows.forEach((rowCount, key) => {
    if (other.has(key)) {
      sharedRows += rowCount;
    }
  });
  return sharedRows / from.totalValueRows;
}

function _getRangeOverlap(
  rangeA: Readonly<{ min: number; max: number }>,
  rangeB: Readonly<{ min: number; max: number }>,
): number {
  const overlap =
    Math.min(rangeA.max, rangeB.max) - Math.max(rangeA.min, rangeB.min);
  const span =
    Math.max(rangeA.max, rangeB.max) - Math.min(rangeA.min, rangeB.min);
  if (overlap < 0) {
    return 0;
  }
  return span === 0 ? 1 : overlap / span;
}

function _getValueScore(
  matchA: Readonly<ColumnMatchProfile>,
  matchB: Readonly<ColumnMatchProfile>,
): number | undefined {
  if (matchA.valueRows && matchB.valueRows) {
    return (
      (_getListedShare(matchA, matchB.valueRows) +
        _getListedShare(matchB, matchA.valueRows)) /
      2
    );
  }
  const rangeA = matchA.profile.numberRange;
  const rangeB = matchB.profile.numberRange;
  return rangeA && rangeB ? _getRangeOverlap(rangeA, rangeB) : undefined;
}

function getTypeScore(typeA: AvaDataType.T, typeB: AvaDataType.T): number {
  if (TYPE_FAMILIES[typeA] === TYPE_FAMILIES[typeB]) {
    return 1;
  }
  return typeA === "varchar" || typeB === "varchar" ? 0.5 : 0;
}

/**
 * The highest score two columns could reach once their name and type scores
 * are known, whatever their values hold. A pair under the suggestion score
 * here never needs its values compared.
 */
function getBestPossibleScore(nameScore: number, typeScore: number): number {
  return 0.45 * nameScore + 0.2 * typeScore + 0.35;
}

function getMatchScoreFromPrepared(
  matchA: Readonly<ColumnMatchProfile>,
  matchB: Readonly<ColumnMatchProfile>,
  nameScore: number,
): ColumnMatchScore {
  const valueScore = _getValueScore(matchA, matchB);
  const typeScore = getTypeScore(
    matchA.profile.dataType,
    matchB.profile.dataType,
  );
  // When values cannot be compared, name and type carry the whole score.
  const parts = [
    { weight: 0.45, score: nameScore },
    { weight: 0.2, score: typeScore },
    ...(valueScore === undefined ? [] : [{ weight: 0.35, score: valueScore }]),
  ];
  const totalWeight = parts.reduce((sum, part) => {
    return sum + part.weight;
  }, 0);
  const score =
    parts.reduce((sum, part) => {
      return sum + part.weight * part.score;
    }, 0) / totalWeight;
  const band =
    score >= MATCH_SCORE
      ? "match"
      : score >= SUGGESTION_SCORE
        ? "suggestion"
        : "none";
  return { score, nameScore, valueScore, typeScore, band };
}

function getMatchScore(
  profileA: Readonly<ColumnProfileT>,
  profileB: Readonly<ColumnProfileT>,
): ColumnMatchScore {
  return getMatchScoreFromPrepared(
    prepareProfileForMatching(profileA),
    prepareProfileForMatching(profileB),
    getNameScore(profileA.columnName, profileB.columnName),
  );
}

function _getScaleRank(
  value: string,
  vocabulary: readonly string[] | undefined,
): number {
  const key = normalizeValue(value);
  if (MISSING_WORDS.has(key)) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (vocabulary) {
    return vocabulary.indexOf(key);
  }
  const asNumber = Number(key);
  return key !== "" && Number.isFinite(asNumber)
    ? asNumber
    : Number.MAX_SAFE_INTEGER - 1;
}

/** A locale-free order, so the same values sort the same everywhere. */
function _compareCodePoints(textA: string, textB: string): number {
  if (textA === textB) {
    return 0;
  }
  return textA < textB ? -1 : 1;
}

function sortValuesInScaleOrder(
  values: readonly ColumnProfileValue[],
): ColumnProfileValue[] {
  const vocabulary = _findVocabulary(values);
  return [...values].sort((itemA, itemB) => {
    return (
      _getScaleRank(itemA.value, vocabulary) -
        _getScaleRank(itemB.value, vocabulary) ||
      _compareCodePoints(itemA.value, itemB.value)
    );
  });
}

/**
 * Pure helpers for learning a dictionary from profiled columns: what kind
 * of entry a column looks like, how alike two columns are, and the order a
 * scale's values belong in. Used in the browser while a dictionary is
 * created from datasets, and reusable wherever columns are matched.
 */
export const ColumnProfileModule = {
  /** The most distinct values profiling lists for one column. */
  MAX_LISTED_VALUES,

  /** Scores at or above this are certainly the same column. */
  MATCH_SCORE,

  /** Scores at or above this, below `MATCH_SCORE`, are worth suggesting. */
  SUGGESTION_SCORE,

  /** Trims and lowercases a value, the way codes are compared. */
  normalizeValue,

  /**
   * The key two values are compared by: `normalizeValue`, and a numeric
   * code without its leading zeros, so `01` and `1` are one code.
   */
  getComparisonKey,

  /** Whether a value is a word for a missing answer, such as `Unknown`. */
  isMissingValue,

  /** The words a column name is compared by. */
  getTokensFromColumnName,

  /** A column name as an entry name: lowercase words joined by `_`. */
  getEntryNameFromColumnName,

  /**
   * The entry kind a profiled column looks like, with dates checked
   * before identifiers.
   */
  getEntryKind,

  /**
   * Whether the data alone says a column holds a short list of codes. Use
   * it to decide whether a column's values may leave the device, since an
   * entry's kind can be edited by the user and this cannot.
   */
  isCodedColumn,

  /**
   * How alike two columns are: name 0.45, values 0.35, type 0.2, with the
   * weights rescaled when values cannot be compared.
   */
  getMatchScore,

  /**
   * A scorer for the name scores of many columns: it tokenizes each name
   * once and remembers each pair it has scored.
   */
  createNameScorer,

  /** Works out once what `getMatchScoreFromPrepared` reads from a profile. */
  prepareProfileForMatching,

  /** How alike two columns' data types are: 1, 0.5 for text, or 0. */
  getTypeScore,

  /** The most two columns could score given their name and type scores. */
  getBestPossibleScore,

  /**
   * `getMatchScore` for profiles prepared once, given the name score, so a
   * caller can score many pairs without rebuilding anything.
   */
  getMatchScoreFromPrepared,

  /** Values in the order a scale reads, lowest first, missing values last. */
  sortValuesInScaleOrder,
};
