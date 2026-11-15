import { uuid } from "$/lib/uuid";
import { createExternalStore } from "@/lib/utils/state/createExternalStore";
import type { UUID } from "@avandar/utils";

/** Identifies one live entry in {@link JobProgressStore}. */
export type JobId = UUID<"Job">;

/** The progress state of one job tracked by {@link JobProgressStore}. */
export type JobEntry =
  | { status: "indeterminate"; label: string; detail?: string }
  | {
      status: "determinate";
      label: string;
      current: number;
      total: number;
      detail?: string;
    }
  | { status: "error"; label: string; message: string };

/**
 * Shared store for every long-running background job that reports progress
 * to the floating job-progress indicator: offline-model downloads, dataset
 * uploads, and concept record syncs. Keyed by an opaque job id so any
 * number of jobs can be in flight at once.
 */
export const JobProgressStore = createExternalStore({
  initialState: new Map<JobId, JobEntry>(),
  builder: (jobs: Map<JobId, JobEntry>) => {
    return {
      getters: {
        /** The current entry for one job, or undefined if it isn't live. */
        getJob: (jobId: JobId): JobEntry | undefined => {
          return jobs.get(jobId);
        },

        /** Every live job, for rendering the floating indicator. */
        getAllJobs: (): Array<{ id: JobId; entry: JobEntry }> => {
          return [...jobs.entries()].map(([id, entry]) => {
            return { id, entry };
          });
        },
      },
      updaters: {
        /**
         * Registers a new job in the indeterminate state and returns its
         * id.
         */
        startJob: (label: string, options?: { detail?: string }): JobId => {
          const jobId = uuid<"Job">();
          jobs.set(jobId, {
            status: "indeterminate",
            label,
            detail: options?.detail,
          });
          return jobId;
        },

        /**
         * Replaces a job's entry wholesale, e.g. to switch it from
         * indeterminate to determinate. No-ops if the job already finished.
         */
        updateJob: (jobId: JobId, entry: JobEntry): void => {
          if (!jobs.has(jobId)) {
            return;
          }
          jobs.set(jobId, entry);
        },

        /**
         * Removes a job. Called on success, and by the user dismissing an
         * error.
         */
        finishJob: (jobId: JobId): void => {
          jobs.delete(jobId);
        },

        /**
         * Moves a job to the error state, keeping its last known label.
         * No-ops if the job already finished.
         */
        failJob: (jobId: JobId, message: string): void => {
          const existingEntry = jobs.get(jobId);
          if (!existingEntry) {
            return;
          }
          jobs.set(jobId, {
            status: "error",
            label: existingEntry.label,
            message,
          });
        },
      },
    };
  },
});
