import { prop, promiseMap, where } from "@avandar/utils";
import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { CrosswalkDatasetClient } from "@/clients/crosswalks/CrosswalkDatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { Logger } from "@/utils/Logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * The linked datasets that read `datasetId`, whose cached rows are copies of
 * its rows. A failed read finds none, so the dataset itself is still
 * cleared.
 */
async function _getLinkedDatasetIds(
  datasetId: Dataset.Id,
): Promise<Dataset.Id[]> {
  try {
    const linkedDatasets = await VirtualDatasetClient.withCache(AvaQueryClient)
      .withEnsureQueryData()
      .getAll(where("linked_source_dataset_id", "eq", datasetId));
    return linkedDatasets.map((linkedDataset) => {
      return linkedDataset.datasetId;
    });
  } catch (error) {
    Logger.error("Could not read the linked datasets to refresh", { error });
    return [];
  }
}

/**
 * The combined datasets of every crosswalk that stacks `datasetId`, whose
 * cached rows hold copies of its rows. Read from the server, never from the
 * query cache: a dataset added to a crosswalk a moment ago must be found. A
 * failed read finds none, so the dataset itself is still cleared.
 */
async function _getCombinedDatasetIds(
  datasetId: Dataset.Id,
): Promise<Dataset.Id[]> {
  try {
    const memberships = await CrosswalkDatasetClient.getAll(
      where("dataset_id", "eq", datasetId),
    );
    const crosswalkIds = [...new Set(memberships.map(prop("crosswalkId")))];
    if (crosswalkIds.length === 0) {
      return [];
    }
    const crosswalks = await CrosswalkClient.getAll(
      where("id", "in", crosswalkIds),
    );
    return crosswalks.flatMap((crosswalk) => {
      return crosswalk.outputDatasetId === undefined
        ? []
        : [crosswalk.outputDatasetId];
    });
  } catch (error) {
    Logger.error("Could not read the combined datasets to refresh", { error });
    return [];
  }
}

/**
 * Drops every copy of a dataset's rows this tab has cached, and of the
 * linked datasets that read it and the combined datasets that stack it:
 * the user's relation cache entries and the tables loaded into this tab's
 * DuckDB. The next query that reads any of them acquires its rows from
 * the source.
 */
export async function clearCachedDatasetRows(
  options: Readonly<{
    datasetId: Dataset.Id;
    userId: User.Id;
    workspaceId: Workspace.Id;
  }>,
): Promise<void> {
  const { datasetId, userId, workspaceId } = options;
  const [linkedIds, combinedIds] = await Promise.all([
    _getLinkedDatasetIds(datasetId),
    _getCombinedDatasetIds(datasetId),
  ]);
  const datasetIds = [...new Set([datasetId, ...linkedIds, ...combinedIds])];
  await DexieRelationCache.evict(
    datasetIds.map((id) => {
      return { kind: "dataset", id } as const;
    }),
    makePrincipalKeyFromWorkspaceSession({ workspaceId, userId }),
  );
  await promiseMap(datasetIds, async (id) => {
    await LocalDatasetClient.dropLocalDataset({ datasetId: id });
  });
}
