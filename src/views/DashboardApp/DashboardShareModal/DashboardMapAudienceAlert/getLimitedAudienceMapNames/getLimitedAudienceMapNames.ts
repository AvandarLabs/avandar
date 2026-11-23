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

/** The maps on a dashboard that some of its audience cannot open. */
export type LimitedAudienceMaps = {
  /** Names of the limited maps the author can read, in first-use order. */
  mapNames: string[];

  /** How many maps the author cannot read, whose names are hidden from them. */
  numUnavailableMaps: number;
};

/**
 * The maps on a dashboard that some of its audience cannot open: restricted
 * maps, maps reading a restricted dataset or one the author cannot read, and
 * maps the author cannot read at all. A map the author cannot read is only
 * counted, since its name is hidden from them.
 */
export function getLimitedAudienceMapNames(
  options: Readonly<{
    mapIds: readonly AvaMap.Id[];
    maps: readonly AvaMap.T[];
    datasets: readonly Dataset.T[];
  }>,
): LimitedAudienceMaps {
  const mapNames: string[] = [];
  let numUnavailableMaps = 0;
  options.mapIds.forEach((mapId) => {
    const avaMap = options.maps.find((candidate) => {
      return candidate.id === mapId;
    });
    if (!avaMap) {
      numUnavailableMaps += 1;
    } else if (
      avaMap.isRestricted ||
      _hasLimitedDataset({ avaMap, datasets: options.datasets })
    ) {
      mapNames.push(avaMap.name);
    }
  });
  return { mapNames, numUnavailableMaps };
}
