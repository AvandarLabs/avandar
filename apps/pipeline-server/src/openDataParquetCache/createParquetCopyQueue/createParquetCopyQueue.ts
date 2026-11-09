/** A queued build, identified by its build id. */
type QueuedJob = Readonly<{ buildId: string }>;

/** The builds waiting and running on this server. */
export type ParquetCopyQueue<Job extends QueuedJob> = Readonly<{
  /**
   * Queues a build. Returns false, and queues nothing, when the same build
   * is already queued or running.
   */
  enqueue: (job: Job) => boolean;
  /** Resolves once every queued build has finished. */
  whenIdle: () => Promise<void>;
}>;

/**
 * Creates the queue a server runs its Parquet copy builds through, one at a
 * time: a build can stream a large source to the data volume, so builds do
 * not compete for its disk. A build that throws is reported and the next
 * one runs. The queue lives in the server's memory, so a restart drops it;
 * a dropped build is claimed again once its claim is given up as lost.
 *
 * @param args.runJob - Runs one build.
 * @param args.onJobError - Reports a build that threw.
 */
export function createParquetCopyQueue<Job extends QueuedJob>(args: {
  runJob: (job: Job) => Promise<unknown>;
  onJobError: (job: Job, error: unknown) => void;
}): ParquetCopyQueue<Job> {
  const queuedBuildIds = new Set<string>();
  let tail: Promise<void> = Promise.resolve();

  return {
    enqueue: (job) => {
      if (queuedBuildIds.has(job.buildId)) {
        return false;
      }
      queuedBuildIds.add(job.buildId);
      tail = tail.then(async () => {
        try {
          await args.runJob(job);
        } catch (error) {
          args.onJobError(job, error);
        } finally {
          queuedBuildIds.delete(job.buildId);
        }
      });
      return true;
    },
    whenIdle: async () => {
      await tail;
    },
  };
}
