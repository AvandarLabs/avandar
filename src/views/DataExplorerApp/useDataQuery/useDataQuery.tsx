import { Model } from "@avandar/models";
import { useQuery } from "@avandar/query-hooks";
import { prop, sortObjList } from "@avandar/utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import { useDataQueryAnalytics } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics";
import { useDataQueryRunRecorder } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { RunStructuredQueryResult } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import type {
  DataQueryRunMetadata,
  DataQueryRunOutcome,
} from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMetadata.types";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type {
  QueryAnalyticsSurface,
  UserQueryAnalyticsTrigger,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
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
  (
    | {
        auth: "workspace";
        workspaceId: Workspace.Id;
      }
    | {
        auth: "public";
        publicAvaPageId: Dashboard.Id;
      }
  );

/**
 * Assembles the analytics payload's account of the SQL's origin and the kind
 * of source the query was pointed at.
 *
 * `source` mirrors the truthiness gate `runStructuredQueryWithMetadata` uses
 * to choose between raw SQL and the structured path, so tightening that gate
 * has to be mirrored here or the recorded value stops matching what ran.
 */
function _buildQuerySourceMeta(
  options: Readonly<{
    dataSource: StructuredQuery.Partial["dataSource"];
    rawSql: string | undefined;
  }>,
): Pick<DataQueryRunMetadata, "source" | "dataSourceType"> {
  const { dataSource, rawSql } = options;
  return {
    source: rawSql ? "rawSql" : "structured",
    dataSourceType:
      dataSource === undefined ? "none"
      : Model.isOfModelType(dataSource, "Dataset") ? "dataset"
      : "entity",
  };
}

/**
 * Records a completed run and hands back the result the caller should return.
 *
 * The record carries the run's own result shape rather than leaving the
 * emitter to read it off the query observer, which by the time the run settles
 * can be backing a different query than the one that just executed.
 */
function _finishRun(
  run: RunStructuredQueryResult,
  recordRun: (outcome: DataQueryRunOutcome) => void,
): QueryResult.T<UnknownRow> {
  recordRun({
    outcome: "success",
    didAutoLimit: run.didAutoLimit,
    rowCount: run.result.numRows,
    columnCount: run.result.columns.length,
  });
  return run.result;
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
  options: UseDataQueryOptions,
): UseQueryResultTuple<QueryResult.T<UnknownRow>> {
  const {
    auth,
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
  const queryScopeId =
    auth === "workspace" ? options.workspaceId : options.publicAvaPageId;
  const { beginRun, runMetadataRef } = useDataQueryRunRecorder(
    _buildQuerySourceMeta({ dataSource, rawSql }),
  );

  const queryResult = useQuery({
    enabled: !!dataSource || !!rawSql,
    queryKey: [
      auth,
      queryScopeId,
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
        // Branching rather than spreading a precomputed params object: the
        // queryKey lint rule tracks the identifiers this callback reads, and
        // only the if/else form lets it see the two ids as mutually exclusive.
        // Both are already carried in the key as `queryScopeId` above.
        if (auth === "workspace") {
          return _finishRun(
            await runStructuredQueryWithMetadata({
              auth: "workspace",
              workspaceId: options.workspaceId,
              query,
              rawSql,
              isStructuredQueryInSync,
            }),
            recordRun,
          );
        }
        return _finishRun(
          await runStructuredQueryWithMetadata({
            auth: "public",
            publicAvaPageId: options.publicAvaPageId,
            query,
            rawSql,
            isStructuredQueryInSync,
          }),
          recordRun,
        );
      } catch (error) {
        // Not just a rethrow: the emitter reads an absent record as "no run
        // happened", so an unrecorded failure is never reported.
        recordRun({ outcome: "error", error });
        throw error;
      }
    },
  });

  const [, , dataQuery] = queryResult;
  useDataQueryAnalytics({
    surface: analyticsSurface,
    trigger: analyticsTrigger,
    // Deliberately not `queryScopeId`: on a public page that holds a dashboard
    // id, and there is no workspace to attribute the event to.
    workspaceId: auth === "workspace" ? options.workspaceId : undefined,
    runMetadataRef,
    queryResult: dataQuery,
  });

  return queryResult;
}
