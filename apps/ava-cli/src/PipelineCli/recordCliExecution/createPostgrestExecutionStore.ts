import { callPostgrestRpc } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import {
  buildExecutionOutcomeRow,
  buildExecutionScopeRow,
  buildExecutionStartRow,
} from "@etl/stores/executionRecords/executionRecords";
import type { PostgrestTarget } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type { ExecutionStore } from "@etl/stores/ExecutionStore.types";

/** The database functions that record pipeline executions. */
const _EXECUTION_FUNCTIONS = {
  start: "rpc_pipeline_executions__start",
  recordScope: "rpc_pipeline_executions__record_scope",
  finish: "rpc_pipeline_executions__finish",
} as const;

/**
 * How long one recording call may take before it is abandoned, so a
 * database that never answers cannot hang the command it records.
 */
const _RECORDING_TIMEOUT_MS = 10_000;

/**
 * Creates an execution store over PostgREST, for the commands the CLI runs
 * itself. Each method throws when Supabase rejects the call or does not
 * answer within 10 seconds; wrap the store with
 * `createNeverFatalExecutionStore`.
 *
 * @param target - The database to record in. Its key must be the service
 * role's: only the service role may call the functions.
 */
export function createPostgrestExecutionStore(
  target: PostgrestTarget,
): ExecutionStore {
  return {
    start: async (execution) => {
      await callPostgrestRpc({
        target,
        functionName: _EXECUTION_FUNCTIONS.start,
        signal: AbortSignal.timeout(_RECORDING_TIMEOUT_MS),
        body: { p_execution: buildExecutionStartRow(execution) },
      });
    },
    recordScope: async ({ executionId, scope }) => {
      await callPostgrestRpc({
        target,
        functionName: _EXECUTION_FUNCTIONS.recordScope,
        signal: AbortSignal.timeout(_RECORDING_TIMEOUT_MS),
        body: {
          p_execution_id: executionId,
          p_scope: buildExecutionScopeRow(scope),
        },
      });
    },
    finish: async ({ executionId, outcome }) => {
      await callPostgrestRpc({
        target,
        functionName: _EXECUTION_FUNCTIONS.finish,
        signal: AbortSignal.timeout(_RECORDING_TIMEOUT_MS),
        body: {
          p_execution_id: executionId,
          p_outcome: buildExecutionOutcomeRow(outcome),
        },
      });
    },
  };
}
