import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import { getRawValuesViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useTaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { TaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";

/** How many rows the preview shows. */
export const PREVIEW_ROW_COUNT = 50;

/** One column of the preview, and the conversion it would get, if any. */
export type PreviewColumn = {
  column: DatasetColumn.T;
  conversion: ColumnConversion.T | undefined;
};

/** One cell: the value as stored, and what it becomes when converted. */
export type PreviewCell = { raw: string; converted: string | undefined };

/** One row's cells, in the order of the preview's columns. */
export type PreviewRow = readonly PreviewCell[];

/**
 * The preview's query: each column's stored value as text, `r<i>`, and
 * for a converted column what it becomes, `c<i>`, over the first rows of
 * the raw-values view. Values are compared as text, the way the
 * conversion keeps an unmatched one.
 */
export function buildPreviewSql(
  options: Readonly<{
    datasetId: Dataset.Id;
    columns: readonly PreviewColumn[];
  }>,
): string {
  const selects = options.columns.flatMap(({ column, conversion }, index) => {
    const valueSql = quoteSqlIdentifier(column.name);
    const raw = `CAST(${valueSql} AS VARCHAR) AS "r${index}"`;
    if (!conversion) {
      return [raw];
    }
    // Without kept values an ordered list renders as text, which is what a
    // preview of 50 rows wants: its ENUM needs every value in the data.
    const caseSql = ColumnConversion.toCaseSql({ valueSql, conversion });
    return [raw, `${caseSql} AS "c${index}"`];
  });
  const relation = quoteSqlIdentifier(getRawValuesViewName(options.datasetId));
  return `SELECT ${selects.join(", ")} FROM ${relation} LIMIT ${PREVIEW_ROW_COUNT}`;
}

function _toText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function _toPreviewRows(
  data: ReadonlyArray<Record<string, unknown>>,
  columns: readonly PreviewColumn[],
): PreviewRow[] {
  return data.map((row) => {
    return columns.map(({ conversion }, index) => {
      return {
        raw: _toText(row[`r${index}`]),
        converted: conversion ? _toText(row[`c${index}`]) : undefined,
      };
    });
  });
}

/**
 * Reads the preview drawer's rows on this device, only while it is open:
 * the first rows as stored, beside what each converted column turns them
 * into with the picks, resolutions, and added values as they are now.
 */
export function usePreviewRows(
  options: Readonly<{
    dataset: Dataset.T;
    columns: readonly PreviewColumn[];
    isEnabled: boolean;
  }>,
): TaggedRead<PreviewRow[]> {
  const workspace = useCurrentWorkspace();
  const { dataset, columns } = options;
  const key = options.isEnabled
    ? JSON.stringify([
        dataset.id,
        ...columns.map((item) => {
          return [item.column.id, item.column.name, item.conversion ?? null];
        }),
      ])
    : undefined;
  return useTaggedRead({
    key,
    devMsg: "Reading the apply preview failed",
    read: async () => {
      const result = await WorkspaceQuerySession.runQuery<
        Record<string, unknown>
      >({
        workspaceId: workspace.id,
        neededColumnsByDatasetId: {
          [dataset.id]: columns.map((item) => {
            return item.column.name;
          }),
        },
        rawSql: buildPreviewSql({ datasetId: dataset.id, columns }),
      });
      return _toPreviewRows(result.data, columns);
    },
  });
}
