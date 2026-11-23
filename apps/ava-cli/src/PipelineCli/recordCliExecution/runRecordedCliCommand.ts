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

/** What a reset deleted, with no scope rows behind it. */
export type CliDeletions = NonNullable<ExecutionOutcome["deletions"]>;

/** How a CLI command that did not throw ended. */
export type CliCommandResult = Readonly<{
  status: "succeeded" | "cancelled";
  /**
   * What a reset deleted, or showed it would. Leave out for a command whose
   * scope rows carry its counts, or that deleted nothing.
   */
  deletions?: CliDeletions;
}>;

/** Records one drive and scope a CLI command worked on. */
export type RecordCliScope = (scope: ExecutionScope) => Promise<void>;

/** What `runRecordedCliCommand` gives the command it runs. */
export type CliCommandContext = Readonly<{
  /** Records one drive and scope the command worked on. */
  recordScope: RecordCliScope;
  /**
   * Adds to the tally of what the command has deleted so far. Only a
   * command that throws is recorded with the tally, so the deletions it
   * made before the error are not lost. A command that resolves is recorded
   * with the deletions it resolves to.
   */
  noteDeletions: (deletions: Partial<CliDeletions>) => void;
}>;

const _NO_CLI_DELETIONS: CliDeletions = {
  listingsDeleted: 0,
  listingsKeptInUse: 0,
  listingsDetached: 0,
  checkpointsDeleted: 0,
  workspaceDatasetsDeleted: 0,
};

/** Each count of `total` plus the same count of `added`, when it has one. */
function _addDeletions(
  total: CliDeletions,
  added: Partial<CliDeletions>,
): CliDeletions {
  return {
    listingsDeleted: total.listingsDeleted + (added.listingsDeleted ?? 0),
    listingsKeptInUse: total.listingsKeptInUse + (added.listingsKeptInUse ?? 0),
    listingsDetached: total.listingsDetached + (added.listingsDetached ?? 0),
    checkpointsDeleted:
      total.checkpointsDeleted + (added.checkpointsDeleted ?? 0),
    workspaceDatasetsDeleted:
      total.workspaceDatasetsDeleted + (added.workspaceDatasetsDeleted ?? 0),
  };
}

function _describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Whether `error` is what a terminal prompt rejects with when the user
 * presses Ctrl+C: Node's readline closes and rejects the pending question
 * with an `AbortError` whose code is `ABORT_ERR`.
 */
function _isPromptInterrupted(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "AbortError" &&
    (error as { code?: unknown }).code === "ABORT_ERR"
  );
}

/**
 * How a command that threw ended: `cancelled` when the user interrupted a
 * prompt, `failed` with the error otherwise. Either way it carries the
 * deletions the command noted before it threw.
 */
function _buildThrownOutcome(
  error: unknown,
  deletions: CliDeletions | undefined,
): Omit<ExecutionOutcome, "finishedAt" | "setupMs"> {
  return _isPromptInterrupted(error)
    ? { status: "cancelled", error: undefined, deletions }
    : { status: "failed", error: _describeError(error), deletions };
}

/** A CLI command's start, with how this process was invoked. */
function _buildCliExecutionStart(
  executionId: string,
  start: CliExecutionStart,
): ExecutionStart {
  return {
    ...start,
    id: executionId,
    runMode: undefined,
    isLimited: false,
    isWindowed: false,
    invocation: {
      invokedVia: "cli_local",
      ...buildCliInvocation({ shouldReadCodeVersion: true }),
    },
    startedAt: new Date(),
  };
}

/**
 * Runs a reset or prune and records it as a pipeline execution, in the
 * database it changes: its start, each scope `work` records, and how it
 * ended. A command that throws is recorded as `failed`, with the deletions
 * it noted, or as `cancelled` when the user pressed Ctrl+C at a prompt.
 * Either way the error is rethrown. Recording never fails the command: a
 * failed call is printed as a warning.
 *
 * @param args.target - The database the command changes.
 * @param args.start - The command, its flags, and its parsed options.
 * @param args.work - The command itself.
 */
export async function runRecordedCliCommand(args: {
  target: PostgrestTarget;
  start: CliExecutionStart;
  work: (context: CliCommandContext) => Promise<CliCommandResult>;
}): Promise<void> {
  const store = createNeverFatalExecutionStore({
    store: createPostgrestExecutionStore(args.target),
    warn: printWarn,
  });
  const executionId = randomUUID();
  await store.start(_buildCliExecutionStart(executionId, args.start));
  const finish = (
    outcome: Omit<ExecutionOutcome, "finishedAt" | "setupMs">,
  ) => {
    return store.finish({
      executionId,
      outcome: { ...outcome, finishedAt: new Date(), setupMs: 0 },
    });
  };
  let notedDeletions: CliDeletions | undefined;
  try {
    const result = await args.work({
      recordScope: (scope) => {
        return store.recordScope({ executionId, scope });
      },
      noteDeletions: (deletions) => {
        notedDeletions = _addDeletions(
          notedDeletions ?? _NO_CLI_DELETIONS,
          deletions,
        );
      },
    });
    await finish({ ...result, error: undefined, deletions: result.deletions });
  } catch (error: unknown) {
    await finish(_buildThrownOutcome(error, notedDeletions));
    throw error;
  }
}
