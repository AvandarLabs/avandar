import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { DateFormatSql } from "@/lib/crosswalks/detectDateFormats/DateFormatSql/DateFormatSql";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DateFormatCountsRow } from "@/lib/crosswalks/detectDateFormats/DateFormatSql/DateFormatSql";

/**
 * The first date format, of `DATE_FORMATS`, that parses 90% or more of
 * each text column's sample, by column name. A column no format reaches is
 * left out. It runs on this device through the QETL query layer and reads
 * the dataset's own view, which is what the combined dataset reads, with
 * one query for every column. Pass only text columns.
 */
export async function detectDateFormats(
  options: Readonly<{
    workspaceId: Workspace.Id;
    datasetId: Dataset.Id;
    columnNames: readonly string[];
  }>,
): Promise<Map<string, string>> {
  const { datasetId, columnNames } = options;
  if (columnNames.length === 0) {
    return new Map();
  }
  const result = await WorkspaceQuerySession.runQuery<DateFormatCountsRow>({
    workspaceId: options.workspaceId,
    neededColumnsByDatasetId: { [datasetId]: [...columnNames] },
    rawSql: DateFormatSql.buildDetectSql({
      relationName: datasetId,
      columnNames,
    }),
  });
  return DateFormatSql.pickFormats({ columnNames, row: result.data[0] ?? {} });
}
