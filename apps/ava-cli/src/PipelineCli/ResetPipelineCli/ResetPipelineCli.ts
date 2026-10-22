import { announcePostgrestTarget } from "@ava-cli/PipelineCli/announcePostgrestTarget/announcePostgrestTarget";
import { assertValidScopeKey } from "@ava-cli/PipelineCli/assertValidScopeKey/assertValidScopeKey";
import { runRecordedCliCommand } from "@ava-cli/PipelineCli/recordCliExecution/runRecordedCliCommand";
import {
  countCheckpoints,
  countListings,
  deleteCheckpoints,
  deleteDatasets,
  deleteListings,
  findInUseListings,
  getPostgrestTarget,
  pruneScope,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import {
  promptForInUseListingsChoice,
  promptToConfirmReset,
} from "@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts";
import {
  describeScopePruneCounts,
  isScopePruneEmpty,
  scopePruneCountsToDeletionCounts,
} from "@ava-cli/PipelineCli/scopePruneCounts/scopePruneCounts";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import type { CliCommandResult } from "@ava-cli/PipelineCli/recordCliExecution/runRecordedCliCommand";
import type {
  InUseListing,
  ListingFilter,
  PostgrestTarget,
  ScopePruneCounts,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type { ExecutionOutcome } from "@etl/stores/ExecutionStore.types";

/** What a reset deleted. */
type _ResetDeletions = NonNullable<ExecutionOutcome["deletions"]>;

/** A scope reset's prune counts and deleted workspace datasets. */
function _toResetDeletions(
  counts: ScopePruneCounts,
  workspaceDatasetsDeleted: number,
): _ResetDeletions {
  return {
    ...scopePruneCountsToDeletionCounts(counts),
    workspaceDatasetsDeleted,
  };
}

/**
 * Builds the filter that selects the listings `pipelineName` wrote. Every
 * pipeline records itself in `pipeline_name`, on API listings as well as
 * Parquet ones, so one rule covers all of them. A hand-curated listing has
 * no `pipeline_name` and is never selected.
 */
export function buildListingFilterFromPipeline(
  pipelineName: string,
): ListingFilter {
  return { pipeline_name: `eq.${pipelineName}` };
}

/**
 * Asks what to do with the listings workspaces use, and resolves to the ids
 * of the workspace datasets to delete and the listings to keep.
 */
async function _resolveInUseListings(
  inUseListings: readonly InUseListing[],
): Promise<{ datasetIds: string[]; keepListingIds: string[] }> {
  const listingIds = [
    ...new Set(
      inUseListings.map((row) => {
        return row.catalog_listing_id;
      }),
    ),
  ];
  const workspaceCount = new Set(
    inUseListings.map((row) => {
      return row.workspace_id;
    }),
  ).size;
  printWarn(
    `${listingIds.length} of these listings are used by ` +
      `${inUseListings.length} dataset(s) in ${workspaceCount} workspace(s).`,
  );

  const choice = await promptForInUseListingsChoice(
    "What should happen to the listings that workspaces use?",
  );
  if (choice === "keep") {
    return { datasetIds: [], keepListingIds: listingIds };
  }
  return {
    datasetIds: inUseListings.map((row) => {
      return row.dataset_id;
    }),
    keepListingIds: [],
  };
}

/**
 * Deletes what the user chose, reports how much was deleted, and resolves to
 * the counts.
 */
async function _deleteChosenRows(options: {
  name: string;
  target: PostgrestTarget;
  filter: ListingFilter;
  datasetIds: readonly string[];
  keepListingIds: readonly string[];
}): Promise<
  Readonly<{
    listingsDeleted: number;
    listingsKeptInUse: number;
    workspaceDatasetsDeleted: number;
  }>
> {
  const { name, target, filter, datasetIds, keepListingIds } = options;
  // Workspace datasets go first: deleting a listing alone would cascade away
  // each dataset's `datasets__open_data` row and leave the `datasets` row
  // behind, pointing at nothing.
  if (datasetIds.length > 0) {
    await deleteDatasets({ target, datasetIds });
  }
  const deletedCount = await deleteListings({ target, filter, keepListingIds });
  const keptMessage =
    keepListingIds.length > 0
      ? ` Kept ${keepListingIds.length} that workspaces use.`
      : "";
  const datasetsMessage =
    datasetIds.length > 0
      ? ` Deleted ${datasetIds.length} workspace dataset(s).`
      : "";
  printSuccess(
    `Deleted ${deletedCount} ${name} listing(s).${datasetsMessage}${keptMessage}`,
  );
  return {
    listingsDeleted: deletedCount,
    listingsKeptInUse: keepListingIds.length,
    workspaceDatasetsDeleted: datasetIds.length,
  };
}

/**
 * Deletes a pipeline's checkpoints, then the listings and workspace
 * datasets the user chooses, and resolves to what was deleted.
 */
async function _deleteWholePipeline(options: {
  name: string;
  target: PostgrestTarget;
  filter: ListingFilter;
}): Promise<_ResetDeletions> {
  const { name, target, filter } = options;
  const inUseListings = await findInUseListings({ target, filter });
  const { datasetIds, keepListingIds } =
    inUseListings.length === 0
      ? { datasetIds: [], keepListingIds: [] }
      : await _resolveInUseListings(inUseListings);
  // Checkpoints go first. If a later delete failed with the checkpoints
  // still there, the next incremental run would resume past listings that
  // are gone and never write them again. Without a checkpoint it only
  // crawls from the start.
  const checkpointsDeleted = await deleteCheckpoints({
    target,
    pipelineName: name,
  });
  const deleted = await _deleteChosenRows({
    name,
    target,
    filter,
    datasetIds,
    keepListingIds,
  });
  return { ...deleted, listingsDetached: 0, checkpointsDeleted };
}

/**
 * Deletes every listing and checkpoint of one pipeline, after asking. Asks
 * again what to do when workspaces already use some of those listings.
 * Resolves to how the reset ended and what it deleted.
 */
async function _resetWholePipeline(options: {
  name: string;
  target: PostgrestTarget;
}): Promise<CliCommandResult> {
  const { name, target } = options;
  const filter = buildListingFilterFromPipeline(name);
  const [listingCount, checkpointCount] = await Promise.all([
    countListings({ target, filter }),
    countCheckpoints({ target, pipelineName: name }),
  ]);
  if (listingCount === 0 && checkpointCount === 0) {
    printSuccess(`No ${name} listings or checkpoints to delete.`);
    return { status: "succeeded" };
  }
  const isConfirmed = await promptToConfirmReset(
    `Delete all ${listingCount} ${name} listing(s) and ${checkpointCount} checkpoint(s)?`,
  );
  if (!isConfirmed) {
    printInfo("Reset cancelled. Nothing was deleted.");
    // The counts it showed were totals, not deletions, so none are
    // recorded.
    return { status: "cancelled" };
  }
  return {
    status: "succeeded",
    deletions: await _deleteWholePipeline({ name, target, filter }),
  };
}

/**
 * Asks what to do with the workspace datasets added from listings only
 * `scope` produces, deletes them when the user chooses to, and resolves to
 * how many were deleted.
 */
async function _deleteScopeDatasetsIfChosen(options: {
  name: string;
  scope: string;
  target: PostgrestTarget;
}): Promise<number> {
  const { name, scope, target } = options;
  // Only listings this scope alone produces can be deleted, so only their
  // workspace datasets are asked about.
  const inUseListings = await findInUseListings({
    target,
    filter: {
      ...buildListingFilterFromPipeline(name),
      pipeline_scope_keys: `eq.{${scope}}`,
    },
  });
  if (inUseListings.length === 0) {
    return 0;
  }
  const { datasetIds } = await _resolveInUseListings(inUseListings);
  if (datasetIds.length > 0) {
    await deleteDatasets({ target, datasetIds });
  }
  return datasetIds.length;
}

/**
 * Removes one scope from a pipeline's listings and checkpoints on every
 * drive, after showing a dry run's counts and asking. Resolves to how the
 * reset ended and what it deleted, or for a declined one, what it showed.
 */
async function _resetScope(options: {
  name: string;
  scope: string;
  target: PostgrestTarget;
}): Promise<CliCommandResult> {
  const { name, scope, target } = options;
  const pruneArgs = {
    target,
    pipelineName: name,
    scopeKey: scope,
    driveKey: undefined,
  };
  const planned = await pruneScope({ ...pruneArgs, isDryRun: true });
  if (isScopePruneEmpty(planned)) {
    printSuccess(`No ${name} listings or checkpoints have the scope ${scope}.`);
    return { status: "succeeded" };
  }
  printInfo(`Resetting ${scope} would ${describeScopePruneCounts(planned)}.`);
  const isConfirmed = await promptToConfirmReset(
    `Remove the scope ${scope} from ${name}?`,
  );
  if (!isConfirmed) {
    printInfo("Reset cancelled. Nothing was deleted.");
    return { status: "cancelled", deletions: _toResetDeletions(planned, 0) };
  }
  const workspaceDatasetsDeleted =
    planned.listings_kept_in_use > 0
      ? await _deleteScopeDatasetsIfChosen({ name, scope, target })
      : 0;
  const pruned = await pruneScope({ ...pruneArgs, isDryRun: false });
  printSuccess(
    `Reset ${scope} of ${name}: ${describeScopePruneCounts(pruned)}.`,
  );
  return {
    status: "succeeded",
    deletions: _toResetDeletions(pruned, workspaceDatasetsDeleted),
  };
}

/**
 * Deletes a pipeline's listings and checkpoints, or with `scope`, removes
 * one scope from them on every drive. Asks before changing anything.
 * Records the reset in `pipeline_executions`, including a declined one.
 *
 * @param options.name - The pipeline's directory name.
 * @param options.scope - Reset only this scope.
 */
export async function resetPipelineCommand(options: {
  name: string;
  scope?: string;
}): Promise<void> {
  const { name, scope } = options;
  try {
    if (scope !== undefined) {
      assertValidScopeKey(scope);
    }
    const target = getPostgrestTarget();
    announcePostgrestTarget(target);
    await runRecordedCliCommand({
      target,
      start: {
        pipelineName: name,
        command: "reset",
        isDryRun: false,
        isScoped: scope !== undefined,
        arguments: scope === undefined ? {} : { scope },
      },
      work: () => {
        return scope === undefined
          ? _resetWholePipeline({ name, target })
          : _resetScope({ name, scope, target });
      },
    });
  } catch (error: unknown) {
    printError(`Failed to reset pipeline: ${name}`);
    printError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export const ResetPipelineCli = Acclimate.createCLI("reset")
  .description(
    "Delete the data catalog listings a pipeline wrote, so it can be run " +
      "again from scratch. Asks before deleting anything. Uses the database " +
      "in .env.development, or the --staging/--prod one. Selects a " +
      "pipeline's listings by pipeline_name only, so listings written " +
      "before the pipeline_name backfill migration are not selected until " +
      "that migration has run. Also deletes the pipeline's checkpoints, " +
      "before any listing. Do not run it while a pipeline run is in " +
      "progress: the run can write back the checkpoints and scope keys it " +
      "removes. Records each reset in the database's pipeline_executions " +
      "table.",
  )
  .addPositionalArg({
    name: "name",
    required: true,
    description: "The pipeline whose listings to delete.",
    type: "string",
  })
  .addOption({
    name: "--scope",
    type: "string",
    required: false,
    description:
      "Reset only this scope on every drive: listings only it produces " +
      "are deleted, listings another scope also produces only lose it, " +
      "and its checkpoints are deleted, so the next run crawls it from " +
      "the beginning.",
  })
  .action(({ name, scope }: Readonly<{ name: string; scope?: string }>) => {
    return resetPipelineCommand({ name, scope });
  });
