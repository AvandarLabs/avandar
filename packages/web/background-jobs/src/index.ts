export type {
  BackgroundJob,
  BackgroundJobStatus,
  BackgroundJobToast,
  RegisterBackgroundJobInput,
} from "./BackgroundJob.types";

export {
  createBackgroundJobStore,
  type BackgroundJobStore,
  type CreateBackgroundJobStoreOptions,
} from "./BackgroundJobStore";

export {
  BackgroundJobs,
  configureBackgroundJobs,
  _setBackgroundJobStoreForTests,
} from "./BackgroundJobs";

export {
  useBackgroundJobs,
  useBackgroundJob,
} from "./useBackgroundJobs";

export type {
  BackgroundJobNotifier,
} from "./notifier/BackgroundJobNotifier.types";
export { noopBackgroundJobNotifier } from "./notifier/BackgroundJobNotifier.types";

export type { BackgroundJobPersistence } from "./persistence/BackgroundJobPersistence.types";
export { createInMemoryBackgroundJobPersistence } from "./persistence/InMemoryBackgroundJobPersistence";
export {
  createDexieBackgroundJobPersistence,
  DEFAULT_BACKGROUND_JOBS_DB_NAME,
} from "./persistence/DexieBackgroundJobPersistence";
