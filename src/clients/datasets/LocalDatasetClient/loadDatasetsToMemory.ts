import { prop, where } from "@utils/index";
import { AuthClient } from "@/clients/AuthClient";
import { difference } from "@/lib/utils/arrays/difference/difference";
import { LocalDatasetClient } from "./LocalDatasetClient";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

export async function loadDatasetsToMemory({
  datasetIds,
  workspaceId,
}: {
  datasetIds: DatasetId[];
  workspaceId: Workspace.Id;
}): Promise<void> {
  if (datasetIds.length === 0) {
    return;
  }

  // TODO: has to be in this workspace tho, update that
  const currentLocalDatasets = await LocalDatasetClient.getAll(
    where("datasetId", "in", datasetIds) &&
      where("workspaceId", "eq", workspaceId),
  );

  const missingLocalDatasets = difference(
    datasetIds,
    currentLocalDatasets.map(prop("datasetId")),
  );

  if (missingLocalDatasets.length > 0) {
    const session = await AuthClient.getCurrentSession();
    const userId = session?.user?.id;
    if (!userId) {
      throw new Error(
        "Missing datasets could not be downloaded because user is not authenticated.",
      );
    }
  }
}
