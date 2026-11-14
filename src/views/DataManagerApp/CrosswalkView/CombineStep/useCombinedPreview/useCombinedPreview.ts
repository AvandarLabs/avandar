import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useTaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import type { TaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";

/** How many stacked rows the preview shows. */
export const COMBINED_PREVIEW_ROW_COUNT = 20;

/** One preview row: each column's value as text, undefined when empty. */
export type CombinedPreviewRow = Readonly<Record<string, string | undefined>>;

/** The first stacked rows and how many rows the combined dataset has. */
export type CombinedPreviewResult = {
  rows: CombinedPreviewRow[];
  rowCount: number;
};

/**
 * The preview's two queries over the combined SQL: the first rows with
 * every column cast to text, so dates and big whole numbers read as DuckDB
 * prints them, and the row count.
 */
export function buildCombinedPreviewSql(
  options: Readonly<{ sql: string; columnNames: readonly string[] }>,
): { rowsSql: string; countSql: string } {
  const selects = options.columnNames.map((name) => {
    const identifier = quoteSqlIdentifier(name);
    return `CAST(${identifier} AS VARCHAR) AS ${identifier}`;
  });
  return {
    rowsSql: `SELECT ${selects.join(", ")} FROM (${options.sql}) LIMIT ${COMBINED_PREVIEW_ROW_COUNT}`,
    countSql: `SELECT count(*) AS "rows" FROM (${options.sql})`,
  };
}

function _toPreviewRow(
  row: Readonly<Record<string, unknown>>,
  columnNames: readonly string[],
): CombinedPreviewRow {
  return Object.fromEntries(
    columnNames.map((name) => {
      const value = row[name];
      return [
        name,
        value === null || value === undefined ? undefined : String(value),
      ];
    }),
  );
}

/**
 * Reads the combined dataset's preview on this device: the first rows,
 * then the row count. The first read loads every source dataset, so it can
 * take minutes. Keyed by the SQL and its columns, so a settings change
 * reads again and a late reply is dropped. Nothing is read without SQL.
 */
export function useCombinedPreview(
  options: Readonly<{
    sql: string | undefined;
    columnNames: readonly string[];
  }>,
): TaggedRead<CombinedPreviewResult> {
  const workspace = useCurrentWorkspace();
  const { sql, columnNames } = options;
  return useTaggedRead({
    key: sql === undefined ? undefined : JSON.stringify([sql, columnNames]),
    devMsg: "Reading the combined dataset preview failed",
    read: async () => {
      const { rowsSql, countSql } = buildCombinedPreviewSql({
        sql: sql ?? "",
        columnNames,
      });
      const rows = await WorkspaceQuerySession.runQuery<
        Record<string, unknown>
      >({
        workspaceId: workspace.id,
        rawSql: rowsSql,
      });
      const count = await WorkspaceQuerySession.runQuery<{ rows: unknown }>({
        workspaceId: workspace.id,
        rawSql: countSql,
      });
      return {
        rows: rows.data.map((row) => {
          return _toPreviewRow(row, columnNames);
        }),
        rowCount: Number(count.data[0]?.rows ?? 0),
      };
    },
  });
}
