import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import {
  countListings,
  deleteDatasets,
  deleteListings,
  findInUseListings,
  getPostgrestTarget,
} from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import {
  promptForInUseListingsChoice,
  promptToConfirmReset,
} from "@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts";
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
 * Filters for the pipelines whose listings are API resources. Those rows have
 * no `pipeline_name`, so they are selected by the API that serves them
 * instead. Every other pipeline writes `pipeline_name` on its rows.
 */
const API_LISTING_FILTER_FROM_PIPELINE: Readonly<
  Record<string, ListingFilter>
> = {
  socrata: { api_service: "eq.socrata" },
  // HDX is a CKAN deployment, so its base URL is what tells its listings
  // apart from another CKAN instance's.
  hdx: { api_service: "eq.ckan", api_base_url: "eq.https://data.humdata.org" },
};

/** Builds the filter that selects the listings `pipelineName` wrote. */
export function buildListingFilterFromPipeline(
  pipelineName: string,
): ListingFilter {
  return (
    API_LISTING_FILTER_FROM_PIPELINE[pipelineName] ?? {
      pipeline_name: `eq.${pipelineName}`,
    }
  );
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

/** Prints which database is about to change, loudly when it is production. */
function _announceTarget(target: PostgrestTarget): void {
  const envTarget = AvaEnv.getLoadedEnvTarget();
  printInfo(`Database: ${envTarget} (${target.apiUrl})`);
  if (envTarget === "production") {
    printWarn(
      "WARNING: this will delete rows from the PRODUCTION database. " +
        "Workspaces in production may be using these listings.",
    );
  }
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
 * Deletes the `data_catalog_listings` rows a pipeline wrote, so it can be run
 * again from an empty catalog. Asks for confirmation first, and asks again
 * what to do when workspaces already use some of those listings.
 *
 * @param options.name - The pipeline's directory name.
 */
export async function resetPipelineCommand(options: {
  name: string;
}): Promise<void> {
  const { name } = options;
  try {
    const target = getPostgrestTarget();
    const filter = buildListingFilterFromPipeline(name);
    _announceTarget(target);

    const listingCount = await countListings({ target, filter });
    if (listingCount === 0) {
      printSuccess(`No ${name} listings to delete.`);
      return;
    }
    const isConfirmed = await promptToConfirmReset(
      `Delete all ${listingCount} ${name} listing(s)?`,
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
    await _deleteChosenRows({
      name,
      target,
      filter,
      datasetIds,
      keepListingIds,
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
      "in .env.development, or the --staging/--prod one.",
  )
  .addPositionalArg({
    name: "name",
    required: true,
    description: "The pipeline whose listings to delete.",
    type: "string",
  })
  .action(({ name }: Readonly<{ name: string }>) => {
    return resetPipelineCommand({ name });
  });
