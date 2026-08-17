import { Model } from "@avandar/models";
import { useQuery } from "@avandar/query-hooks";
import { prop, sortObjList } from "@avandar/utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { match } from "ts-pattern";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import { useDataQueryAnalytics } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics";
import { useDataQueryRunRecorder } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  RunStructuredQueryResult,
  StructuredQueryAuth,
} from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { DataQueryRunMetadata } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMetadata.types";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type {
  QueryAnalyticsSurface,
  UserQueryAnalyticsTrigger,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

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
      /**
       * The Data Explorer is the only surface that records `query.ran`, since
       * a dashboard would otherwise report one query per block per page view.
       * It is also the only surface with a user-initiated trigger, so it must
       * say which one caused this run.
       */
      analyticsSurface: "data_explorer";
      analyticsTrigger: UserQueryAnalyticsTrigger;
    }
  | {
      /**
       * Dashboard blocks and viz-config previews run whenever their SQL
       * changes, so they have no trigger to report and record failures only.
       * Failures are recorded from every workspace-authenticated surface.
       * Public pages have no workspace to attribute an event to and record
       * nothing.
       */
      analyticsSurface: Exclude<QueryAnalyticsSurface, "data_explorer">;
      analyticsTrigger?: undefined;
    }
) &
  StructuredQueryAuth;

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

/**
 * Dispatches to the execution path the auth mode calls for.
 *
 * Each arm restates its own fields rather than spreading the auth object: the
 * params type is a discriminated union, and a spread of the union would widen
 * every id to optional and stop matching any arm of it.
 */
async function _runDataQuery(
  options: Readonly<RunDataQueryOptions>,
): Promise<RunStructuredQueryResult> {
  const { query, rawSql, isStructuredQueryInSync } = options;
  return match(options.auth)
    .with({ auth: "workspace" }, ({ workspaceId }) => {
      return runStructuredQueryWithMetadata({
        auth: "workspace",
        workspaceId,
        query,
        rawSql,
        isStructuredQueryInSync,
      });
    })
    .with({ auth: "public" }, ({ publicAvaPageId, snapshotRevision }) => {
      return runStructuredQueryWithMetadata({
        auth: "public",
        publicAvaPageId,
        snapshotRevision,
        query,
        rawSql,
        isStructuredQueryInSync,
      });
    })
    .with(
      { auth: "workspace_published" },
      ({ publicAvaPageId, snapshotRevision }) => {
        return runStructuredQueryWithMetadata({
          auth: "workspace_published",
          publicAvaPageId,
          snapshotRevision,
          query,
          rawSql,
          isStructuredQueryInSync,
        });
      },
    )
    .exhaustive();
}

/**
 * Assembles the analytics payload's account of the SQL's origin and the kind
 * of source the query was pointed at.
 *
 * `source` mirrors the `rawSql === undefined` gate that
 * `runStructuredQueryWithMetadata` uses to choose between raw SQL and the
 * structured path, so changing that gate has to be mirrored here or the
 * recorded value stops matching what actually ran. It is deliberately not a
 * truthiness check: an empty `rawSql` still takes the raw-SQL branch there.
 */
function _buildQuerySourceMeta(
  options: Readonly<{
    dataSource: StructuredQuery.Partial["dataSource"];
    rawSql: string | undefined;
  }>,
): Pick<DataQueryRunMetadata, "source" | "dataSourceType"> {
  const { dataSource, rawSql } = options;
  return {
    source: rawSql === undefined ? "structured" : "rawSql",
    dataSourceType:
      dataSource === undefined ? "none"
      : Model.isOfModelType(dataSource, "Dataset") ? "dataset"
      : "entity",
  };
}

/**
 * This is the main hook in the DataExplorerApp that will query the data.
 * This hook calls the appropriate clients to query the data, which in turn
 * will call the appropriate sub-systems to pull the source data.
 *
 * The `auth` discriminant selects the execution path: `workspace` runs against
 * the workspace client, while `public` and `workspace_published` run against a
 * published snapshot.
 *
 * TODO(jpsyx): we should not support public querying here. That is just
 * a stopgap. We should have a proper usePublicDataQuery hook to handle
 * it properly.
 */
export function useDataQuery(
  options: Readonly<UseDataQueryOptions>,
): UseQueryResultTuple<QueryResult.T<UnknownRow>> {
  const {
    query,
    rawSql,
    isStructuredQueryInSync = true,
    analyticsSurface,
    // Only the Data Explorer arm carries a trigger; the surfaces that run on
    // their own report the render that caused them.
    analyticsTrigger = "block_render",
  } = options;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("id"),
  });
  const queryAuth = _getStructuredQueryAuth(options);
  const { beginRun, runMetadataRef } = useDataQueryRunRecorder({
    ..._buildQuerySourceMeta({ dataSource, rawSql }),
    trigger: analyticsTrigger,
  });

  const queryResult = useQuery({
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
    queryFn: async (): Promise<QueryResult.T<UnknownRow>> => {
      const recordRun = beginRun();
      try {
        const run = await _runDataQuery({
          auth: queryAuth,
          query,
          rawSql,
          isStructuredQueryInSync,
        });
        recordRun({
          outcome: "success",
          didAutoLimit: run.didAutoLimit,
          rowCount: run.result.numRows,
          columnCount: run.result.columns.length,
        });
        return run.result;
      } catch (error) {
        // Not just a rethrow: the emitter reads an absent record as "no run
        // happened", so an unrecorded failure is never reported. Connectivity
        // is sampled here rather than at emit time, which can be much later.
        recordRun({ outcome: "error", error, isOffline: !navigator.onLine });
        throw error;
      }
    },
  });

  const [, , dataQuery] = queryResult;
  useDataQueryAnalytics({
    surface: analyticsSurface,
    // Only the workspace mode carries a workspace id. Both snapshot modes
    // identify themselves by dashboard, and a dashboard id is not something an
    // event can be attributed to, so those record nothing.
    workspaceId:
      queryAuth.auth === "workspace" ? queryAuth.workspaceId : undefined,
    runMetadataRef,
    queryResult: dataQuery,
  });

  return queryResult;
}
