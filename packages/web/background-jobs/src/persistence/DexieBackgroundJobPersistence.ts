import Dexie, { type EntityTable } from "dexie";
import type { BackgroundJob } from "../BackgroundJob.types";
import type { BackgroundJobPersistence } from "./BackgroundJobPersistence.types";

/**
 * Dexie schema for the persisted-jobs table. We intentionally keep this
 * library's database separate from `AvaDexie` so the background-jobs
 * lib stays self-contained.
 */
type BackgroundJobsDB = Dexie & {
  jobs: EntityTable<BackgroundJob, "id">;
};

/**
 * Default database name used by the dexie persistence. Exposed so tests
 * can use an alternate name if they ever want to exercise dexie under
 * jsdom + fake-indexeddb.
 */
export const DEFAULT_BACKGROUND_JOBS_DB_NAME = "AvandarBackgroundJobsDB";

function _createDB(databaseName: string): BackgroundJobsDB {
  const db = new Dexie(databaseName) as BackgroundJobsDB;
  db.version(1).stores({
    jobs: "&id,type,status,persistAcrossRefresh",
  });
  return db;
}

/**
 * A dexie-backed implementation of `BackgroundJobPersistence`. This is
 * the default persistence used by `initBackgroundJobs` in the browser.
 */
export function createDexieBackgroundJobPersistence(options: {
  databaseName?: string;
} = {}): BackgroundJobPersistence {
  const db = _createDB(options.databaseName ?? DEFAULT_BACKGROUND_JOBS_DB_NAME);

  return {
    loadAll: async (): Promise<readonly BackgroundJob[]> => {
      return db.jobs.toArray();
    },
    save: async (job: BackgroundJob): Promise<void> => {
      await db.jobs.put(job);
    },
    remove: async (id: string): Promise<void> => {
      await db.jobs.delete(id);
    },
    clear: async (): Promise<void> => {
      await db.jobs.clear();
    },
  };
}
