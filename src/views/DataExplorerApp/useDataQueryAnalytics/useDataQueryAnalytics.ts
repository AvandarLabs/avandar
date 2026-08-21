import { matchLiteral } from "@avandar/utils";
import { useEffect, useRef } from "react";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { QueryAnalyticsPayloads } from "@/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { DataQueryRunMetadata } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMetadata.types";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  AnalyticsApp,
  QueryAnalyticsSurface,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { RefObject } from "react";

/**
 * The parts of the query observer the emitter reads.
 *
 * Narrowed to exactly these two so a caller cannot be misread as supplying the
 * run's own relations: every payload field is built from the run record
 * instead.
 */
export type QueryAnalyticsObserverState = Pick<
  UseQueryResult<QueryResult.T<UnknownRow>>,
  "status" | "fetchStatus"
>;

/** The app surface each query surface reports its events under. */
function _getAppFromSurface(surface: QueryAnalyticsSurface): AnalyticsApp {
  return matchLiteral(surface, {
    data_explorer: "data_explorer",
    dashboard_block: "dashboards",
    viz_config: "dashboards",
  } as const);
}

/**
 * Records `query.ran` and `query.failed` once per settled query execution.
 *
 * A cache hit is not a run, and a failure that React Query retried is one
 * event rather than two.
 *
 * A failure is reported only when the query function recorded its run. That is
 * what keeps an error still sitting in the cache from being reported again
 * every time the component remounts.
 *
 * `query.ran` is deliberately restricted to the Data Explorer. A dashboard
 * with twelve blocks would otherwise report twelve queries per page view.
 *
 * Failures are recorded from workspace-authenticated surfaces only. Both
 * snapshot modes (`public` and `workspace_published`) identify themselves by
 * dashboard rather than workspace, so there is no workspace to attribute their
 * events to and they record nothing, even though `workspace_published` does
 * carry a session.
 */
export function useDataQueryAnalytics(
  options: Readonly<{
    surface: QueryAnalyticsSurface;
    /**
     * Undefined on both snapshot modes, which identify themselves by dashboard
     * and so have no workspace to attribute an event to.
     */
    workspaceId: Workspace.Id | undefined;
    runMetadataRef: RefObject<DataQueryRunMetadata | undefined>;
    queryResult: QueryAnalyticsObserverState;
  }>,
): void {
  const { surface, workspaceId, runMetadataRef, queryResult } = options;
  const lastEmittedRunIdRef = useRef<number | undefined>(undefined);
  const { status, fetchStatus } = queryResult;

  useEffect(
    function emitSettledQueryAnalytics() {
      const runMetadata = runMetadataRef.current;
      // A cache hit serves data without invoking the query function, so an
      // absent record means no run happened rather than no data yet.
      if (workspaceId === undefined || runMetadata === undefined) {
        return;
      }
      // A pending query has not settled, and a query still fetching is
      // mid-retry. Waiting for both is what collapses a retried pair into one
      // event. This reads `fetchStatus` rather than `isFetching`, which covers
      // only the "fetching" half: a retry that paused because the tab was
      // hidden or the device went offline is still in flight, and treating it
      // as settled reports the attempt that just failed as a finished run.
      if (fetchStatus !== "idle" || status === "pending") {
        return;
      }
      // The run id is the only thing that separates "a new run finished" from
      // "React re-rendered", which the effect's dependencies cannot tell apart.
      if (runMetadata.runId === lastEmittedRunIdRef.current) {
        return;
      }

      // The run's own outcome, not the observer's status. The observer can
      // report success over stale cached data while the attempt that just ran
      // failed.
      if (runMetadata.outcome === "error") {
        lastEmittedRunIdRef.current = runMetadata.runId;
        void AnalyticsClient.logEvent({
          event: "query.failed",
          workspaceId,
          app: _getAppFromSurface(surface),
          payload: QueryAnalyticsPayloads.fromError({
            surface,
            runMetadata,
          }),
        });
        return;
      }

      if (surface !== "data_explorer") {
        return;
      }

      lastEmittedRunIdRef.current = runMetadata.runId;
      void AnalyticsClient.logEvent({
        event: "query.ran",
        workspaceId,
        app: "data_explorer",
        // Built entirely from the run's own record. Reading the row and column
        // counts off the observer would pair them with whichever query is
        // backing `data` now, which is not necessarily the one that just ran.
        payload: QueryAnalyticsPayloads.fromResult({ runMetadata }),
      });
    },
    [status, fetchStatus, workspaceId, surface, runMetadataRef],
  );
}
