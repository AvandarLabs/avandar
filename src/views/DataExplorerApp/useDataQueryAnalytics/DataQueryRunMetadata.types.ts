import type { AnalyticsEventPayloads } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";

/**
 * What the run produced, reported by the query function as it settles.
 *
 * A run that threw made no auto-limit decision and returned no rows, so the
 * error arm carries neither.
 */
export type DataQueryRunOutcome =
  | {
      outcome: "success";
      didAutoLimit: AnalyticsEventPayloads["query.ran"]["didAutoLimit"];
      rowCount: AnalyticsEventPayloads["query.ran"]["rowCount"];
      columnCount: AnalyticsEventPayloads["query.ran"]["columnCount"];
    }
  | {
      outcome: "error";
      /**
       * The error this run threw. Carried here rather than read off the query
       * observer, whose `error` is null whenever it is still serving an older
       * successful result.
       */
      error: unknown;
      /**
       * Whether the device was offline when the run failed, sampled in the
       * `catch` rather than at emit time. Connectivity can change between the
       * two, and offline deliberately outranks the message when classifying.
       */
      isOffline: boolean;
    };

/**
 * What one invocation of the data query function left behind.
 *
 * Written by the query function and read by the effect that emits analytics
 * after the query settles. React Query retries once by default, so a single
 * user-visible failure runs the query function twice; `runId` increments per
 * invocation so the emitter can tell "a new run finished" from "React
 * re-rendered", and the last write wins.
 *
 * The record is deliberately self-contained: it carries its own outcome and
 * its own result shape rather than letting the emitter read those off the
 * query observer. Both couplings were wrong in ways the observer cannot
 * detect. A run superseded by a switch to an already-cached key is never
 * cancelled and still writes its record, while the observer has moved on to
 * the other query's `data`, so the emitter would pair one run's duration with
 * another run's row count. Separately, a retry that pauses (hidden tab, or
 * offline) leaves the observer reporting `success` over stale cached data
 * while the attempt that just ran actually failed.
 */
export type DataQueryRunMetadata = {
  runId: number;
  durationMs: number;
  source: AnalyticsEventPayloads["query.ran"]["source"];
  dataSourceType: AnalyticsEventPayloads["query.ran"]["dataSourceType"];
  /**
   * The trigger in effect when the run STARTED. Captured here because the
   * Data Explorer stamps a new trigger on actions that do not change the query
   * key, so the value at emit time can belong to a later user action than the
   * one that began this execution.
   */
  trigger: AnalyticsEventPayloads["query.ran"]["trigger"];
} & DataQueryRunOutcome;
