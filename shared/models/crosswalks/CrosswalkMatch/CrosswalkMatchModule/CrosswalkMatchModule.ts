import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.ts";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch.ts";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.ts";
import type {
  CrosswalkMatchT,
  CrosswalkMatchTarget,
  CrosswalkPrefill,
} from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch.types.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

/** A value share at or above this, with unlike names, is a value match. */
const SAME_VALUES_SCORE = 0.9;

const DIGITS_PATTERN = /^[0-9]+$/;

type CarriedFill = {
  columnId: CrosswalkColumn.Id;
  fill: CrosswalkMapping.Fill;
};

/** A column of the combined dataset, as prefilling reads it. */
type PrefillColumn = {
  id: CrosswalkColumn.Id;
  entryId: DataDictionaryEntry.Id | undefined;
  dataType: AvaDataType.T;
};

type Candidate = CrosswalkMatchT & { targetIndex: number; sourceIndex: number };

/**
 * Profiles that hold only a dataset's column names and types, with no
 * values, for a dataset that has not been read yet. The scorer rescales to
 * name and type when values are missing.
 */
function toNameAndTypeProfiles(
  options: Readonly<{
    datasetId: Dataset.Id;
    datasetName: string;
    columns: ReadonlyArray<{ name: string; dataType: AvaDataType.T }>;
  }>,
): ColumnProfile.T[] {
  return options.columns.map((column) => {
    return {
      datasetId: options.datasetId,
      datasetName: options.datasetName,
      columnName: column.name,
      dataType: column.dataType,
      rowCount: 0,
      nonNullCount: 0,
      distinctCount: 0,
      values: undefined,
      dateShare: undefined,
      numberRange: undefined,
    };
  });
}

function _toCandidate(
  target: Readonly<CrosswalkMatchTarget>,
  source: Readonly<ColumnProfile.T>,
  indexes: { targetIndex: number; sourceIndex: number },
): Candidate | undefined {
  const matchScore = ColumnProfile.getMatchScore(target.profile, source);
  if (matchScore.band === "none") {
    return undefined;
  }
  const isValueMatch =
    (matchScore.valueScore ?? 0) >= SAME_VALUES_SCORE &&
    matchScore.nameScore < ColumnProfile.SUGGESTION_SCORE;
  return {
    columnId: target.columnId,
    sourceColumn: source.columnName,
    score: matchScore.score,
    band: matchScore.band,
    reason: isValueMatch ? "same_values" : "name_and_type",
    ...indexes,
  };
}

/**
 * The source column each target is filled with, one to one: every pair in
 * the match or suggestion band, best score first, ties by target order and
 * then source order. Returned in target order. Used to prefill a layout
 * from the scorer.
 */
function matchLayoutColumns(
  options: Readonly<{
    targets: readonly CrosswalkMatchTarget[];
    sources: readonly ColumnProfile.T[];
  }>,
): CrosswalkMatchT[] {
  const candidates = options.targets
    .flatMap((target, targetIndex) => {
      return options.sources.flatMap((source, sourceIndex) => {
        const candidate = _toCandidate(target, source, {
          targetIndex,
          sourceIndex,
        });
        return candidate ? [candidate] : [];
      });
    })
    .sort((candidateA, candidateB) => {
      return (
        candidateB.score - candidateA.score ||
        candidateA.targetIndex - candidateB.targetIndex ||
        candidateA.sourceIndex - candidateB.sourceIndex
      );
    });
  const chosen = candidates.reduce<Candidate[]>((picked, candidate) => {
    const isTaken = picked.some((pick) => {
      return (
        pick.targetIndex === candidate.targetIndex ||
        pick.sourceIndex === candidate.sourceIndex
      );
    });
    return isTaken ? picked : [...picked, candidate];
  }, []);
  return chosen
    .sort((pickA, pickB) => {
      return pickA.targetIndex - pickB.targetIndex;
    })
    .map(
      ({ targetIndex: _targetIndex, sourceIndex: _sourceIndex, ...match }) => {
        return match;
      },
    );
}

function _findColumnName(
  name: string,
  columnNames: readonly string[],
): string | undefined {
  const key = name.toLowerCase();
  return columnNames.find((columnName) => {
    return columnName.toLowerCase() === key;
  });
}

function _carryOverFill(
  fill: CrosswalkMapping.Fill,
  columnNames: readonly string[],
): CrosswalkMapping.Fill | undefined {
  if (fill.kind === "column") {
    const sourceColumn = _findColumnName(fill.sourceColumn, columnNames);
    return sourceColumn === undefined ? undefined : { ...fill, sourceColumn };
  }
  if (fill.kind === "expression") {
    const hasEveryColumn = CrosswalkMapping.getCombineColumnNames(
      fill.sql,
    ).every((name) => {
      return _findColumnName(name, columnNames) !== undefined;
    });
    return hasEveryColumn ? fill : undefined;
  }
  return fill;
}

/**
 * The fills of a similar layout that still work for a layout with these
 * column names: a column fill whose source column exists here, ignoring
 * case and renamed to this layout's spelling; every constant and empty; and
 * a Combine expression whose placeholders all exist here.
 */
function carryOverFills(
  options: Readonly<{
    fills: readonly CarriedFill[];
    columnNames: readonly string[];
  }>,
): CarriedFill[] {
  return options.fills.flatMap((item) => {
    const fill = _carryOverFill(item.fill, options.columnNames);
    return fill === undefined ? [] : [{ columnId: item.columnId, fill }];
  });
}

/**
 * The code list a governed column should translate with, and whether its
 * source holds the list's labels: the entry's list covering the most of
 * the profiled values, or its primary list holding codes when the values
 * were not compared. Undefined when the entry has no code list.
 */
function chooseCodeList(
  options: Readonly<{
    profile: ColumnProfile.T;
    entry: DictionaryMatch.Entry;
  }>,
):
  | {
      codeListId: DataDictionaryCodeList.Id;
      holdsLabels: boolean;
      coverage: number | undefined;
    }
  | undefined {
  const best = DictionaryMatch.getBestCodeList(options.profile, options.entry);
  return best === undefined
    ? undefined
    : {
        codeListId: best.codeListId,
        holdsLabels: best.direction === "encode",
        coverage: best.coverage,
      };
}

/** The one length every listed value has when every one is digits. */
function _getDigitLength(
  profile: Readonly<ColumnProfile.T>,
): number | undefined {
  const values = (profile.values ?? []).map((item) => {
    return item.value.trim();
  });
  const lengths = new Set(
    values.map((value) => {
      return value.length;
    }),
  );
  const isAllDigits = values.every((value) => {
    return DIGITS_PATTERN.test(value);
  });
  return values.length > 0 && isAllDigits && lengths.size === 1
    ? [...lengths][0]
    : undefined;
}

function _needsPadding(
  source: Readonly<ColumnProfile.T>,
  length: number,
): boolean {
  const values = (source.values ?? []).map((item) => {
    return item.value.trim();
  });
  return (
    (source.dataType === "bigint" || source.dataType === "varchar") &&
    values.length > 0 &&
    values.every((value) => {
      return DIGITS_PATTERN.test(value) && value.length <= length;
    }) &&
    values.some((value) => {
      return value.length < length;
    })
  );
}

/**
 * The conversion a source column likely needs to fill a target, such as
 * reading text as a date or padding ZIP `501` to `00501`. Undefined when
 * none applies.
 */
function suggestConvert(
  options: Readonly<{
    source: ColumnProfile.T;
    target: ColumnProfile.T;
    targetDataType: AvaDataType.T;
    dateFormat: string | undefined;
  }>,
): CrosswalkMapping.Convert | undefined {
  // Read as a date when the target is a date and the source is text in a
  // detected format. Pad with zeros when every target value is a digit
  // string of one length and some source values are shorter.
  const isDateTarget =
    options.targetDataType === "date" || options.targetDataType === "timestamp";
  if (
    isDateTarget &&
    options.source.dataType === "varchar" &&
    options.dateFormat !== undefined
  ) {
    return { kind: "parse_date", format: options.dateFormat };
  }
  const length = _getDigitLength(options.target);
  return length !== undefined && _needsPadding(options.source, length)
    ? { kind: "pad_text", length }
    : undefined;
}

function _toMatchedFill(
  options: Readonly<{
    column: PrefillColumn;
    source: ColumnProfile.T;
    target: ColumnProfile.T;
    entriesById: ReadonlyMap<string, DictionaryMatch.Entry>;
    dateFormat: string | undefined;
  }>,
): CrosswalkMapping.Fill {
  const { column, source } = options;
  const entry =
    column.entryId === undefined
      ? undefined
      : options.entriesById.get(column.entryId);
  if (entry !== undefined) {
    const codeList = chooseCodeList({ profile: source, entry });
    return {
      kind: "column",
      sourceColumn: source.columnName,
      convert: undefined,
      codeListId: codeList?.codeListId,
      holdsLabels: codeList?.holdsLabels ?? false,
    };
  }
  return {
    kind: "column",
    sourceColumn: source.columnName,
    convert: suggestConvert({
      source,
      target: options.target,
      targetDataType: column.dataType,
      dateFormat: options.dateFormat,
    }),
    codeListId: undefined,
    holdsLabels: false,
  };
}

function _toCarriedPrefill(item: CarriedFill): CrosswalkPrefill {
  return {
    columnId: item.columnId,
    fill: item.fill,
    status: "suggested",
    confidence: undefined,
    reason: "similar_layout",
  };
}

function _getSourceKeysUsedBy(fills: readonly CarriedFill[]): Set<string> {
  return new Set(
    fills.flatMap((item) => {
      return item.fill.kind === "column"
        ? [item.fill.sourceColumn.toLowerCase()]
        : [];
    }),
  );
}

type PrefillOptions = Readonly<{
  columns: readonly PrefillColumn[];
  targets: readonly CrosswalkMatchTarget[];
  sources: readonly ColumnProfile.T[];
  carriedOver?: readonly CarriedFill[];
  entriesById: ReadonlyMap<string, DictionaryMatch.Entry>;
  dateFormatsBySourceColumn?: ReadonlyMap<string, string>;
}>;

function _toMatchPrefill(
  match: CrosswalkMatchT,
  options: PrefillOptions,
  pool: Readonly<{
    targets: readonly CrosswalkMatchTarget[];
    sources: readonly ColumnProfile.T[];
  }>,
): CrosswalkPrefill | undefined {
  const column = options.columns.find((candidate) => {
    return candidate.id === match.columnId;
  });
  const source = pool.sources.find((candidate) => {
    return candidate.columnName === match.sourceColumn;
  });
  const target = pool.targets.find((candidate) => {
    return candidate.columnId === match.columnId;
  });
  if (!column || !source || !target) {
    return undefined;
  }
  const fill = _toMatchedFill({
    column,
    source,
    target: target.profile,
    entriesById: options.entriesById,
    dateFormat: options.dateFormatsBySourceColumn?.get(source.columnName),
  });
  return {
    columnId: column.id,
    fill,
    status: match.band === "match" ? "confirmed" : "suggested",
    confidence: match.score,
    reason: match.reason,
  };
}

/** The scorer's fills for the columns and sources no carried fill took. */
function _getMatchPrefills(
  options: PrefillOptions,
  carried: readonly CarriedFill[],
): CrosswalkPrefill[] {
  const carriedIds = new Set(
    carried.map((item) => {
      return item.columnId;
    }),
  );
  const usedSourceKeys = _getSourceKeysUsedBy(carried);
  const pool = {
    targets: options.targets.filter((target) => {
      return !carriedIds.has(target.columnId);
    }),
    sources: options.sources.filter((source) => {
      return !usedSourceKeys.has(source.columnName.toLowerCase());
    }),
  };
  return matchLayoutColumns(pool).flatMap((match) => {
    const prefill = _toMatchPrefill(match, options, pool);
    return prefill ? [prefill] : [];
  });
}

/**
 * The fills a layout starts with, in column order, each with its status and
 * how sure the match was. Use it when a layout is first added to a
 * crosswalk and again once its values are read.
 */
function prefillLayout(options: PrefillOptions): CrosswalkPrefill[] {
  // Fills carried over from a similar layout come first, as suggestions.
  // The scorer then fills the rest from the source columns no carried fill
  // uses: a match is confirmed, a suggestion is not, and the score is the
  // confidence. A governed column's fill translates codes with
  // `chooseCodeList`; any other column's gets `suggestConvert`.
  const columnIds = new Set(
    options.columns.map((column) => {
      return column.id;
    }),
  );
  const carried = (options.carriedOver ?? []).filter((item) => {
    return columnIds.has(item.columnId);
  });
  const prefillsByColumnId = new Map<string, CrosswalkPrefill>(
    [
      ...carried.map(_toCarriedPrefill),
      ..._getMatchPrefills(options, carried),
    ].map((prefill) => {
      return [prefill.columnId, prefill] as const;
    }),
  );
  return options.columns.flatMap((column) => {
    const prefill = prefillsByColumnId.get(column.id);
    return prefill ? [prefill] : [];
  });
}

/**
 * Pure helpers for mapping a layout onto a crosswalk's columns: scoring its
 * columns against the combined dataset's, carrying fills over from a
 * similar layout, choosing a governed column's code list, and spotting a
 * conversion a column needs. It runs on the device, so it works offline:
 * use it to prefill a new layout's fills, for example when datasets with a
 * new column layout are added to a crosswalk.
 */
export const CrosswalkMatchModule = {
  toNameAndTypeProfiles,
  matchLayoutColumns,
  carryOverFills,
  chooseCodeList,
  suggestConvert,
  prefillLayout,
};
