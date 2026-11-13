import { isDefined } from "@avandar/utils";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnReplacement } from "@/clients/qetl/QueryMediator/QueryMediator.types";

const NO_CONVERSIONS: ReadonlyMap<string, ColumnConversion.T> = new Map();

/**
 * A renamed or retyped column's replacement, or undefined when it loads as
 * stored.
 */
function _toRenameOrCast(
  column: Readonly<DatasetColumn.T>,
): ColumnReplacement | undefined {
  const hasChangedName = column.name !== column.originalName;
  const hasChangedDataType =
    column.dataType !==
    DuckDbDataTypeUtils.toAvaDataType(column.detectedDataType);
  return hasChangedName || hasChangedDataType
    ? {
        originalName: column.originalName,
        alias: hasChangedName ? column.name : undefined,
        dataType: hasChangedDataType
          ? DuckDbDataTypeUtils.fromDatasetColumnType(column.dataType)
          : undefined,
      }
    : undefined;
}

/**
 * The cast a keep-original copy's own catalog row asks for, read from the
 * copy (a keep-original row named `keepsOriginalAs`), or undefined when it
 * loads as stored or no copy is kept.
 */
function _getOriginalCopyDataType(
  columns: readonly DatasetColumn.T[],
  conversion: ColumnConversion.T,
): ColumnReplacement["originalCopyDataType"] {
  const copy = columns.find((candidate) => {
    return (
      candidate.dictionaryBindingId !== undefined &&
      candidate.name === conversion.keepsOriginalAs
    );
  });
  return copy &&
    copy.dataType !== DuckDbDataTypeUtils.toAvaDataType(copy.detectedDataType)
    ? DuckDbDataTypeUtils.fromDatasetColumnType(copy.dataType)
    : undefined;
}

/**
 * The cast a converted column's values take before they are converted: the
 * column's type before converting, when it differs from the type the column
 * loads as. The `CASE` reads the cast value, so text-stored `"01"` typed
 * `bigint` matches code `1`.
 */
function _getInputDataType(
  column: Readonly<DatasetColumn.T>,
  conversion: ColumnConversion.T,
): ColumnReplacement["dataType"] {
  const { inputDataType } = conversion;
  return inputDataType !== undefined &&
    inputDataType !== DuckDbDataTypeUtils.toAvaDataType(column.detectedDataType)
    ? DuckDbDataTypeUtils.fromDatasetColumnType(inputDataType)
    : undefined;
}

/**
 * A converted column's replacement: renamed as stored, cast to its type
 * before converting, translated by its conversion (whose output type is what
 * the column becomes), with its keep-original copy cast as the copy's row
 * says.
 */
function _toConversion(
  column: Readonly<DatasetColumn.T>,
  conversion: ColumnConversion.T,
  columns: readonly DatasetColumn.T[],
): ColumnReplacement {
  return {
    originalName: column.originalName,
    alias: column.name !== column.originalName ? column.name : undefined,
    dataType: _getInputDataType(column, conversion),
    valueMapping: conversion,
    originalCopyDataType: _getOriginalCopyDataType(columns, conversion),
  };
}

/**
 * The renames, casts, and conversions that turn a relation's loaded columns
 * into the columns its dataset stores: a column whose stored name differs
 * from its original one is aliased, a column whose stored type differs from
 * the type it loaded as is cast, and a column with a convert binding is
 * translated by its conversion. On a converted column, `dataType` is the cast
 * applied before converting (its type before converting), and the
 * conversion's output type is what it becomes. A `source-schema` relation
 * loads every column as text, so each of its non-text columns is cast to the
 * type its schema declared. A keep-original copy is left out: the conversion
 * it belongs to renders it, cast by `originalCopyDataType` when the copy's
 * own row asks for a cast. `columns` must hold every column of the dataset,
 * copies included, before any narrowing to a loaded subset.
 *
 * @param conversions Each converted column's conversion, by dataset column id.
 * @returns One replacement for each column that needs one.
 */
export function getColumnReplacementsFromColumns(
  columns: readonly DatasetColumn.T[],
  conversions: ReadonlyMap<string, ColumnConversion.T> = NO_CONVERSIONS,
): ColumnReplacement[] {
  return columns
    .map((column) => {
      if (column.dictionaryBindingId !== undefined) {
        return undefined;
      }
      const conversion = conversions.get(column.id);
      return conversion
        ? _toConversion(column, conversion, columns)
        : _toRenameOrCast(column);
    })
    .filter(isDefined);
}

/** A value with every object's keys sorted and undefined keys dropped. */
function _toStableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(_toStableValue);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .flatMap((key) => {
        return record[key] === undefined
          ? []
          : [[key, _toStableValue(record[key])]];
      }),
  );
}

/**
 * A key that names a dataset's projection: equal for equal replacements in
 * any order, and different as soon as a rename, cast, pair, override, or
 * output type changes. The queryable tier records it with each loaded view,
 * so a view built with another projection is rebuilt.
 */
export function getProjectionKey(
  replacements: readonly ColumnReplacement[],
): string {
  const sorted = [...replacements].sort((replacementA, replacementB) => {
    return replacementA.originalName < replacementB.originalName ? -1 : 1;
  });
  return JSON.stringify(sorted.map(_toStableValue));
}
