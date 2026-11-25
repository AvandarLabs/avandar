import { prop } from "@avandar/utils";
import { getRawValuesViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  ColumnValueRow,
  ProfiledColumn,
} from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";

async function _readValueRows(
  options: Readonly<{
    workspaceId: Workspace.Id;
    dataset: Readonly<{ id: Dataset.Id }>;
    listedColumns: ReadonlyArray<{ index: number; name: string }>;
    relationName: string;
  }>,
): Promise<ColumnValueRow[]> {
  const { dataset, listedColumns } = options;
  if (listedColumns.length === 0) {
    return [];
  }
  const result = await WorkspaceQuerySession.runQuery<ColumnValueRow>({
    workspaceId: options.workspaceId,
    neededColumnsByDatasetId: {
      [dataset.id]: listedColumns.map(prop("name")),
    },
    rawSql: ColumnProfileSql.buildValuesSql({
      datasetId: dataset.id,
      relationName: options.relationName,
      columns: listedColumns,
    }),
  });
  return result.data;
}

/**
 * Profiles one dataset's columns on this device through the QETL query
 * layer, so it works for any dataset the workspace can query, offline-only
 * ones included. Rows stay in DuckDB; only counts, ranges, and the values
 * of short columns come back. Used when a dictionary is learned from
 * datasets. With `readsRawValues`, a converted dataset is read as stored,
 * which is what matching it against dictionaries needs.
 */
export async function profileDatasetColumns(
  options: Readonly<{
    workspaceId: Workspace.Id;
    dataset: Readonly<{ id: Dataset.Id; name: string }>;
    columns: readonly ProfiledColumn[];
    /**
     * Read the values as stored, through the dataset's raw-values view,
     * rather than as its conversions show them.
     */
    readsRawValues?: boolean;
  }>,
): Promise<ColumnProfile.T[]> {
  const { workspaceId, dataset, columns } = options;
  if (columns.length === 0) {
    return [];
  }
  const relationName = options.readsRawValues
    ? getRawValuesViewName(dataset.id)
    : dataset.id;
  const summary = await WorkspaceQuerySession.runQuery({
    workspaceId,
    neededColumnsByDatasetId: {
      [dataset.id]: columns.map(prop("name")),
    },
    rawSql: ColumnProfileSql.buildSummarySql({
      datasetId: dataset.id,
      relationName,
      columns,
    }),
  });
  const summaryRow = summary.data[0] ?? {};
  const listedColumnIndexes = ColumnProfileSql.getListedColumnIndexes({
    columns,
    summaryRow,
  });
  const listedColumns = [...listedColumnIndexes].flatMap((index) => {
    const column = columns[index];
    return column ? [{ index, name: column.name }] : [];
  });
  const valueRows = await _readValueRows({
    workspaceId,
    dataset,
    listedColumns,
    relationName,
  });
  return ColumnProfileSql.makeColumnProfilesFromRows({
    dataset,
    columns,
    summaryRow,
    valueRows,
    listedColumnIndexes,
  });
}
