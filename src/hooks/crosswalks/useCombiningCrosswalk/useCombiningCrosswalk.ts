import { where } from "@avandar/utils";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The crosswalk that combined a dataset, if one did. */
export type CombiningCrosswalk = {
  crosswalk: Crosswalk.T | undefined;
  isLoading: boolean;
};

/**
 * The crosswalk whose combined dataset `datasetId` is, read fresh on
 * mount so a dataset combined a moment ago is recognized. Used by the
 * dataset's rail and its menu.
 */
export function useCombiningCrosswalk(
  datasetId: Dataset.Id,
): CombiningCrosswalk {
  const [crosswalks, isLoading] = CrosswalkClient.useGetAll({
    ...where("output_dataset_id", "eq", datasetId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  return { crosswalk: crosswalks?.[0], isLoading };
}
