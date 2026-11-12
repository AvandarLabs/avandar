import {
  getEntryNameFromColumnName,
  getNameScore,
  getTokensFromColumnName,
  getWordsFromColumnName,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfileModule/columnNameHelpers.ts";
import type {
  ColumnMatchScore,
  ColumnProfileT,
  ColumnProfileValue,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.types.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

const MAX_LISTED_VALUES = 50;
const MAX_CATEGORICAL_VALUES = 20;
const MAX_SCALE_LENGTH = 10;
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

function _getListedShare(
  values: readonly ColumnProfileValue[],
  otherKeys: ReadonlySet<string>,
): number {
  const total = values.reduce((sum, item) => {
    return sum + item.rowCount;
  }, 0);
  const shared = values.reduce((sum, item) => {
    return otherKeys.has(normalizeValue(item.value))
      ? sum + item.rowCount
      : sum;
  }, 0);
  return total === 0 ? 0 : shared / total;
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
  profileA: Readonly<ColumnProfileT>,
  profileB: Readonly<ColumnProfileT>,
): number | undefined {
  if (profileA.values && profileB.values) {
    const keysOf = (values: readonly ColumnProfileValue[]): Set<string> => {
      return new Set(
        values.map((item) => {
          return normalizeValue(item.value);
        }),
      );
    };
    return (
      (_getListedShare(profileA.values, keysOf(profileB.values)) +
        _getListedShare(profileB.values, keysOf(profileA.values))) /
      2
    );
  }
  if (profileA.numberRange && profileB.numberRange) {
    return _getRangeOverlap(profileA.numberRange, profileB.numberRange);
  }
  return undefined;
}

function _getTypeScore(typeA: AvaDataType.T, typeB: AvaDataType.T): number {
  if (TYPE_FAMILIES[typeA] === TYPE_FAMILIES[typeB]) {
    return 1;
  }
  return typeA === "varchar" || typeB === "varchar" ? 0.5 : 0;
}

function getMatchScore(
  profileA: Readonly<ColumnProfileT>,
  profileB: Readonly<ColumnProfileT>,
): ColumnMatchScore {
  const nameScore = getNameScore(profileA.columnName, profileB.columnName);
  const valueScore = _getValueScore(profileA, profileB);
  const typeScore = _getTypeScore(profileA.dataType, profileB.dataType);
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

function sortValuesInScaleOrder(
  values: readonly ColumnProfileValue[],
): ColumnProfileValue[] {
  const vocabulary = _findVocabulary(values);
  return [...values].sort((itemA, itemB) => {
    return (
      _getScaleRank(itemA.value, vocabulary) -
        _getScaleRank(itemB.value, vocabulary) ||
      itemA.value.localeCompare(itemB.value)
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
   * How alike two columns are: name 0.45, values 0.35, type 0.2, with the
   * weights rescaled when values cannot be compared.
   */
  getMatchScore,

  /** Values in the order a scale reads, lowest first, missing values last. */
  sortValuesInScaleOrder,
};
