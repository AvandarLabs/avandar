import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

import { useSyncExternalStore } from "react";

/**
 * In-memory registry of in-flight CSV / XLSX background parquet transcoding
 * jobs (the `read_csv` / `read_xlsx` → parquet conversion that runs after the
 * sniff phase). It serves three jobs:
 *
 *   1. Drives the dataset-status UI (spinners, "approx X minutes remaining"
 *      tooltips) while the background parquet transcoding is running.
 *   2. Lets the `beforeunload` guard ask "is any job still active?" without
 *      reaching into IndexedDB on every tab-close attempt.
 *   3. Gives callers a promise that resolves once a given dataset's background
 *      parquet transcoding finishes, so cross-cutting work like the Supabase
 *      parquet upload can wait for it to land without polling.
 *
 * The store lives at module scope on purpose: the background parquet
 * transcoding runs in async code paths that aren't necessarily inside a
 * React tree, and other modules
 * (e.g. `startDatasetUpload`, `useSyncLocalDatasets`) need to read /
 * mutate it.
 */

export type ImportJobStatus = "running" | "succeeded" | "failed";

export type ImportJob = {
  datasetId: DatasetId;
  /**
   * Total byte size of the source file. Used together with `startedAt`
   * (and the assumption of a roughly constant per-byte transcode cost)
   * to compute the ETA shown in the dataset status tooltip.
   */
  sourceFileSize: number;
  status: ImportJobStatus;
  /**
   * Wall-clock ms when the background parquet transcoding started for this
   * dataset.
   */
  startedAt: number;
  /** Wall-clock ms when the job entered `succeeded` or `failed`. */
  finishedAt?: number;
  failureReason?: string;
};

type ImportJobsState = Readonly<{
  /**
   * Keyed by datasetId for O(1) lookups. We intentionally keep terminal
   * (succeeded / failed) jobs in the map for a short window so consumers
   * that subscribed mid-flight can observe the resolution and surface a
   * toast; `clearJob` removes the entry once the consumer is done.
   */
  byDatasetId: Record<DatasetId, ImportJob>;
}>;

type Listener = () => void;

const _state: { current: ImportJobsState } = {
  current: { byDatasetId: {} as Record<DatasetId, ImportJob> },
};

const _listeners = new Set<Listener>();
const _completionWaiters = new Map<DatasetId, Set<(job: ImportJob) => void>>();

function _setState(next: ImportJobsState): void {
  _state.current = next;
  _listeners.forEach((l) => {
    l();
  });
}

function _resolveCompletionWaiters(job: ImportJob): void {
  const waiters = _completionWaiters.get(job.datasetId);
  if (!waiters) {
    return;
  }
  _completionWaiters.delete(job.datasetId);
  waiters.forEach((resolve) => {
    resolve(job);
  });
}

function _subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function _getSnapshot(): ImportJobsState {
  return _state.current;
}

export const ImportJobsManager = {
  /**
   * Register that the background parquet transcoding for `datasetId` has
   * started. The optional fields power the ETA calculation; pass at least
   * `sourceFileSize` so the tooltip can extrapolate.
   */
  startJob: (params: {
    datasetId: DatasetId;
    sourceFileSize: number;
    startedAt?: number;
  }): void => {
    const job: ImportJob = {
      datasetId: params.datasetId,
      sourceFileSize: params.sourceFileSize,
      status: "running",
      startedAt: params.startedAt ?? Date.now(),
    };
    _setState({
      byDatasetId: { ..._state.current.byDatasetId, [params.datasetId]: job },
    });
  },

  /**
   * Mark a job as succeeded. Keeps the entry in the map (with terminal
   * status) until `clearJob` is called so the success toast / parquet
   * upload paths can observe the resolution.
   */
  markSucceeded: (datasetId: DatasetId): void => {
    const current = _state.current.byDatasetId[datasetId];
    if (!current) {
      return;
    }
    const updated: ImportJob = {
      ...current,
      status: "succeeded",
      finishedAt: Date.now(),
    };
    _setState({
      byDatasetId: { ..._state.current.byDatasetId, [datasetId]: updated },
    });
    _resolveCompletionWaiters(updated);
  },

  /** Mark a job as failed with the message we surface to the user. */
  markFailed: (datasetId: DatasetId, reason: string): void => {
    const current = _state.current.byDatasetId[datasetId];
    if (!current) {
      return;
    }
    const updated: ImportJob = {
      ...current,
      status: "failed",
      finishedAt: Date.now(),
      failureReason: reason,
    };
    _setState({
      byDatasetId: { ..._state.current.byDatasetId, [datasetId]: updated },
    });
    _resolveCompletionWaiters(updated);
  },

  /** Remove a terminal job from the registry. */
  clearJob: (datasetId: DatasetId): void => {
    if (!_state.current.byDatasetId[datasetId]) {
      return;
    }
    const next = { ..._state.current.byDatasetId };
    delete next[datasetId];
    _setState({ byDatasetId: next });
  },

  /** Returns the job for a dataset, or undefined if none is registered. */
  getJob: (datasetId: DatasetId): ImportJob | undefined => {
    return _state.current.byDatasetId[datasetId];
  },

  /**
   * Returns a promise that resolves the next time the job for `datasetId`
   * transitions to `succeeded` or `failed`. If the job is already terminal
   * (or absent) this resolves synchronously. Used by code paths that want
   * to await the local background parquet transcoding without polling the
   * Dexie row.
   */
  waitForCompletion: (datasetId: DatasetId): Promise<ImportJob | undefined> => {
    const current = _state.current.byDatasetId[datasetId];
    if (!current || current.status !== "running") {
      return Promise.resolve(current);
    }
    return new Promise((resolve) => {
      let waiters = _completionWaiters.get(datasetId);
      if (!waiters) {
        waiters = new Set();
        _completionWaiters.set(datasetId, waiters);
      }
      waiters.add(resolve);
    });
  },

  /** Returns true while at least one job has `status === "running"`. */
  hasActiveJob: (): boolean => {
    return Object.values(_state.current.byDatasetId).some((j) => {
      return j.status === "running";
    });
  },

  /** Snapshot of every currently-tracked job. */
  listJobs: (): readonly ImportJob[] => {
    return Object.values(_state.current.byDatasetId);
  },
};

/**
 * React hook that re-renders whenever the import-job registry changes.
 * Returns the full state. Components that only care about a single
 * dataset should pull `state.byDatasetId[datasetId]` from the result.
 */
export function useImportJobsState(): ImportJobsState {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
}

/** Convenience hook that returns just the job for a single dataset. */
export function useImportJob(
  datasetId: DatasetId | undefined,
): ImportJob | undefined {
  const state = useImportJobsState();
  if (!datasetId) {
    return undefined;
  }
  return state.byDatasetId[datasetId];
}

/**
 * Structured "time remaining" estimate. Kept as data (not a formatted
 * string) so the display component can translate it with `t`; this module
 * is not a React component and has no access to the Lingui hook.
 */
export type RemainingTimeEstimate =
  | { kind: "lessThanMinute" }
  | { kind: "aboutMinute" }
  | { kind: "minutes"; minutes: number };

/**
 * Estimate the remaining time for a running job from its `sourceFileSize`
 * and `startedAt`. Extrapolates from elapsed wall time, which is rough but
 * matches the file-transfer-style language the UI uses. Returns undefined
 * when there isn't yet enough signal to estimate (very early in the run).
 */
export function estimateRemainingTimeFromJob(
  job: ImportJob | undefined,
): RemainingTimeEstimate | undefined {
  if (!job || job.status !== "running") {
    return undefined;
  }
  const elapsedMs = Date.now() - job.startedAt;
  if (elapsedMs < 1500 || job.sourceFileSize <= 0) {
    return undefined;
  }
  // Assume we're 30% of the way through after `elapsedMs` for tiny files,
  // scaling toward the "throughput from byte size" estimate for larger
  // ones. This is intentionally fuzzy: it's a download-style estimate,
  // not a precise progress bar.
  const assumedBytesPerSecond = Math.max(
    1_000_000, // 1 MB/s floor so tiny CSVs don't predict hours
    (job.sourceFileSize * 0.3) / (elapsedMs / 1000),
  );
  const remainingBytes = Math.max(
    0,
    job.sourceFileSize - assumedBytesPerSecond * (elapsedMs / 1000),
  );
  const remainingSec = remainingBytes / assumedBytesPerSecond;
  if (remainingSec < 5) {
    return { kind: "lessThanMinute" };
  }
  if (remainingSec < 90) {
    return { kind: "aboutMinute" };
  }
  return { kind: "minutes", minutes: Math.round(remainingSec / 60) };
}
