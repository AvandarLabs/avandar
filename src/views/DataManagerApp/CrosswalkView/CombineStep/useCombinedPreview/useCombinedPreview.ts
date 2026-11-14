import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useTaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import { useCombiningProgress } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombiningProgress/useCombiningProgress";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { TaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import type { CombiningProgressCount } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombiningProgress/useCombiningProgress";

/** How many stacked rows the preview shows. */
export const COMBINED_PREVIEW_ROW_COUNT = 20;

/** One preview row: each column's value as text, undefined when empty. */
export type CombinedPreviewRow = Readonly<Record<string, string | undefined>>;

/** The first stacked rows and how many rows the combined dataset has. */
export type CombinedPreviewResult = {
  rows: CombinedPreviewRow[];
  rowCount: number;
};

/** The preview's read, and how many of the stacked datasets are read so far. */
export type CombinedPreviewRead = TaggedRead<CombinedPreviewResult> & {
  progress: CombiningProgressCount;
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
 * Runs the preview's two queries, the first rows and then the row count,
 * reporting each dataset as relation loading has it in hand.
 */
async function _readCombinedPreview(
  options: Readonly<{
    workspaceId: Workspace.Id;
    sql: string;
    columnNames: readonly string[];
    onRelationFetched: (datasetId: Dataset.Id) => void;
  }>,
): Promise<CombinedPreviewResult> {
  const { workspaceId, columnNames, onRelationFetched } = options;
  const { rowsSql, countSql } = buildCombinedPreviewSql(options);
  const rows = await WorkspaceQuerySession.runQuery<Record<string, unknown>>({
    workspaceId,
    rawSql: rowsSql,
    onRelationFetched,
  });
  const count = await WorkspaceQuerySession.runQuery<{ rows: unknown }>({
    workspaceId,
    rawSql: countSql,
    onRelationFetched,
  });
  return {
    rows: rows.data.map((row) => {
      return _toPreviewRow(row, columnNames);
    }),
    rowCount: Number(count.data[0]?.rows ?? 0),
  };
}

/**
 * Reads the combined dataset's preview on this device: the first rows,
 * then the row count. The first read loads every source dataset, so it can
 * take minutes. `progress` counts the stacked datasets in hand meanwhile,
 * from none for each new read. Keyed by the SQL and its columns, so a
 * settings change reads again and a late reply is dropped. Nothing is read
 * without SQL.
 */
export function useCombinedPreview(
  options: Readonly<{
    sql: string | undefined;
    columnNames: readonly string[];
    /** The datasets the SQL stacks, which the progress counts. */
    datasetIds: readonly Dataset.Id[];
  }>,
): CombinedPreviewRead {
  const workspace = useCurrentWorkspace();
  const { sql, columnNames } = options;
  const progress = useCombiningProgress(options.datasetIds);
  const read = useTaggedRead({
    key: sql === undefined ? undefined : JSON.stringify([sql, columnNames]),
    devMsg: "Reading the combined dataset preview failed",
    read: () => {
      progress.reset();
      return _readCombinedPreview({
        workspaceId: workspace.id,
        sql: sql ?? "",
        columnNames,
        onRelationFetched: progress.onRelationFetched,
      });
    },
  });
  return {
    ...read,
    progress: {
      readCount: progress.readCount,
      totalCount: progress.totalCount,
    },
  };
}
