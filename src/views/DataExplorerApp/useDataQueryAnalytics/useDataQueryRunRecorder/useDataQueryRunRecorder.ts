import { useRef } from "react";
import type {
  DataQueryRunMetadata,
  DataQueryRunOutcome,
} from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMetadata.types";
import type { RefObject } from "react";

type DataQueryRunRecorder = {
  /**
   * Starts timing one query-function invocation. Returns the function that
   * closes it out, which takes what the run produced: the auto-limit decision
   * and result shape on success, or nothing beyond the outcome on failure.
   */
  beginRun: () => (outcome: DataQueryRunOutcome) => void;
  /**
   * The most recent settled run, or `undefined` when none has settled on this
   * hook instance. A cache hit serves data without invoking the query function
   * at all, so consumers must read `undefined` as "no run happened" rather
   * than "no data yet".
   */
  runMetadataRef: RefObject<DataQueryRunMetadata | undefined>;
};

/**
 * Times each invocation of a data query function and leaves the result where
 * the analytics effect can read it after the query settles.
 *
 * The query function must call the returned finalizer on **both** its success
 * and its failure paths, or failures go unreported. On the first run of an
 * instance an unrecorded failure leaves the ref empty, and the emitter reads
 * an absent record as "no run happened". After an earlier success it is
 * subtler: the ref still holds that success, whose id the emitter has already
 * consumed, so the failure is swallowed by the duplicate check instead. Both
 * routes end in silence.
 */
export function useDataQueryRunRecorder(
  options: Readonly<{
    source: DataQueryRunMetadata["source"];
    dataSourceType: DataQueryRunMetadata["dataSourceType"];
    trigger: DataQueryRunMetadata["trigger"];
  }>,
): DataQueryRunRecorder {
  const { source, dataSourceType, trigger } = options;
  // A ref rather than state on purpose: writing this must not re-render, and
  // the settle that follows re-renders anyway.
  const runMetadataRef = useRef<DataQueryRunMetadata | undefined>(undefined);
  const runCountRef = useRef(0);

  const beginRun = (): ((outcome: DataQueryRunOutcome) => void) => {
    runCountRef.current += 1;
    const runId = runCountRef.current;
    const startedAt = performance.now();
    return (outcome: DataQueryRunOutcome): void => {
      // A run superseded by a later invocation is not what the user is looking
      // at, so its late write must not displace the newer run's metadata. This
      // only catches supersession by another invocation; a switch to an
      // already-cached key never calls the query function, which is why the
      // record carries its own result shape rather than trusting the observer.
      if (runId !== runCountRef.current) {
        return;
      }
      runMetadataRef.current = {
        runId,
        durationMs: performance.now() - startedAt,
        source,
        dataSourceType,
        // This closure was built by the `beginRun()` that started the run, so
        // it holds that render's trigger. The Data Explorer stamps a new
        // trigger on actions that leave the query key unchanged, so reading
        // the current one at settle time would attribute this run to a later,
        // unrelated user action.
        trigger,
        ...outcome,
      };
    };
  };

  return { beginRun, runMetadataRef };
}
