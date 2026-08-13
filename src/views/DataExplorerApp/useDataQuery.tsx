import { useQuery } from "@avandar/query-hooks";
import { prop, sortObjList } from "@avandar/utils";
import { DashboardId } from "$/models/Dashboard/Dashboard.types";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type UseDataQueryOptions = {
  query: StructuredQuery.Partial;
  rawSql: string | undefined;
  /**
   * When true, `rawSql` was generated from the manual form and row-count guard
   * logic may replace it with bounded SQL before execution.
   */
  isStructuredQueryInSync?: boolean;
} & (
  | {
      auth: "workspace";
      workspaceId: Workspace.Id;
    }
  | {
      auth: "public";
      publicAvaPageId: DashboardId;
    }
);

/**
 * This is the main hook in the DataExplorerApp that will query the data.
 * This hook calls the appropriate clients to query the data, which in turn
 * will call the appropriate sub-systems to pull the source data.
 *
 * If the workspaceId is `undefined` then the query will be run as a public
 * user.
 *
 * TODO(jpsyx): we should not support public querying here. That is just
 * a stopgap. We should have a proper usePublicDataQuery hook to handle
 * it properly.
 */
export function useDataQuery(
  options: UseDataQueryOptions,
): UseQueryResultTuple<QueryResult<UnknownRow>> {
  const { auth, query, rawSql, isStructuredQueryInSync = true } = options;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("id"),
  });
  const workspaceId =
    auth === "workspace" ? options.workspaceId : options.publicAvaPageId;

  const queryResult = useQuery({
    enabled: !!dataSource || !!rawSql,
    queryKey: [
      auth,
      workspaceId,
      query,
      "rawSql",
      rawSql,
      "dataSource",
      dataSource,
      "select",
      sortedQueryColumns,
      "structuredInSync",
      isStructuredQueryInSync,
    ],
    queryFn: async (): Promise<QueryResult<UnknownRow>> => {
      // Branching rather than spreading a precomputed params object: the
      // queryKey lint rule tracks the identifiers this callback reads, and
      // only the if/else form lets it see the two ids as mutually exclusive.
      // Both are already carried in the key as `workspaceId` above.
      if (auth === "workspace") {
        return await runStructuredQuery({
          auth: "workspace",
          workspaceId: options.workspaceId,
          query,
          rawSql,
          isStructuredQueryInSync,
        });
      } else {
        return await runStructuredQuery({
          auth: "public",
          publicAvaPageId: options.publicAvaPageId,
          query,
          rawSql,
          isStructuredQueryInSync,
        });
      }
    },
  });

  return queryResult;
}
