import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { announcePostgrestTarget } from "@ava-cli/PipelineCli/announcePostgrestTarget/announcePostgrestTarget";
import { fetchLivePipelineScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import { findRetiredScopes } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/findRetiredScopes";
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
  PostgrestTarget,
  ScopePruneCounts,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";

type _PlannedPrune = RetiredScope & Readonly<{ counts: ScopePruneCounts }>;

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
 * Dry-runs each retired scope's prune and prints what it would do. Resolves
 * to the retired scopes with their dry-run counts.
 */
async function _planPrunes(args: {
  target: PostgrestTarget;
  name: string;
  retired: readonly RetiredScope[];
}): Promise<_PlannedPrune[]> {
  // Sequential on purpose: one dry run at a time keeps the database load
  // and the printed plan in the stored order.
  const plans = await promiseMapSequential(args.retired, async (pair) => {
    const counts = await _pruneOne({
      target: args.target,
      name: args.name,
      retired: pair,
      isDryRun: true,
    });
    return { ...pair, counts };
  });
  plans.forEach((plan) => {
    printInfo(_formatPrune(plan));
  });
  return plans;
}

async function _pruneAll(args: {
  target: PostgrestTarget;
  name: string;
  plans: readonly _PlannedPrune[];
}): Promise<void> {
  // Sequential on purpose: each prune is its own transaction, so a failure
  // leaves the earlier ones done and a rerun picks up the rest.
  await promiseMapSequential(args.plans, async (plan) => {
    const counts = await _pruneOne({ ...args, retired: plan, isDryRun: false });
    printSuccess(`Pruned ${_formatPrune({ ...plan, counts })}`);
  });
}

/**
 * Finds the scopes a pipeline has stored but no longer declares, prints
 * what pruning each would do, and after a confirmation prunes them: listings
 * only a retired scope produces are deleted unless a workspace uses them,
 * other listings only lose the key, and the scope's checkpoint is deleted.
 *
 * @param options.name - The pipeline's directory name.
 * @param options.scope - Prune only this scope.
 * @param options.isDryRun - Print the plan and change nothing.
 * @param options.local - Read live scopes from this checkout, not the server.
 */
export async function pruneRetiredScopesCommand(options: {
  name: string;
  scope?: string;
  isDryRun: boolean;
  local: boolean;
}): Promise<void> {
  const { name } = options;
  try {
    _assertLocalOnlyInDevelopment(options.local);
    const target = getPostgrestTarget();
    announcePostgrestTarget(target);
    const [live, stored] = await Promise.all([
      fetchLivePipelineScopes({ pipelineName: name, local: options.local }),
      listStoredScopes({ target, pipelineName: name }),
    ]);
    const retired = findRetiredScopes({
      stored,
      live,
      scopeKey: options.scope,
    });
    if (retired.length === 0) {
      printSuccess(`The ${name} pipeline has no retired scopes.`);
      return;
    }
    const plans = await _planPrunes({ target, name, retired });
    if (options.isDryRun) {
      printInfo("Dry run: nothing was changed.");
      return;
    }
    const isConfirmed = await promptToConfirmReset(
      `Prune ${plans.length} retired scope(s) of ${name}?`,
    );
    if (!isConfirmed) {
      printInfo("Prune cancelled. Nothing was changed.");
      return;
    }
    await _pruneAll({ target, name, plans });
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
      "or the --staging/--prod ones.",
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
