import { Logger } from "@/utils/Logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * The `performance` measure each run of a crosswalk's combined preview
 * records. Its `detail` holds `datasetCount`, `readCount`, and `readingMs`.
 * Read it in the browser with
 * `performance.getEntriesByName("crosswalks:combined-preview")`.
 */
export const COMBINED_PREVIEW_MEASURE = "crosswalks:combined-preview";

/** One run of the combined preview being timed. */
export type CombinedPreviewTiming = {
  /** Pass each `onRelationFetched` report of the run's queries. */
  onRelationFetched: (datasetId: Dataset.Id) => void;
  /**
   * Records the measure once the run's queries are done, and logs it in
   * development.
   */
  finish: (options: Readonly<{ datasetIds: readonly Dataset.Id[] }>) => void;
};

/**
 * Starts timing one run of the combined preview: the whole run, and the
 * part spent reading datasets (from the start to the last dataset in
 * hand). The measure lands in the browser's performance timeline in every
 * build; the log line appears in development only, since `Logger.log` is
 * silent in production.
 */
export function startCombinedPreviewTiming(): CombinedPreviewTiming {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startMark = `${COMBINED_PREVIEW_MEASURE}:start:${runId}`;
  const startedAt = performance.now();
  const reading = { lastAt: startedAt, readIds: new Set<string>() };
  // jsdom's `performance` has only `now`, so a component test that runs
  // the preview must not fail on a missing User Timing API.
  const canMeasure =
    typeof performance.mark === "function" &&
    typeof performance.measure === "function";
  if (canMeasure) {
    performance.mark(startMark);
  }
  return {
    onRelationFetched: (datasetId) => {
      reading.lastAt = performance.now();
      reading.readIds.add(datasetId);
    },
    finish: ({ datasetIds }) => {
      const detail = {
        datasetCount: datasetIds.length,
        readCount: datasetIds.filter((datasetId) => {
          return reading.readIds.has(datasetId);
        }).length,
        readingMs: Math.round(reading.lastAt - startedAt),
      };
      if (canMeasure) {
        performance.measure(COMBINED_PREVIEW_MEASURE, {
          start: startMark,
          detail,
        });
        performance.clearMarks(startMark);
      }
      Logger.log("[crosswalks] Combined preview", {
        totalMs: Math.round(performance.now() - startedAt),
        ...detail,
      });
    },
  };
}
