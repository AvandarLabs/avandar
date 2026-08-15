import { useQuery } from "@avandar/query-hooks";
import { prop, sortObjList } from "@avandar/utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { match } from "ts-pattern";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

type UseDataQueryOptions = {
  query: StructuredQuery.Partial;
  rawSql: string | undefined;
  /**
   * When true, `rawSql` was generated from the manual form and row-count guard
   * logic may replace it with bounded SQL before execution.
   */
  isStructuredQueryInSync?: boolean;
} & StructuredQueryAuth;

type RunDataQueryOptions = {
  auth: StructuredQueryAuth;
  query: StructuredQuery.Partial;
  rawSql: string | undefined;
  isStructuredQueryInSync: boolean;
};

function _getStructuredQueryAuth(
  options: Readonly<UseDataQueryOptions>,
): StructuredQueryAuth {
  return match(options)
    .with({ auth: "workspace" }, ({ workspaceId }) => {
      return {
        auth: "workspace" as const,
        workspaceId,
      };
    })
    .with({ auth: "public" }, ({ publicAvaPageId, snapshotRevision }) => {
      return {
        auth: "public" as const,
        publicAvaPageId,
        snapshotRevision,
      };
    })
    .with(
      { auth: "workspace_published" },
      ({ publicAvaPageId, snapshotRevision }) => {
        return {
          auth: "workspace_published" as const,
          publicAvaPageId,
          snapshotRevision,
        };
      },
    )
    .exhaustive();
}

async function _runDataQuery(
  options: Readonly<RunDataQueryOptions>,
): Promise<QueryResult.T<UnknownRow>> {
  return match(options.auth)
    .with({ auth: "workspace" }, ({ workspaceId }) => {
      return runStructuredQuery({ ...options, auth: "workspace", workspaceId });
    })
    .with({ auth: "public" }, ({ publicAvaPageId, snapshotRevision }) => {
      return runStructuredQuery({
        ...options,
        auth: "public",
        publicAvaPageId,
        snapshotRevision,
      });
    })
    .with(
      { auth: "workspace_published" },
      ({ publicAvaPageId, snapshotRevision }) => {
        return runStructuredQuery({
          ...options,
          auth: "workspace_published",
          publicAvaPageId,
          snapshotRevision,
        });
      },
    )
    .exhaustive();
}

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
  options: Readonly<UseDataQueryOptions>,
): UseQueryResultTuple<QueryResult.T<UnknownRow>> {
  const { query, rawSql, isStructuredQueryInSync = true } = options;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("id"),
  });
  const queryAuth = _getStructuredQueryAuth(options);
  return useQuery({
    enabled: !!dataSource || !!rawSql,
    queryKey: [
      queryAuth,
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
    queryFn: () => {
      return _runDataQuery({
        auth: queryAuth,
        query,
        rawSql,
        isStructuredQueryInSync,
      });
    },
  });
}
