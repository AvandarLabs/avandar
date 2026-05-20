import type { BackgroundJob } from "../BackgroundJob.types";
import type { BackgroundJobPersistence } from "./BackgroundJobPersistence.types";

/**
 * An in-memory implementation of `BackgroundJobPersistence`. Used by
 * tests and as a fallback when no dexie persistence is configured.
 */
export function createInMemoryBackgroundJobPersistence(
  seed: readonly BackgroundJob[] = [],
): BackgroundJobPersistence {
  const rows = new Map<string, BackgroundJob>();
  seed.forEach((job) => {
    rows.set(job.id, job);
  });

  return {
    loadAll: async (): Promise<readonly BackgroundJob[]> => {
      return Array.from(rows.values());
    },
    save: async (job: BackgroundJob): Promise<void> => {
      rows.set(job.id, job);
    },
    remove: async (id: string): Promise<void> => {
      rows.delete(id);
    },
    clear: async (): Promise<void> => {
      rows.clear();
    },
  };
}
