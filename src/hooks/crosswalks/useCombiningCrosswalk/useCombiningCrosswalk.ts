import { where } from "@avandar/utils";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The crosswalk that combined a dataset, if one did. */
export type CombiningCrosswalk = {
  crosswalk: Crosswalk.T | undefined;
  isLoading: boolean;
  /** True when the lookup failed, so "no crosswalk" is not known. */
  isError: boolean;
};

/**
 * The crosswalk whose combined dataset `datasetId` is, read fresh on
 * mount so a dataset combined a moment ago is recognized. Only a virtual
 * dataset can be combined, so a caller that knows the dataset is another
 * kind passes `isEnabled: false` and nothing is read. Used by the
 * dataset's rail and its menu.
 */
export function useCombiningCrosswalk(
  datasetId: Dataset.Id,
  options: Readonly<{ isEnabled?: boolean }> = {},
): CombiningCrosswalk {
  const { isEnabled = true } = options;
  const [crosswalks, isLoading, query] = CrosswalkClient.useGetAll({
    ...where("output_dataset_id", "eq", datasetId),
    useQueryOptions: { ...ALWAYS_REFETCH_ON_MOUNT, enabled: isEnabled },
  });
  return {
    crosswalk: isEnabled ? crosswalks?.[0] : undefined,
    isLoading: isEnabled && isLoading,
    isError: isEnabled && query.isError,
  };
}
