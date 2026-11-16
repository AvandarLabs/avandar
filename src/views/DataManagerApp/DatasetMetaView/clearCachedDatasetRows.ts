import { makePrincipalKeyFromWorkspaceSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Drops every copy of a dataset's rows this tab has cached: the user's
 * relation cache entries and the table loaded into this tab's DuckDB. The
 * next query that reads the dataset then acquires its rows from the source.
 */
export async function clearCachedDatasetRows(
  options: Readonly<{
    datasetId: Dataset.Id;
    userId: User.Id;
    workspaceId: Workspace.Id;
  }>,
): Promise<void> {
  const { datasetId, userId, workspaceId } = options;
  await DexieRelationCache.evict(
    [{ kind: "dataset", id: datasetId }],
    makePrincipalKeyFromWorkspaceSession({ workspaceId, userId }),
  );
  await LocalDatasetClient.dropLocalDataset({ datasetId });
}
