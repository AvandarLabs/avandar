import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";

/**
 * Runs SQL that reads a data slot's source in the browser's DuckDB, with
 * the current user's own access to that source. For a dataset it names the
 * columns to load, the given `fields` or every field of the source, so the
 * engine does not have to infer them from the SQL, each column once even when
 * several slot attributes map to it. A case type's view plans its own columns.
 *
 * Use it for SQL made by `makeDataSlotSqlFromBinding`, or SQL that wraps it,
 * for example a count over a slot's rows.
 */
export async function runDataSlotQuery(
  options: Readonly<{
    workspaceId: Workspace.Id;
    source: DataSlotSource;
    sql: string;
    fields?: readonly DataSlotSourceField[];
  }>,
): Promise<QueryResult.T> {
  const { workspaceId, source, sql, fields = source.fields } = options;
  return await WorkspaceQuerySession.runQuery({
    rawSql: sql,
    workspaceId,
    neededColumnsByDatasetId:
      source.kind === "dataset"
        ? {
            [source.datasetId]: [
              ...new Set(
                fields.map((field) => {
                  return field.columnName;
                }),
              ),
            ],
          }
        : undefined,
  });
}
