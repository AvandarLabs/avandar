import { useSyncExternalStore } from "react";
import { BackgroundJobs } from "./BackgroundJobs";
import type { BackgroundJob } from "./BackgroundJob.types";

/**
 * React hook that re-renders whenever any background job changes.
 * Returns the full ordered list (newest first).
 */
export function useBackgroundJobs(): readonly BackgroundJob[] {
  useSyncExternalStore(
    BackgroundJobs.subscribe,
    BackgroundJobs.getSnapshot,
    BackgroundJobs.getServerSnapshot,
  );
  return BackgroundJobs.listJobs();
}

/**
 * React hook that re-renders whenever a single tracked job changes.
 * Returns `undefined` if no job with that id is known.
 */
export function useBackgroundJob(
  id: string | undefined,
): BackgroundJob | undefined {
  useSyncExternalStore(
    BackgroundJobs.subscribe,
    BackgroundJobs.getSnapshot,
    BackgroundJobs.getServerSnapshot,
  );
  if (!id) {
    return undefined;
  }
  return BackgroundJobs.getJob(id);
}
