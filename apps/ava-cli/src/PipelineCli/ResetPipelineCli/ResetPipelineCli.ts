import { announcePostgrestTarget } from "@ava-cli/PipelineCli/announcePostgrestTarget/announcePostgrestTarget";
import { assertValidScopeKey } from "@ava-cli/PipelineCli/assertValidScopeKey/assertValidScopeKey";
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
} from "@ava-cli/PipelineCli/scopePruneCounts/scopePruneCounts";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import type {
  InUseListing,
  ListingFilter,
  PostgrestTarget,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";

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

/** Deletes what the user chose and reports how much was deleted. */
async function _deleteChosenRows(options: {
  name: string;
  target: PostgrestTarget;
  filter: ListingFilter;
  datasetIds: readonly string[];
  keepListingIds: readonly string[];
}): Promise<void> {
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
}

/**
 * Deletes every listing and checkpoint of one pipeline, after asking. Asks
 * again what to do when workspaces already use some of those listings.
 */
async function _resetWholePipeline(options: {
  name: string;
  target: PostgrestTarget;
}): Promise<void> {
  const { name, target } = options;
  const filter = buildListingFilterFromPipeline(name);
  const [listingCount, checkpointCount] = await Promise.all([
    countListings({ target, filter }),
    countCheckpoints({ target, pipelineName: name }),
  ]);
  if (listingCount === 0 && checkpointCount === 0) {
    printSuccess(`No ${name} listings or checkpoints to delete.`);
    return;
  }
  const isConfirmed = await promptToConfirmReset(
    `Delete all ${listingCount} ${name} listing(s) and ${checkpointCount} checkpoint(s)?`,
  );
  if (!isConfirmed) {
    printInfo("Reset cancelled. Nothing was deleted.");
    return;
  }
  const inUseListings = await findInUseListings({ target, filter });
  const { datasetIds, keepListingIds } =
    inUseListings.length === 0
      ? { datasetIds: [], keepListingIds: [] }
      : await _resolveInUseListings(inUseListings);
  // Checkpoints go first. If a later delete failed with the checkpoints
  // still there, the next incremental run would resume past listings that
  // are gone and never write them again. Without a checkpoint it only
  // crawls from the start.
  await deleteCheckpoints({ target, pipelineName: name });
  await _deleteChosenRows({
    name,
    target,
    filter,
    datasetIds,
    keepListingIds,
  });
}

/**
 * Asks what to do with the workspace datasets added from listings only
 * `scope` produces, and deletes them when the user chooses to.
 */
async function _deleteScopeDatasetsIfChosen(options: {
  name: string;
  scope: string;
  target: PostgrestTarget;
}): Promise<void> {
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
    return;
  }
  const { datasetIds } = await _resolveInUseListings(inUseListings);
  if (datasetIds.length > 0) {
    await deleteDatasets({ target, datasetIds });
  }
}

/**
 * Removes one scope from a pipeline's listings and checkpoints on every
 * drive, after showing a dry run's counts and asking.
 */
async function _resetScope(options: {
  name: string;
  scope: string;
  target: PostgrestTarget;
}): Promise<void> {
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
    return;
  }
  printInfo(`Resetting ${scope} would ${describeScopePruneCounts(planned)}.`);
  const isConfirmed = await promptToConfirmReset(
    `Remove the scope ${scope} from ${name}?`,
  );
  if (!isConfirmed) {
    printInfo("Reset cancelled. Nothing was deleted.");
    return;
  }
  if (planned.listings_kept_in_use > 0) {
    await _deleteScopeDatasetsIfChosen({ name, scope, target });
  }
  const pruned = await pruneScope({ ...pruneArgs, isDryRun: false });
  printSuccess(`Reset ${scope} of ${name}: ${describeScopePruneCounts(pruned)}.`);
}

/**
 * Deletes a pipeline's listings and checkpoints, or with `scope`, removes
 * one scope from them on every drive. Asks before changing anything.
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
    if (scope === undefined) {
      await _resetWholePipeline({ name, target });
    } else {
      await _resetScope({ name, scope, target });
    }
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
      "removes.",
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
