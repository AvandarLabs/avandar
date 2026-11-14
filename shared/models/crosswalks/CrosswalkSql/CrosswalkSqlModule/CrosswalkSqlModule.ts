import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.ts";
import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { fnv1a64Hex } from "$/utils/fnv1a64Hex/fnv1a64Hex.ts";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk.ts";
import type {
  CrosswalkSqlCodeLists,
  CrosswalkSqlColumn,
  CrosswalkSqlInput,
  CrosswalkSqlLayout,
  CrosswalkSqlOutput,
  CrosswalkSqlTranslationOutput,
} from "$/models/crosswalks/CrosswalkSql/CrosswalkSql.types.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";

/** The column each stacked dataset's name is selected as, then renamed. */
const SOURCE_ALIAS = "__ava_source_dataset";

/** The pair format `getCodeListFingerprint` hashes. */
const FINGERPRINT_PREFIX = "p1.";

type Pairs = readonly DataDictionaryCodeList.Pair[];
type Fill = CrosswalkMapping.Fill;
type ColumnFill = Extract<Fill, { kind: "column" }>;
type Convert = CrosswalkMapping.Convert;

/** A fill's SQL and the code lists it embedded. */
type FillSql = { sql: string; codeListIds: string[] };

function _normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** A locale-free order, so the same ids sort the same everywhere. */
function _compareCodePoints(textA: string, textB: string): number {
  if (textA === textB) {
    return 0;
  }
  return textA < textB ? -1 : 1;
}

/** The first primary pair whose label or accepted spelling is `label`. */
function _findCounterpart(
  label: string,
  primaryPairs: Pairs,
): DataDictionaryCodeList.Pair | undefined {
  const key = _normalize(label);
  if (key === "") {
    return undefined;
  }
  return primaryPairs.find((primaryPair) => {
    return [primaryPair.label, ...primaryPair.acceptedSpellings].some(
      (spelling) => {
        return _normalize(spelling) === key;
      },
    );
  });
}

/**
 * What each pair of a fill's code list becomes in the combined dataset: the
 * label (labels mode) or code (codes mode) of its counterpart in the
 * primary list, so two codings of one entry come out alike. With no
 * counterpart, labels mode keeps the pair's own label and codes mode
 * outputs nothing. Use it to see what a list's values translate to, for
 * example to show a preview or build a conversion.
 *
 * `isPrimaryList` says `pairs` is the entry's primary list itself.
 */
function getTranslationOutputs(
  options: Readonly<{
    pairs: Pairs;
    primaryPairs: Pairs;
    isPrimaryList: boolean;
    codesOutputAs: Crosswalk.CodesOutput;
  }>,
): CrosswalkSqlTranslationOutput[] {
  return options.pairs.map((pair) => {
    // A primary pair is its own counterpart. Another list's pair matches
    // the first primary pair with the same label or accepted spelling.
    const counterpart = options.isPrimaryList
      ? pair
      : _findCounterpart(pair.label, options.primaryPairs);
    if (options.codesOutputAs === "codes") {
      return { pair, output: counterpart?.code };
    }
    return { pair, output: counterpart?.label ?? pair.label };
  });
}

function _getSpellings(pair: DataDictionaryCodeList.Pair): string[] {
  return [pair.label, ...pair.acceptedSpellings].filter((spelling) => {
    return spelling.trim() !== "";
  });
}

function _toTranslatedPair(
  pair: DataDictionaryCodeList.Pair,
  output: string,
  holdsLabels: boolean,
): DataDictionaryCodeList.Pair {
  return holdsLabels
    ? { ...pair, code: output }
    : { ...pair, label: output, acceptedSpellings: [] };
}

/**
 * The conversion that turns a source column holding a code list's codes
 * (or its labels, with `holdsLabels`) into what the combined dataset
 * outputs, per `getTranslationOutputs`. Its output stays text, so cast it.
 * Use it to render a translation as SQL, for example with
 * `ColumnConversion.toCaseSql`.
 */
function toTranslation(
  options: Readonly<{
    pairs: Pairs;
    primaryPairs: Pairs;
    isPrimaryList: boolean;
    holdsLabels: boolean;
    codesOutputAs: Crosswalk.CodesOutput;
  }>,
): ColumnConversion.T {
  const outputs = getTranslationOutputs(options);
  // A pair whose output is blank is left out, so it passes through, as
  // `ColumnConversion` treats a blank label.
  const pairs = outputs.flatMap(({ pair, output }) => {
    return output === undefined || output.trim() === ""
      ? []
      : [_toTranslatedPair(pair, output, options.holdsLabels)];
  });
  // In codes mode a pair with no counterpart becomes empty rather than
  // passing through as a code of another list.
  const overrides = outputs.flatMap(({ pair, output }) => {
    if (output !== undefined) {
      return [];
    }
    const values = options.holdsLabels ? _getSpellings(pair) : [pair.code];
    return values.map((value) => {
      return { value, action: "empty" as const };
    });
  });
  return {
    // A translation fills a crosswalk column, not a dataset column.
    datasetColumnId: "",
    direction: options.holdsLabels ? "encode" : "decode",
    pairs,
    isOrdered: false,
    overrides,
    keepsOriginalAs: undefined,
    outputDataType: "varchar",
    inputDataType: undefined,
  };
}

/**
 * The type a column an entry governs takes: text in labels mode, and in
 * codes mode `bigint` when every primary code is a whole number, as
 * `ColumnConversion.getOutputDataType` decides for an encoded column.
 */
function getGovernedDataType(
  options: Readonly<{
    codesOutputAs: Crosswalk.CodesOutput;
    primaryPairs: Pairs;
  }>,
): AvaDataType.T {
  return options.codesOutputAs === "labels"
    ? "varchar"
    : ColumnConversion.getOutputDataType({
        direction: "encode",
        pairs: options.primaryPairs,
      });
}

/**
 * A fingerprint of a code list's pairs: the same for the same codes,
 * labels, spellings, and missing flags in the same order, whatever object
 * holds them. The combined dataset records one per embedded list, and a
 * changed fingerprint means its SQL is out of date.
 */
function getCodeListFingerprint(pairs: Pairs): string {
  const canonical = JSON.stringify(
    pairs.map((pair) => {
      return [pair.code, pair.label, pair.acceptedSpellings, pair.isMissing];
    }),
  );
  return `${FINGERPRINT_PREFIX}${fnv1a64Hex(canonical)}`;
}

function _toCastSql(valueSql: string, typeSql: string): string {
  return `TRY_CAST(${valueSql} AS ${typeSql})`;
}

function _toPadSql(length: number, textSql: string): string {
  if (!Number.isInteger(length) || length < 1) {
    throw new Error(`A pad length must be a positive integer, not ${length}`);
  }
  const trimmedSql = `trim(${textSql})`;
  return `CASE WHEN regexp_full_match(${trimmedSql}, '[0-9]+') AND length(${trimmedSql}) < ${length} THEN lpad(${trimmedSql}, ${length}, '0') ELSE ${trimmedSql} END`;
}

function _toTrimAndFixCaseSql(
  letterCase: "keep" | "lower" | "upper",
  textSql: string,
): string {
  const squashedSql = `regexp_replace(trim(${textSql}), '\\s+', ' ', 'g')`;
  return letterCase === "keep" ? squashedSql : `${letterCase}(${squashedSql})`;
}

function _toConvertedSql(convert: Convert, valueSql: string): string {
  const textSql = `CAST(${valueSql} AS VARCHAR)`;
  switch (convert.kind) {
    case "parse_date":
      return `TRY_STRPTIME(${textSql}, ${quoteSqlLiteral(convert.format)})`;
    case "pad_text":
      return _toPadSql(convert.length, textSql);
    case "multiply":
      if (!Number.isFinite(convert.factor)) {
        throw new Error(
          `A multiply factor must be finite, not ${convert.factor}`,
        );
      }
      return `TRY_CAST(${valueSql} AS DOUBLE) * ${String(convert.factor)}`;
    case "trim_and_fix_case":
      return _toTrimAndFixCaseSql(convert.letterCase, textSql);
    default: {
      const unknownConvert: never = convert;
      throw new Error(`Unknown conversion: ${JSON.stringify(unknownConvert)}`);
    }
  }
}

function _getPrimaryCodeListId(
  column: Readonly<CrosswalkSqlColumn>,
  codeListId: string,
  codeLists: Readonly<CrosswalkSqlCodeLists>,
): string {
  const primaryId =
    column.entryId === undefined
      ? undefined
      : codeLists.primaryCodeListIdByEntryId.get(column.entryId);
  return primaryId !== undefined && codeLists.codeListsById.has(primaryId)
    ? primaryId
    : codeListId;
}

function _toColumnFillSql(
  fill: ColumnFill,
  column: Readonly<CrosswalkSqlColumn>,
  options: Readonly<
    CrosswalkSqlCodeLists & { codesOutputAs: Crosswalk.CodesOutput }
  >,
): FillSql {
  const valueSql = quoteSqlIdentifier(fill.sourceColumn);
  const typeSql = AvaDataType.toDuckDbTypeSql(column.dataType);
  const codeList =
    fill.codeListId === undefined
      ? undefined
      : options.codeListsById.get(fill.codeListId);
  if (fill.codeListId !== undefined && codeList !== undefined) {
    const primaryId = _getPrimaryCodeListId(column, fill.codeListId, options);
    const primaryPairs =
      options.codeListsById.get(primaryId)?.pairs ?? codeList.pairs;
    const conversion = toTranslation({
      pairs: codeList.pairs,
      primaryPairs,
      isPrimaryList: primaryId === fill.codeListId,
      holdsLabels: fill.holdsLabels,
      codesOutputAs: options.codesOutputAs,
    });
    return {
      sql: _toCastSql(
        ColumnConversion.toCaseSql({ valueSql, conversion }),
        typeSql,
      ),
      codeListIds: [...new Set([fill.codeListId, primaryId])],
    };
  }
  if (fill.convert !== undefined) {
    return {
      sql: _toCastSql(_toConvertedSql(fill.convert, valueSql), typeSql),
      codeListIds: [],
    };
  }
  const sql =
    typeSql === "VARCHAR"
      ? `CAST(${valueSql} AS VARCHAR)`
      : _toCastSql(valueSql, typeSql);
  return { sql, codeListIds: [] };
}

/**
 * A Combine expression as SQL: each `{column name}` placeholder replaced by
 * the column's quoted identifier. Use it to check an expression exactly as
 * the combined dataset will run it.
 */
function toExpressionSql(sql: string): string {
  return sql.replace(
    CrosswalkMapping.COMBINE_PLACEHOLDER_PATTERN,
    (_placeholder, name: string) => {
      return quoteSqlIdentifier(name);
    },
  );
}

function _toFillSql(
  options: Readonly<
    CrosswalkSqlCodeLists & {
      fill: Fill | undefined;
      column: CrosswalkSqlColumn;
      codesOutputAs: Crosswalk.CodesOutput;
    }
  >,
): FillSql {
  const { fill, column } = options;
  const typeSql = AvaDataType.toDuckDbTypeSql(column.dataType);
  if (fill === undefined || fill.kind === "empty") {
    return { sql: `CAST(NULL AS ${typeSql})`, codeListIds: [] };
  }
  if (fill.kind === "column") {
    return _toColumnFillSql(fill, column, options);
  }
  if (fill.kind === "constant") {
    const literalSql = quoteSqlLiteral(fill.value);
    const sql =
      typeSql === "VARCHAR" ? literalSql : _toCastSql(literalSql, typeSql);
    return { sql, codeListIds: [] };
  }
  return {
    sql: _toCastSql(`(${toExpressionSql(fill.sql)})`, typeSql),
    codeListIds: [],
  };
}

/**
 * The SQL expression that fills one column of the combined dataset from one
 * layout's datasets, cast to the column's type so a bad value becomes empty
 * instead of failing the query. A column with no fill is a typed NULL. A
 * code list no longer in `codeListsById` leaves the values unconverted.
 * Use it wherever a fill's result is shown, such as an example of a fill's
 * before and after values, so it is exactly what the combined dataset runs.
 */
function toFillSql(
  options: Readonly<
    CrosswalkSqlCodeLists & {
      fill: Fill | undefined;
      column: CrosswalkSqlColumn;
      codesOutputAs: Crosswalk.CodesOutput;
    }
  >,
): string {
  return _toFillSql(options).sql;
}

function _toDatasetsSql(
  layout: Readonly<CrosswalkSqlLayout>,
  hasSourceColumn: boolean,
): string {
  return layout.datasets
    .map((dataset) => {
      const sourceSql = hasSourceColumn
        ? `${quoteSqlLiteral(dataset.name)} AS ${quoteSqlIdentifier(SOURCE_ALIAS)}, `
        : "";
      return `SELECT ${sourceSql}* FROM ${quoteSqlIdentifier(dataset.id)}`;
    })
    .join("\n  UNION ALL BY NAME\n  ");
}

function _toBranch(
  layout: Readonly<CrosswalkSqlLayout>,
  input: Readonly<CrosswalkSqlInput>,
): FillSql {
  const fillSqls = input.columns.map((column) => {
    const fillSql = _toFillSql({
      ...input,
      fill: layout.fillsByColumnId.get(column.id),
      column,
    });
    return {
      ...fillSql,
      sql: `${fillSql.sql} AS ${quoteSqlIdentifier(column.name)}`,
    };
  });
  const sourceItems =
    input.sourceColumnName === undefined
      ? []
      : [
          `CAST(${quoteSqlIdentifier(SOURCE_ALIAS)} AS VARCHAR) AS ${quoteSqlIdentifier(input.sourceColumnName)}`,
        ];
  const selectItems = [
    ...sourceItems,
    ...fillSqls.map((fillSql) => {
      return fillSql.sql;
    }),
  ];
  const datasetsSql = _toDatasetsSql(
    layout,
    input.sourceColumnName !== undefined,
  );
  return {
    sql: `SELECT ${selectItems.join(",\n  ")}\nFROM (\n  ${datasetsSql}\n)`,
    codeListIds: fillSqls.flatMap((fillSql) => {
      return fillSql.codeListIds;
    }),
  };
}

/**
 * The combined dataset's SQL, stacking every layout's datasets, and the
 * columns it outputs. Layouts and datasets stay in the given order.
 *
 * @throws `Error("crosswalk-nothing-to-combine")` when no layout has a
 * dataset, or there is no column to output.
 */
function compile(input: Readonly<CrosswalkSqlInput>): CrosswalkSqlOutput {
  // One `SELECT` per layout with every output aliased, stacked with
  // `UNION ALL BY NAME`. A layout's datasets share their column names, so
  // they stack first with `SELECT *` under each dataset's name.
  const layouts = input.layouts.filter((layout) => {
    return layout.datasets.length > 0;
  });
  const columns = [
    ...(input.sourceColumnName === undefined
      ? []
      : [{ name: input.sourceColumnName, dataType: "varchar" as const }]),
    ...input.columns.map((column) => {
      return { name: column.name, dataType: column.dataType };
    }),
  ];
  if (layouts.length === 0 || columns.length === 0) {
    throw new Error("crosswalk-nothing-to-combine");
  }
  const branches = layouts.map((layout) => {
    return _toBranch(layout, input);
  });
  const usedCodeListIds = branches.flatMap((branch) => {
    return branch.codeListIds;
  });
  return {
    sql: branches
      .map((branch) => {
        return branch.sql;
      })
      .join("\nUNION ALL BY NAME\n"),
    columns,
    usedCodeListIds: [...new Set(usedCodeListIds)].sort(_compareCodePoints),
  };
}

/**
 * Pure rules for compiling a crosswalk into its combined dataset's SQL:
 * each fill's expression, the translation that reconciles codings to the
 * primary list, a governed column's type, and a fingerprint of a code
 * list's pairs, for example to tell whether a list changed since it was
 * embedded. Builds SQL text only; it runs nothing.
 */
export const CrosswalkSqlModule = {
  SOURCE_ALIAS,
  compile,
  toFillSql,
  toExpressionSql,
  toTranslation,
  getTranslationOutputs,
  getGovernedDataType,
  getCodeListFingerprint,
};
