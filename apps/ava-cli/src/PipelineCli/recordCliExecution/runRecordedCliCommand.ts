import { randomUUID } from "node:crypto";
import { buildCliInvocation } from "@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation";
import { createPostgrestExecutionStore } from "@ava-cli/PipelineCli/recordCliExecution/createPostgrestExecutionStore";
import { printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import { createNeverFatalExecutionStore } from "@etl/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore";
import type { PostgrestTarget } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type {
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStart,
} from "@etl/stores/ExecutionStore.types";

/** What a CLI command's execution records about it, besides its invocation. */
export type CliExecutionStart = Pick<
  ExecutionStart,
  "pipelineName" | "command" | "isDryRun" | "isScoped" | "arguments"
>;

/** How a CLI command that did not throw ended. */
export type CliCommandResult = Readonly<{
  status: "succeeded" | "cancelled";
  /**
   * What a reset deleted, or showed it would. Leave out for a command whose
   * scope rows carry its counts, or that deleted nothing.
   */
  deletions?: ExecutionOutcome["deletions"];
}>;

/** Records one drive and scope a CLI command worked on. */
export type RecordCliScope = (scope: ExecutionScope) => Promise<void>;

function _describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs a reset or prune and records it as a pipeline execution, in the
 * database it changes: its start, each scope `work` records, and how it
 * ended. A command that throws is recorded as `failed`, and the error is
 * rethrown. Recording never fails the command: a failed call is printed as a
 * warning.
 *
 * @param args.target - The database the command changes.
 * @param args.start - The command, its flags, and its parsed options.
 * @param args.work - The command itself.
 */
export async function runRecordedCliCommand(args: {
  target: PostgrestTarget;
  start: CliExecutionStart;
  work: (recordScope: RecordCliScope) => Promise<CliCommandResult>;
}): Promise<void> {
  const store = createNeverFatalExecutionStore({
    store: createPostgrestExecutionStore(args.target),
    warn: printWarn,
  });
  const executionId = randomUUID();
  await store.start({
    ...args.start,
    id: executionId,
    runMode: undefined,
    isLimited: false,
    isWindowed: false,
    invocation: {
      invokedVia: "cli_local",
      ...buildCliInvocation({ shouldReadCodeVersion: true }),
    },
    startedAt: new Date(),
  });
  const finish = (
    outcome: Omit<ExecutionOutcome, "finishedAt" | "setupMs">,
  ) => {
    return store.finish({
      executionId,
      outcome: { ...outcome, finishedAt: new Date(), setupMs: 0 },
    });
  };
  try {
    const result = await args.work((scope) => {
      return store.recordScope({ executionId, scope });
    });
    await finish({ ...result, error: undefined, deletions: result.deletions });
  } catch (error: unknown) {
    await finish({
      status: "failed",
      error: _describeError(error),
      deletions: undefined,
    });
    throw error;
  }
}
