import type { ExecutionStore } from "@etl/stores/ExecutionStore.types";

function _describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Wraps an execution store so recording can never fail or stop the command
 * it records: each failed call is passed to `warn` and swallowed. A failed
 * `start` turns the rest into no-ops, since there is no row to add to, and
 * only the first `finish` is recorded. A wrapper tracks one execution, so
 * create one per execution.
 *
 * @param args.store - The store to record through.
 * @param args.warn - Told about each failure, such as `console.warn`.
 */
export function createNeverFatalExecutionStore(args: {
  store: ExecutionStore;
  warn: (message: string) => void;
}): ExecutionStore {
  const { store, warn } = args;
  let isStarted = false;
  let isFinished = false;
  return {
    start: async (execution) => {
      try {
        await store.start(execution);
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
        await store.recordScope(scopeArgs);
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
        await store.finish(finishArgs);
      } catch (error: unknown) {
        warn(
          `Could not record the end of pipeline execution ${finishArgs.executionId}: ${_describeError(error)}`,
        );
      }
    },
  };
}
