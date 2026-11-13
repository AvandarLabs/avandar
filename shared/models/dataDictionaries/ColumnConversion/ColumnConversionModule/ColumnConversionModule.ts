import { quoteSqlLiteral } from "@avandar/utils/sql";
import type {
  ColumnConversionCase,
  ColumnConversionOutputType,
  ColumnConversionRows,
  ColumnConversionT,
} from "$/models/dataDictionaries/ColumnConversion/ColumnConversion.types.ts";

/** A whole-number code of at most 18 digits, so it fits a BIGINT. */
const INTEGER_CODE_REGEX = /^-?[0-9]{1,18}$/;

type Binding = ColumnConversionRows["bindings"][number];

type Lookups = {
  columnsById: Map<string, ColumnConversionRows["columns"][number]>;
  codeListsById: Map<string, ColumnConversionRows["codeLists"][number]>;
  copyNamesByBindingId: Map<string, string>;
};

function _isBlank(text: string): boolean {
  return text.trim() === "";
}

/** Trims spaces only, as the SQL `btrim` does, never tabs or newlines. */
function _trimSpaces(text: string): string {
  return text.replace(/^ +| +$/g, "");
}

function _unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * The key a stored value is matched on: its text, trimmed of spaces and
 * lowercased by DuckDB. Every match literal goes through the same functions,
 * so both sides are normalized by one engine.
 */
function toValueKeySql(valueSql: string): string {
  return `lower(trim(CAST(${valueSql} AS VARCHAR)))`;
}

function _toMatchKeySql(match: string): string {
  return `lower(trim(${quoteSqlLiteral(match)}))`;
}

/**
 * The data type a conversion outputs, which the apply RPCs store as the
 * column's `data_type`: `varchar` for labels, and `bigint` for codes when
 * every code is a whole number of at most 18 digits. The SQL in
 * `dataset_columns__dictionary_bindings` follows the same rule.
 */
function getOutputDataType(
  options: Readonly<{
    direction: ColumnConversionT["direction"];
    pairs: ColumnConversionT["pairs"];
  }>,
): "bigint" | "varchar" {
  if (options.direction === "decode" || options.pairs.length === 0) {
    return "varchar";
  }
  const areWholeNumbers = options.pairs.every((pair) => {
    return INTEGER_CODE_REGEX.test(_trimSpaces(pair.code));
  });
  return areWholeNumbers ? "bigint" : "varchar";
}

function _getPairCases(
  conversion: Readonly<ColumnConversionT>,
): ColumnConversionCase[] {
  return conversion.pairs.flatMap((pair) => {
    if (conversion.direction === "decode") {
      return _isBlank(pair.label)
        ? []
        : [{ match: pair.code, output: pair.label }];
    }
    return [pair.label, ...pair.acceptedSpellings]
      .filter((spelling) => {
        return !_isBlank(spelling);
      })
      .map((spelling) => {
        return { match: spelling, output: pair.code };
      });
  });
}

/** What a value mapped to the pair with `code` becomes, if anything. */
function _getMappedOutput(
  conversion: Readonly<ColumnConversionT>,
  code: string,
): string | undefined {
  const pair = conversion.pairs.find((candidate) => {
    return candidate.code === code;
  });
  const output = conversion.direction === "decode" ? pair?.label : pair?.code;
  return output === undefined || _isBlank(output) ? undefined : output;
}

function _getOverrideCases(
  conversion: Readonly<ColumnConversionT>,
): ColumnConversionCase[] {
  return conversion.overrides.flatMap((override): ColumnConversionCase[] => {
    if (override.action === "keep") {
      return [];
    }
    if (override.action === "empty") {
      return [{ match: override.value, output: null }];
    }
    const output = _getMappedOutput(conversion, override.code);
    return output === undefined ? [] : [{ match: override.value, output }];
  });
}

/**
 * The conversion's `WHEN` clauses in the order SQL tries them: the pairs
 * first, so a value a pair matches is never overridden, then the overrides.
 * Decoding matches each code to its label and skips a pair with a blank
 * label, whose code then passes through. Encoding matches each non-blank
 * label and accepted spelling to its code. `keep` overrides add nothing,
 * and a `map` override to a code the pairs no longer hold is dropped.
 */
function getCases(
  conversion: Readonly<ColumnConversionT>,
): ColumnConversionCase[] {
  return [..._getPairCases(conversion), ..._getOverrideCases(conversion)];
}

/** An ordered list's non-blank labels in list order, each once. */
function _getEnumLabels(conversion: Readonly<ColumnConversionT>): string[] {
  const labels = conversion.pairs
    .map((pair) => {
      return pair.label;
    })
    .filter((label) => {
      return !_isBlank(label);
    });
  return _unique(labels);
}

/**
 * The SQL type the converted column comes out as: an `ENUM` of the labels
 * in list order when an ordered list is decoded, so sorting follows the
 * list; otherwise the column's stored type.
 */
function getOutputType(
  conversion: Readonly<ColumnConversionT>,
): ColumnConversionOutputType {
  if (conversion.direction === "decode" && conversion.isOrdered) {
    const labels = _getEnumLabels(conversion);
    if (labels.length > 0) {
      return { kind: "enum", labels };
    }
  }
  return { kind: conversion.outputDataType };
}

/** The `CASE` as text, with no cast of its output. */
function _toCaseExpressionSql(
  valueSql: string,
  cases: readonly ColumnConversionCase[],
): string {
  const textSql = `CAST(${valueSql} AS VARCHAR)`;
  if (cases.length === 0) {
    return textSql;
  }
  const whens = cases.map((conversionCase) => {
    const outputSql =
      conversionCase.output === null
        ? "NULL"
        : quoteSqlLiteral(conversionCase.output);
    return `WHEN ${_toMatchKeySql(conversionCase.match)} THEN ${outputSql}`;
  });
  return `CASE ${toValueKeySql(valueSql)} ${whens.join(" ")} ELSE ${textSql} END`;
}

function _toEnumTypeSql(labels: readonly string[]): string {
  return `ENUM(${_unique(labels).map(quoteSqlLiteral).join(", ")})`;
}

/**
 * The converted value of `valueSql` as one SQL expression. A value no case
 * matches is kept as text. Integer codes are cast to `BIGINT`, so a kept
 * value that is not a number comes out empty. An ordered list's labels
 * become an `ENUM` only when `keptValues` lists every other value the
 * conversion keeps, since only the load-time read knows them and casting a
 * value outside the `ENUM` fails the whole query; without it the labels
 * stay text.
 */
function toCaseSql(
  options: Readonly<{
    valueSql: string;
    conversion: ColumnConversionT;
    keptValues?: readonly string[];
  }>,
): string {
  const expressionSql = _toCaseExpressionSql(
    options.valueSql,
    getCases(options.conversion),
  );
  const outputType = getOutputType(options.conversion);
  if (outputType.kind === "bigint") {
    return `TRY_CAST(${expressionSql} AS BIGINT)`;
  }
  if (outputType.kind === "enum" && options.keptValues !== undefined) {
    const labels = [...outputType.labels, ...options.keptValues];
    return `CAST(${expressionSql} AS ${_toEnumTypeSql(labels)})`;
  }
  return expressionSql;
}

/**
 * A query for every value an ordered list's conversion keeps that is not
 * one of its labels, sorted, as one `kept_value` column. Its rows are the
 * `keptValues` that complete the column's `ENUM`.
 */
function toKeptValuesSql(
  options: Readonly<{
    relationSql: string;
    valueSql: string;
    conversion: ColumnConversionT;
  }>,
): string {
  const expressionSql = _toCaseExpressionSql(
    options.valueSql,
    getCases(options.conversion),
  );
  const labels = _getEnumLabels(options.conversion);
  const notListedSql =
    labels.length === 0
      ? ""
      : ` AND kept_value NOT IN (${labels.map(quoteSqlLiteral).join(", ")})`;
  return `SELECT DISTINCT kept_value FROM (SELECT ${expressionSql} AS kept_value FROM ${options.relationSql}) WHERE kept_value IS NOT NULL${notListedSql} ORDER BY kept_value`;
}

/**
 * A query for the stored values no pair matches, as exactly two columns:
 * `"value"`, the stored value as text, and `"rows"`, a `BIGINT` count,
 * most rows first, then by value, at most `limit` rows. Overrides are
 * ignored: it lists every value no pair matches, and a caller drops the
 * ones it has resolved. Used by the apply flow's Unmatched values step.
 *
 * @throws When `limit` is not a positive whole number.
 */
function toUnmatchedValuesSql(
  options: Readonly<{
    relationSql: string;
    valueSql: string;
    conversion: ColumnConversionT;
    limit: number;
  }>,
): string {
  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error(
      `An unmatched values limit must be a positive integer, not ${options.limit}`,
    );
  }
  const matchKeysSql = _getPairCases(options.conversion).map(
    (conversionCase) => {
      return _toMatchKeySql(conversionCase.match);
    },
  );
  const unmatchedSql =
    matchKeysSql.length === 0
      ? ""
      : ` AND ${toValueKeySql(options.valueSql)} NOT IN (${matchKeysSql.join(", ")})`;
  return `SELECT CAST(${options.valueSql} AS VARCHAR) AS "value", count(*) AS "rows" FROM ${options.relationSql} WHERE ${options.valueSql} IS NOT NULL${unmatchedSql} GROUP BY 1 ORDER BY "rows" DESC, "value" LIMIT ${options.limit}`;
}

function _byId<Row extends { id: string }>(
  rows: readonly Row[],
): Map<string, Row> {
  return new Map(
    rows.map((row) => {
      return [row.id, row] as const;
    }),
  );
}

function _getCopyNamesByBindingId(
  columns: ColumnConversionRows["columns"],
): Map<string, string> {
  return new Map(
    columns.flatMap((column) => {
      return column.dictionaryBindingId === undefined
        ? []
        : [[column.dictionaryBindingId, column.name] as const];
    }),
  );
}

function _toConversion(
  binding: Binding,
  lookups: Lookups,
): ColumnConversionT | undefined {
  const column = lookups.columnsById.get(binding.datasetColumnId);
  const codeList =
    binding.codeListId === undefined
      ? undefined
      : lookups.codeListsById.get(binding.codeListId);
  const pairs = binding.pinnedPairs ?? codeList?.pairs;
  if (binding.mode !== "convert" || !column || pairs === undefined) {
    return undefined;
  }
  return {
    datasetColumnId: binding.datasetColumnId,
    direction: binding.direction,
    pairs,
    isOrdered:
      binding.pinnedPairs === undefined
        ? (codeList?.isOrdered ?? false)
        : (binding.pinnedIsOrdered ?? false),
    overrides: binding.valueOverrides,
    keepsOriginalAs: binding.keepsOriginal
      ? lookups.copyNamesByBindingId.get(binding.id)
      : undefined,
    outputDataType: column.dataType === "bigint" ? "bigint" : "varchar",
    inputDataType: binding.replacedDataType,
  };
}

/**
 * Each convert binding's conversion, by dataset column id. Pinned pairs win
 * over the live list. A reference binding, a binding whose column is not
 * among `rows.columns`, and a live binding whose code list is not among
 * `rows.codeLists` convert nothing and are left out. Pass every column of
 * the dataset, keep-original copies included, so `keepsOriginalAs` can be
 * found.
 */
function fromRows(
  rows: Readonly<ColumnConversionRows>,
): Map<string, ColumnConversionT> {
  const lookups: Lookups = {
    columnsById: _byId(rows.columns),
    codeListsById: _byId(rows.codeLists),
    copyNamesByBindingId: _getCopyNamesByBindingId(rows.columns),
  };
  const result = new Map<string, ColumnConversionT>();
  rows.bindings.forEach((binding) => {
    const conversion = _toConversion(binding, lookups);
    if (conversion !== undefined) {
      result.set(binding.datasetColumnId, conversion);
    }
  });
  return result;
}

/**
 * Pure rules for converting a column with a dictionary: which `WHEN`
 * clauses, which output type, and the SQL that converts, finds kept values,
 * and finds unmatched values. Used by the load-time view, the apply flow's
 * preview and Unmatched values step, and their tests.
 */
export const ColumnConversionModule = {
  fromRows,
  getCases,
  getOutputType,
  getOutputDataType,
  toValueKeySql,
  toCaseSql,
  toKeptValuesSql,
  toUnmatchedValuesSql,
};
