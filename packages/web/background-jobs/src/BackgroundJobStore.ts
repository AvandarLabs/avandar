import { createExternalStore } from "./internal/createExternalStore";
import { generateJobId } from "./internal/uuid";
import {
  noopBackgroundJobNotifier,
  type BackgroundJobNotifier,
} from "./notifier/BackgroundJobNotifier.types";
import { createInMemoryBackgroundJobPersistence } from "./persistence/InMemoryBackgroundJobPersistence";
import type {
  BackgroundJob,
  BackgroundJobStatus,
  RegisterBackgroundJobInput,
} from "./BackgroundJob.types";
import type { BackgroundJobPersistence } from "./persistence/BackgroundJobPersistence.types";
import type { IExternalStore } from "./internal/createExternalStore";

/**
 * Snapshot held by the external store. Keyed by job id so the UI can
 * react to a specific job changing without an O(n) scan.
 */
type BackgroundJobsState = {
  byId: Record<string, BackgroundJob>;
};

const TERMINAL_STATUSES: ReadonlySet<BackgroundJobStatus> = new Set([
  "completed",
  "failed",
  "canceled",
  "indeterminate",
]);

function _isTerminal(status: BackgroundJobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

function _clampPercent(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

/**
 * The store of all background jobs running in this tab. Created via
 * `createBackgroundJobStore`; the app keeps a single global instance
 * configured at startup. Tests create fresh instances per test.
 */
export type BackgroundJobStore = IExternalStore<BackgroundJobsState> & {
  /** Register a new job and return it. */
  register(input: RegisterBackgroundJobInput): BackgroundJob;

  /** Read a single job snapshot by id. */
  getJob(id: string): BackgroundJob | undefined;

  /** Snapshot of every tracked job, ordered by creation time desc. */
  listJobs(): readonly BackgroundJob[];

  /** Update the progress percent (0–100) for a job. */
  updateProgress(id: string, progress: number | undefined): void;

  /** Patch arbitrary metadata on a job (e.g. label or description). */
  patch(
    id: string,
    patch: Partial<
      Pick<
        BackgroundJob,
        "label" | "description" | "metadata" | "progress"
      >
    >,
  ): void;

  /** Mark a job as `completed`. Fires the configured success toast. */
  markCompleted(id: string): void;

  /** Mark a job as `failed`. Fires the configured failure toast. */
  markFailed(id: string, errorMessage?: string): void;

  /** Mark a job as `canceled`. Fires the configured cancel toast. */
  markCanceled(id: string): void;

  /** Mark a job as `indeterminate`. */
  markIndeterminate(id: string): void;

  /** Remove a job from the store. */
  removeJob(id: string): void;

  /**
   * Hydrate persistent jobs from the configured persistence layer. Any
   * persisted jobs that were `in_progress` at the time of the refresh
   * are demoted to `indeterminate`, since the tab has no way to know
   * whether the work actually finished. Idempotent.
   */
  hydrate(): Promise<void>;

  /** Replace the notifier at runtime. Used by `configureBackgroundJobs`. */
  setNotifier(notifier: BackgroundJobNotifier): void;
};

export type CreateBackgroundJobStoreOptions = {
  persistence?: BackgroundJobPersistence;
  notifier?: BackgroundJobNotifier;
  /**
   * Wall-clock function. Overridable for deterministic tests. Defaults
   * to `() => Date.now()`.
   */
  now?: () => number;
};

/**
 * Build a fresh background-job store. Most callers should use the
 * module-level singleton in `BackgroundJobs.ts` — this factory exists
 * mainly so tests can construct isolated stores.
 */
export function createBackgroundJobStore(
  options: CreateBackgroundJobStoreOptions = {},
): BackgroundJobStore {
  const persistence =
    options.persistence ?? createInMemoryBackgroundJobPersistence();
  let notifier: BackgroundJobNotifier =
    options.notifier ?? noopBackgroundJobNotifier;
  const now = options.now ?? ((): number => {
    return Date.now();
  });

  const externalStore = createExternalStore({
    initialState: { byId: {} } as BackgroundJobsState,

    builder: (state: BackgroundJobsState) => {
      const _persistIfNeeded = (job: BackgroundJob): void => {
        if (!job.persistAcrossRefresh) {
          return;
        }
        void persistence.save(job).catch(() => {
          /* swallow: persistence failures must never break in-memory state */
        });
      };

      const _removePersisted = (job: BackgroundJob): void => {
        if (!job.persistAcrossRefresh) {
          return;
        }
        void persistence.remove(job.id).catch(() => {
          /* swallow */
        });
      };

      const _replace = (job: BackgroundJob): void => {
        state.byId = { ...state.byId, [job.id]: job };
      };

      const _fireTerminalToast = (job: BackgroundJob): void => {
        if (job.status === "completed" && job.successToast) {
          notifier.success(job.successToast);
        } else if (job.status === "failed" && job.failureToast) {
          notifier.error(job.failureToast);
        } else if (job.status === "canceled" && job.cancelToast) {
          notifier.warning(job.cancelToast);
        }
      };

      const _transition = (
        id: string,
        status: BackgroundJobStatus,
        extra: Partial<BackgroundJob> = {},
      ): void => {
        const existing = state.byId[id];
        if (!existing) {
          return;
        }
        if (_isTerminal(existing.status)) {
          // Already terminal — ignore further transitions to keep the
          // toast notifier from firing twice.
          return;
        }
        const next: BackgroundJob = {
          ...existing,
          ...extra,
          status,
          finishedAt: now(),
        };
        _replace(next);
        _persistIfNeeded(next);
        _fireTerminalToast(next);
      };

      return {
        getters: {
          getJob: (id: string): BackgroundJob | undefined => {
            return state.byId[id];
          },

          listJobs: (): readonly BackgroundJob[] => {
            return Object.values(state.byId).sort((a, b) => {
              return b.createdAt - a.createdAt;
            });
          },
        },

        updaters: {
          register: (input: RegisterBackgroundJobInput): BackgroundJob => {
            if (input.id) {
              const existing = state.byId[input.id];
              if (existing) {
                return existing;
              }
            }

            const job: BackgroundJob = {
              id: input.id ?? generateJobId(),
              type: input.type,
              label: input.label,
              description: input.description,
              status: "in_progress",
              progress:
                input.progress === undefined ?
                  undefined
                : _clampPercent(input.progress),
              persistAcrossRefresh: input.persistAcrossRefresh ?? false,
              createdAt: now(),
              metadata: input.metadata,
              successToast: input.successToast,
              failureToast: input.failureToast,
              cancelToast: input.cancelToast,
            };

            _replace(job);
            _persistIfNeeded(job);
            return job;
          },

          updateProgress: (id: string, progress: number | undefined): void => {
            const existing = state.byId[id];
            if (!existing || _isTerminal(existing.status)) {
              return;
            }
            const next: BackgroundJob = {
              ...existing,
              progress:
                progress === undefined ? undefined : _clampPercent(progress),
            };
            _replace(next);
            _persistIfNeeded(next);
          },

          patch: (
            id: string,
            patchValue: Partial<
              Pick<
                BackgroundJob,
                "label" | "description" | "metadata" | "progress"
              >
            >,
          ): void => {
            const existing = state.byId[id];
            if (!existing) {
              return;
            }
            const next: BackgroundJob = {
              ...existing,
              ...patchValue,
              progress:
                patchValue.progress === undefined ?
                  existing.progress
                : _clampPercent(patchValue.progress),
            };
            _replace(next);
            _persistIfNeeded(next);
          },

          markCompleted: (id: string): void => {
            _transition(id, "completed", { progress: 100 });
          },

          markFailed: (id: string, errorMessage?: string): void => {
            _transition(id, "failed", { errorMessage });
          },

          markCanceled: (id: string): void => {
            _transition(id, "canceled");
          },

          markIndeterminate: (id: string): void => {
            _transition(id, "indeterminate");
          },

          removeJob: (id: string): void => {
            const existing = state.byId[id];
            if (!existing) {
              return;
            }
            const nextById = { ...state.byId };
            delete nextById[id];
            state.byId = nextById;
            _removePersisted(existing);
          },

          /**
           * Sync helper for `hydrate`. Replaces the in-memory state with
           * the merge of currently-known jobs and the loaded persisted
           * jobs, demoting any still-`in_progress` persisted job to
           * `indeterminate`.
           */
          applyHydratedJobs: (persisted: readonly BackgroundJob[]): void => {
            const nextById = { ...state.byId };
            for (const job of persisted) {
              const safeJob: BackgroundJob =
                job.status === "in_progress" ?
                  {
                    ...job,
                    status: "indeterminate",
                    finishedAt: job.finishedAt ?? now(),
                  }
                : job;
              nextById[safeJob.id] = safeJob;
              if (
                safeJob.status === "indeterminate" &&
                job.status === "in_progress"
              ) {
                void persistence.save(safeJob).catch(() => {
                  /* swallow */
                });
              }
            }
            state.byId = nextById;
          },

          setNotifier: (next: BackgroundJobNotifier): void => {
            notifier = next;
          },
        },
      };
    },
  });

  // `useSyncExternalStore` bails out via `Object.is` equality on the
  // value returned from `getSnapshot`. We reassign `state.byId` on
  // every mutation, so we mint a fresh wrapper object whenever the
  // `byId` reference changes — and return the cached wrapper otherwise
  // so React doesn't see thrash and re-render on every commit.
  let _cachedSnapshot: BackgroundJobsState | null = null;
  const _stableSnapshot = (): BackgroundJobsState => {
    const inner = externalStore.getSnapshot();
    if (!_cachedSnapshot || _cachedSnapshot.byId !== inner.byId) {
      _cachedSnapshot = { byId: inner.byId };
    }
    return _cachedSnapshot;
  };

  const store: BackgroundJobStore = {
    subscribe: externalStore.subscribe,
    getSnapshot: _stableSnapshot,
    getServerSnapshot: _stableSnapshot,
    register: externalStore.register,
    getJob: externalStore.getJob,
    listJobs: externalStore.listJobs,
    updateProgress: externalStore.updateProgress,
    patch: externalStore.patch,
    markCompleted: externalStore.markCompleted,
    markFailed: externalStore.markFailed,
    markCanceled: externalStore.markCanceled,
    markIndeterminate: externalStore.markIndeterminate,
    removeJob: externalStore.removeJob,
    setNotifier: externalStore.setNotifier,
    hydrate: async (): Promise<void> => {
      const persisted = await persistence.loadAll().catch(() => {
        return [] as readonly BackgroundJob[];
      });
      externalStore.applyHydratedJobs(persisted);
    },
  };

  return store;
}
