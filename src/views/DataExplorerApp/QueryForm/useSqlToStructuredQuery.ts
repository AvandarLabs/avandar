import { where } from "@utils";
import { useCallback } from "react";
import { sqlToStructuredQuery } from "$/models/queries/StructuredQuery/sqlToStructuredQuery";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { SqlMappingResult } from "$/models/queries/StructuredQuery/sqlToStructuredQuery";

/**
 * Provides a memoised `parseSql` callback that uses the current workspace's
 * datasets and columns to resolve table/column references in arbitrary SQL.
 *
 * Loading happens lazily through React Query in the underlying clients; the
 * callback should be invoked from event handlers, not render bodies.
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
      const datasetList = (datasets ?? []).map((dataset) => {
        const columns = (allColumns ?? []).filter((col) => {
          return col.datasetId === dataset.id;
        });
        return { dataset, columns };
      });
      return sqlToStructuredQuery({ sql, datasets: datasetList });
    },
    [datasets, allColumns],
  );

  return { parseSql, isReady };
}
