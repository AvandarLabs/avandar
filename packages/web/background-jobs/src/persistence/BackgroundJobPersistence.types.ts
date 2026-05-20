import type { BackgroundJob } from "../BackgroundJob.types";

/**
 * Storage-agnostic persistence interface used by the `BackgroundJobStore`
 * to mirror persistent jobs. The dexie-backed implementation is the
 * default; tests use the in-memory implementation.
 *
 * Failures are intentionally swallowed inside the store so that
 * persistence issues never break the in-memory job tracking.
 */
export interface BackgroundJobPersistence {
  /**
   * Load every persisted job. Called once at boot to hydrate the store.
   */
  loadAll(): Promise<readonly BackgroundJob[]>;

  /**
   * Upsert a single job by id.
   */
  save(job: BackgroundJob): Promise<void>;

  /**
   * Remove a job by id. No-op if the row does not exist.
   */
  remove(id: string): Promise<void>;

  /**
   * Remove every job. Used by tests and the "clear all" affordance.
   */
  clear(): Promise<void>;
}
