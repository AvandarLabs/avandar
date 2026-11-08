import { SYSTEM_CLOCK } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import { createWriteThrottle } from "@etl/EtlEngine/writeThrottle/createWriteThrottle";
import type { EtlClock } from "@etl/EtlEngine/EtlEngine.types";
import type { ExecutionStore } from "@etl/stores/ExecutionStore.types";

function _describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Wraps an execution store so recording can never fail or stop the command
 * it records. A call that fails transiently is retried as a crawl's store
 * requests are (see `createWriteThrottle`), so a run that slowed the
 * database down is still recorded. A call that still fails is passed to
 * `warn` and swallowed. A failed
 * `start` turns the rest into no-ops, since there is no row to add to, and
 * only the first `finish` is recorded. A wrapper tracks one execution, so
 * create one per execution.
 *
 * @param args.store - The store to record through.
 * @param args.warn - Told about each failure, such as `console.warn`.
 * @param args.clock - Paces retries through its `sleep`. Defaults to
 *   `SYSTEM_CLOCK`.
 */
export function createNeverFatalExecutionStore(args: {
  store: ExecutionStore;
  warn: (message: string) => void;
  clock?: EtlClock;
}): ExecutionStore {
  const { store, warn } = args;
  const { retryTransient } = createWriteThrottle({
    clock: args.clock ?? SYSTEM_CLOCK,
  });
  let isStarted = false;
  let isFinished = false;
  return {
    start: async (execution) => {
      try {
        await retryTransient(() => {
          return store.start(execution);
        });
        isStarted = true;
      } catch (error: unknown) {
        warn(
          `Could not record the start of pipeline execution ${execution.id}, so it is not recorded: ${_describeError(error)}`,
        );
      }
    },
    recordScope: async (scopeArgs) => {
      if (!isStarted || isFinished) {
        return;
      }
      try {
        await retryTransient(() => {
          return store.recordScope(scopeArgs);
        });
      } catch (error: unknown) {
        warn(
          `Could not record ${scopeArgs.scope.driveKey} [${scopeArgs.scope.scopeKey}] of pipeline execution ${scopeArgs.executionId}: ${_describeError(error)}`,
        );
      }
    },
    finish: async (finishArgs) => {
      if (!isStarted || isFinished) {
        return;
      }
      isFinished = true;
      try {
        await retryTransient(() => {
          return store.finish(finishArgs);
        });
      } catch (error: unknown) {
        warn(
          `Could not record the end of pipeline execution ${finishArgs.executionId}: ${_describeError(error)}`,
        );
      }
    },
  };
}
