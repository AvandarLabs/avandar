import { getDatasetIdsFromMapConfig } from "@/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _hasLimitedDataset(
  options: Readonly<{ avaMap: AvaMap.T; datasets: readonly Dataset.T[] }>,
): boolean {
  return getDatasetIdsFromMapConfig(options.avaMap.config).some((datasetId) => {
    const dataset = options.datasets.find((candidate) => {
      return candidate.id === datasetId;
    });
    return !dataset || dataset.isRestricted;
  });
}

/**
 * The maps on a dashboard that some of its audience cannot open: restricted
 * maps, maps reading a restricted dataset or one the author cannot read, and
 * maps the author cannot read at all. A map the author cannot read is listed
 * as `unavailableMapLabel`, since its name is hidden from them.
 */
export function getLimitedAudienceMapNames(
  options: Readonly<{
    mapIds: readonly AvaMap.Id[];
    maps: readonly AvaMap.T[];
    datasets: readonly Dataset.T[];
    unavailableMapLabel: string;
  }>,
): string[] {
  return options.mapIds.flatMap((mapId) => {
    const avaMap = options.maps.find((candidate) => {
      return candidate.id === mapId;
    });
    if (!avaMap) {
      return [options.unavailableMapLabel];
    }
    return avaMap.isRestricted ||
      _hasLimitedDataset({ avaMap, datasets: options.datasets })
      ? [avaMap.name]
      : [];
  });
}
