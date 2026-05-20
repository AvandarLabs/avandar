import {
  createBackgroundJobStore,
  type BackgroundJobStore,
} from "./BackgroundJobStore";
import {
  noopBackgroundJobNotifier,
  type BackgroundJobNotifier,
} from "./notifier/BackgroundJobNotifier.types";
import { createDexieBackgroundJobPersistence } from "./persistence/DexieBackgroundJobPersistence";
import type { BackgroundJobPersistence } from "./persistence/BackgroundJobPersistence.types";

/**
 * Module-level singleton store used by the app. Tests should prefer
 * `createBackgroundJobStore` directly so they don't share state.
 */
let _store: BackgroundJobStore | null = null;

function _ensureStore(): BackgroundJobStore {
  if (!_store) {
    _store = createBackgroundJobStore({
      persistence: createDexieBackgroundJobPersistence(),
      notifier: noopBackgroundJobNotifier,
    });
  }
  return _store;
}

/**
 * One-time configuration entry point. The app calls this at startup to
 * wire up the notifier (and optionally a custom persistence). After it
 * returns the configured store has been hydrated from persistence —
 * any persistent jobs that were `in_progress` get demoted to
 * `indeterminate`.
 */
export async function configureBackgroundJobs(options: {
  notifier?: BackgroundJobNotifier;
  persistence?: BackgroundJobPersistence;
} = {}): Promise<BackgroundJobStore> {
  _store = createBackgroundJobStore({
    persistence:
      options.persistence ?? createDexieBackgroundJobPersistence(),
    notifier: options.notifier ?? noopBackgroundJobNotifier,
  });
  await _store.hydrate();
  return _store;
}

/**
 * Replace the singleton store. Intended for tests that want full
 * control over the global store referenced by app-level helpers.
 */
export function _setBackgroundJobStoreForTests(
  store: BackgroundJobStore | null,
): void {
  _store = store;
}

/**
 * The app-wide singleton. Reads through to the lazily-created store.
 * Each method is a stable function bound to the singleton lookup so
 * that React's `useSyncExternalStore` sees a consistent surface even
 * if the underlying store is later replaced.
 */
export const BackgroundJobs: BackgroundJobStore = {
  subscribe: (callback) => {
    return _ensureStore().subscribe(callback);
  },
  getSnapshot: () => {
    return _ensureStore().getSnapshot();
  },
  getServerSnapshot: () => {
    return _ensureStore().getServerSnapshot();
  },
  register: (input) => {
    return _ensureStore().register(input);
  },
  getJob: (id) => {
    return _ensureStore().getJob(id);
  },
  listJobs: () => {
    return _ensureStore().listJobs();
  },
  updateProgress: (id, progress) => {
    return _ensureStore().updateProgress(id, progress);
  },
  patch: (id, patchValue) => {
    return _ensureStore().patch(id, patchValue);
  },
  markCompleted: (id) => {
    return _ensureStore().markCompleted(id);
  },
  markFailed: (id, errorMessage) => {
    return _ensureStore().markFailed(id, errorMessage);
  },
  markCanceled: (id) => {
    return _ensureStore().markCanceled(id);
  },
  markIndeterminate: (id) => {
    return _ensureStore().markIndeterminate(id);
  },
  removeJob: (id) => {
    return _ensureStore().removeJob(id);
  },
  hydrate: () => {
    return _ensureStore().hydrate();
  },
  setNotifier: (notifier) => {
    return _ensureStore().setNotifier(notifier);
  },
};
