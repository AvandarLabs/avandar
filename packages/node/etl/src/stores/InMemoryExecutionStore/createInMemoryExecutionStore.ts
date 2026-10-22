import type {
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStart,
  ExecutionStore,
} from "@etl/stores/ExecutionStore.types";

/** One recorded execution, as an in-memory store holds it. */
export type InMemoryExecution = Readonly<{
  start: ExecutionStart;
  scopes: readonly ExecutionScope[];
  outcome: ExecutionOutcome | undefined;
}>;

/** An execution store held in memory, plus an accessor for asserting on it. */
export type InMemoryExecutionStore = ExecutionStore &
  Readonly<{
    /** Every recorded execution, in the order it started. */
    getExecutions: () => readonly InMemoryExecution[];
  }>;

/**
 * Creates an execution store that keeps executions in memory, for testing
 * the engine or a CLI command without Supabase. Like the database
 * functions, it refuses a scope or finish for an execution that never
 * started.
 */
export function createInMemoryExecutionStore(): InMemoryExecutionStore {
  const executionsById = new Map<string, InMemoryExecution>();

  function _requireExecution(executionId: string): InMemoryExecution {
    const execution = executionsById.get(executionId);
    if (execution === undefined) {
      throw new Error(`Pipeline execution ${executionId} does not exist`);
    }
    return execution;
  }

  return {
    start: async (start) => {
      executionsById.set(start.id, { start, scopes: [], outcome: undefined });
    },
    recordScope: async ({ executionId, scope }) => {
      const execution = _requireExecution(executionId);
      executionsById.set(executionId, {
        ...execution,
        scopes: [...execution.scopes, scope],
      });
    },
    finish: async ({ executionId, outcome }) => {
      const execution = _requireExecution(executionId);
      executionsById.set(executionId, { ...execution, outcome });
    },
    getExecutions: () => {
      return [...executionsById.values()];
    },
  };
}
