import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { announcePostgrestTarget } from "@ava-cli/PipelineCli/announcePostgrestTarget/announcePostgrestTarget";
import { assertValidScopeKey } from "@ava-cli/PipelineCli/assertValidScopeKey/assertValidScopeKey";
import { fetchLivePipelineScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import { buildPruneExecutionScope } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/buildPruneExecutionScope";
import { findRetiredScopes } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/findRetiredScopes";
import { runRecordedCliCommand } from "@ava-cli/PipelineCli/recordCliExecution/runRecordedCliCommand";
import {
  getPostgrestTarget,
  listStoredScopes,
  pruneScope,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import { promptToConfirmReset } from "@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts";
import { describeScopePruneCounts } from "@ava-cli/PipelineCli/scopePruneCounts/scopePruneCounts";
import {
  printError,
  printInfo,
  printSuccess,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import { promiseMapSequential } from "@avandar/utils";
import type { RetiredScope } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/findRetiredScopes";
import type {
  CliCommandResult,
  RecordCliScope,
} from "@ava-cli/PipelineCli/recordCliExecution/runRecordedCliCommand";
import type {
  PostgrestTarget,
  ScopePruneCounts,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type { ExecutionScopeStatus } from "@etl/stores/ExecutionStore.types";

type _PlannedPrune = RetiredScope &
  Readonly<{ counts: ScopePruneCounts; startedAt: Date; finishedAt: Date }>;

type _PruneOptions = Readonly<{
  name: string;
  scope?: string;
  isDryRun: boolean;
  local: boolean;
}>;

/**
 * Refuses `--local` outside the development database: a checkout can be
 * behind or ahead of what a deployed server crawls, which would make live
 * scopes look retired.
 */
function _assertLocalOnlyInDevelopment(isLocal: boolean): void {
  if (isLocal && AvaEnv.getLoadedEnvTarget() !== "local") {
    throw new Error(
      "--local reads scopes from this checkout, which can differ from what a deployed pipeline server crawls. Run without --local against staging or production.",
    );
  }
}

function _pruneOne(args: {
  target: PostgrestTarget;
  name: string;
  retired: RetiredScope;
  isDryRun: boolean;
}): Promise<ScopePruneCounts> {
  return pruneScope({
    target: args.target,
    pipelineName: args.name,
    scopeKey: args.retired.scopeKey,
    driveKey: args.retired.driveKey,
    isDryRun: args.isDryRun,
  });
}

function _formatPrune(prune: _PlannedPrune): string {
  return `${prune.driveKey} [${prune.scopeKey}]: ${describeScopePruneCounts(prune.counts)}`;
}

/**
 * Whether a prune would only keep listings workspaces use: it would delete,
 * detach, and clear nothing.
 */
function _isNothingToPrune(counts: ScopePruneCounts): boolean {
  return (
    counts.listings_deleted === 0 &&
    counts.listings_detached === 0 &&
    counts.checkpoints_deleted === 0
  );
}

/** Prints what one dry run found: its plan, or that there is nothing to do. */
function _printPlan(plan: _PlannedPrune): void {
  if (_isNothingToPrune(plan.counts)) {
    printInfo(
      `${plan.driveKey} [${plan.scopeKey}]: kept ` +
        `${plan.counts.listings_kept_in_use} listing(s) a workspace uses; ` +
        "nothing to prune",
    );
    return;
  }
  printInfo(_formatPrune(plan));
}

/**
 * Dry-runs each retired scope's prune and prints what it would do. Resolves
 * to the retired scopes with something to prune, with their dry-run counts.
 */
async function _planPrunes(args: {
  target: PostgrestTarget;
  name: string;
  retired: readonly RetiredScope[];
}): Promise<_PlannedPrune[]> {
  // Sequential on purpose: one dry run at a time keeps the database load
  // and the printed plan in the stored order.
  const plans = await promiseMapSequential(args.retired, async (pair) => {
    const startedAt = new Date();
    const counts = await _pruneOne({
      target: args.target,
      name: args.name,
      retired: pair,
      isDryRun: true,
    });
    return { ...pair, counts, startedAt, finishedAt: new Date() };
  });
  plans.forEach(_printPlan);
  return plans.filter((plan) => {
    return !_isNothingToPrune(plan.counts);
  });
}

async function _pruneAll(args: {
  target: PostgrestTarget;
  name: string;
  plans: readonly _PlannedPrune[];
  recordScope: RecordCliScope;
}): Promise<void> {
  // Sequential on purpose: each prune is its own transaction, so a failure
  // leaves the earlier ones done and a rerun picks up the rest.
  await promiseMapSequential(args.plans, async (plan) => {
    const startedAt = new Date();
    const counts = await _pruneOne({
      target: args.target,
      name: args.name,
      retired: plan,
      isDryRun: false,
    });
    await args.recordScope(
      buildPruneExecutionScope({
        ...plan,
        counts,
        status: "succeeded",
        startedAt,
        finishedAt: new Date(),
      }),
    );
    printSuccess(`Pruned ${_formatPrune({ ...plan, counts })}`);
  });
}

/** Records each plan as a scope of the execution, with its dry run's counts. */
async function _recordPlans(args: {
  plans: readonly _PlannedPrune[];
  status: ExecutionScopeStatus;
  recordScope: RecordCliScope;
}): Promise<void> {
  // Sequential on purpose: scope rows are recorded in the printed order.
  await promiseMapSequential(args.plans, (plan) => {
    return args.recordScope(
      buildPruneExecutionScope({ ...plan, status: args.status }),
    );
  });
}

/**
 * Finds the pipeline's retired scopes and dry-runs each prune, printing
 * what it would do. Resolves to the ones with something to prune.
 */
async function _findPrunePlans(args: {
  target: PostgrestTarget;
  options: _PruneOptions;
}): Promise<_PlannedPrune[]> {
  const { target, options } = args;
  const { name } = options;
  const [live, stored] = await Promise.all([
    fetchLivePipelineScopes({ pipelineName: name, local: options.local }),
    listStoredScopes({ target, pipelineName: name }),
  ]);
  const retired = findRetiredScopes({ stored, live, scopeKey: options.scope });
  if (retired.length === 0) {
    printSuccess(`The ${name} pipeline has no retired scopes.`);
    return [];
  }
  const plans = await _planPrunes({ target, name, retired });
  if (plans.length === 0) {
    printSuccess(
      `The ${name} pipeline's retired scopes have nothing to prune.`,
    );
  }
  return plans;
}

/**
 * Plans each retired scope's prune and, unless it is a dry run, prunes
 * them after a confirmation. Records each planned or pruned scope.
 */
async function _pruneRetiredScopes(args: {
  target: PostgrestTarget;
  options: _PruneOptions;
  recordScope: RecordCliScope;
}): Promise<CliCommandResult> {
  const { target, options, recordScope } = args;
  const plans = await _findPrunePlans({ target, options });
  if (plans.length === 0) {
    return { status: "succeeded" };
  }
  if (options.isDryRun) {
    printInfo("Dry run: nothing was changed.");
    await _recordPlans({ plans, status: "succeeded", recordScope });
    return { status: "succeeded" };
  }
  const isConfirmed = await promptToConfirmReset(
    `Prune ${plans.length} retired scope(s) of ${options.name}?`,
  );
  if (!isConfirmed) {
    printInfo("Prune cancelled. Nothing was changed.");
    await _recordPlans({ plans, status: "skipped", recordScope });
    return { status: "cancelled" };
  }
  await _pruneAll({ target, name: options.name, plans, recordScope });
  return { status: "succeeded" };
}

/**
 * Finds the scopes a pipeline has stored but no longer declares, prints
 * what pruning each would do, and after a confirmation prunes them: listings
 * only a retired scope produces are deleted unless a workspace uses them,
 * other listings only lose the key, and the scope's checkpoint is deleted.
 *
 * Records the prune in `pipeline_executions`, including a dry run or a
 * declined one.
 *
 * @param options.name - The pipeline's directory name.
 * @param options.scope - Prune only this scope.
 * @param options.isDryRun - Print the plan and change nothing.
 * @param options.local - Read live scopes from this checkout, not the server.
 */
export async function pruneRetiredScopesCommand(
  options: _PruneOptions,
): Promise<void> {
  const { name } = options;
  try {
    if (options.scope !== undefined) {
      assertValidScopeKey(options.scope);
    }
    _assertLocalOnlyInDevelopment(options.local);
    const target = getPostgrestTarget();
    announcePostgrestTarget(target);
    await runRecordedCliCommand({
      target,
      start: {
        pipelineName: name,
        command: "prune_retired_scopes",
        isDryRun: options.isDryRun,
        isScoped: options.scope !== undefined,
        arguments: {
          ...(options.scope === undefined ? {} : { scope: options.scope }),
          dryRun: options.isDryRun,
        },
      },
      work: ({ recordScope }) => {
        return _pruneRetiredScopes({ target, options, recordScope });
      },
    });
  } catch (error: unknown) {
    printError(`Failed to prune retired scopes of pipeline: ${name}`);
    printError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/** `ava pipeline prune-retired-scopes`. */
export const PruneRetiredScopesCli = Acclimate.createCLI("prune-retired-scopes")
  .description(
    "Remove what a pipeline wrote for scopes it no longer declares. Prints " +
      "what each retired scope's prune would do, then asks before changing " +
      "anything. Listings a workspace uses are never deleted. Reads live " +
      "scopes from the pipeline server and the database in .env.development, " +
      "or the --staging/--prod ones. Do not run it while a pipeline run is " +
      "in progress: the run can write back the checkpoints and scope keys " +
      "it removes. Records each prune, including a dry run, in the " +
      "database's pipeline_executions table.",
  )
  .addPositionalArg({
    name: "name",
    required: true,
    description: "The pipeline whose retired scopes to prune.",
    type: "string",
  })
  .addOption({
    name: "--scope",
    type: "string",
    required: false,
    description: "Prune only this retired scope.",
  })
  .addOption({
    name: "--dry-run",
    type: "boolean",
    required: false,
    defaultValue: false,
    description: "Print what would be pruned and change nothing.",
  })
  .addOption({
    name: "--local",
    aliases: ["-l"] as const,
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Read live scopes from this checkout instead of the pipeline server. " +
      "Only against the development database.",
  })
  .action(
    (
      args: Readonly<{
        name: string;
        scope?: string;
        dryRun: boolean;
        local: boolean;
      }>,
    ) => {
      return pruneRetiredScopesCommand({
        name: args.name,
        scope: args.scope,
        isDryRun: args.dryRun,
        local: args.local,
      });
    },
  );
