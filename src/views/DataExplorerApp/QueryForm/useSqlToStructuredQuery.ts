import { where } from "@avandar/utils";
import { sqlToStructuredQuery } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery";
import { useCallback } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { buildSqlMappingDatasets } from "@/views/DataExplorerApp/QueryForm/buildSqlMappingDatasets";
import type { SqlMappingResult } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery";

/**
 * Provides a memoised `parseSql` callback that uses the current workspace's
 * datasets and columns to resolve table/column references in arbitrary SQL.
 *
 * Loading happens lazily through React Query in the underlying clients. The
 * memoized callback is pure and may be used to derive render state.
 */
export function useSqlToStructuredQuery(): {
  parseSql: (sql: string) => SqlMappingResult;
  isReady: boolean;
} {
  const workspace = useCurrentWorkspace();
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [allColumns] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const isReady = datasets !== undefined && allColumns !== undefined;

  const parseSql = useCallback(
    (sql: string): SqlMappingResult => {
      return sqlToStructuredQuery({
        sql,
        datasets: buildSqlMappingDatasets(datasets ?? [], allColumns ?? []),
      });
    },
    [datasets, allColumns],
  );

  return { parseSql, isReady };
}
