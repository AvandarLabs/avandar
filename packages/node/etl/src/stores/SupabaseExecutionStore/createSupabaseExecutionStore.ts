import {
  buildExecutionOutcomeRow,
  buildExecutionScopeRow,
  buildExecutionStartRow,
} from "@etl/stores/executionRecords/executionRecords";
import { throwOnSupabaseError } from "@etl/stores/throwOnSupabaseError/throwOnSupabaseError";
import type { ExecutionStore } from "@etl/stores/ExecutionStore.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The database functions that record executions. */
export type ExecutionFunctions = Readonly<{
  /** Such as `rpc_pipeline_executions__start`. */
  start: string;
  /** Such as `rpc_pipeline_executions__record_scope`. */
  recordScope: string;
  /** Such as `rpc_pipeline_executions__finish`. */
  finish: string;
}>;

/** Options for `createSupabaseExecutionStore`. */
export type SupabaseExecutionStoreOptions = Readonly<{
  /** A service-role client: only the service role may call the functions. */
  client: SupabaseClient;
  functions: ExecutionFunctions;
}>;

/**
 * Creates an execution store over the three database functions. Every
 * method throws with the function's name and Supabase's message when a
 * call fails. Wrap the store with `createNeverFatalExecutionStore` so a
 * failure never stops the command it records.
 *
 * @param options - The client and the function names.
 * @returns The store.
 */
export function createSupabaseExecutionStore(
  options: SupabaseExecutionStoreOptions,
): ExecutionStore {
  const { client, functions } = options;
  return {
    start: async (execution) => {
      const { error } = await client.rpc(functions.start, {
        p_execution: buildExecutionStartRow(execution),
      });
      throwOnSupabaseError({ error, action: `calling ${functions.start}` });
    },
    recordScope: async ({ executionId, scope }) => {
      const { error } = await client.rpc(functions.recordScope, {
        p_execution_id: executionId,
        p_scope: buildExecutionScopeRow(scope),
      });
      throwOnSupabaseError({
        error,
        action: `calling ${functions.recordScope}`,
      });
    },
    finish: async ({ executionId, outcome }) => {
      const { error } = await client.rpc(functions.finish, {
        p_execution_id: executionId,
        p_outcome: buildExecutionOutcomeRow(outcome),
      });
      throwOnSupabaseError({ error, action: `calling ${functions.finish}` });
    },
  };
}
