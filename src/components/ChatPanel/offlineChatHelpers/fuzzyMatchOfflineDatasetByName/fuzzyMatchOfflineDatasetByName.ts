import { propEq } from "@utils";
import Fuse from "fuse.js";
import { OfflineDatasetLabelMatch } from "../OfflineDatasetLabelMatch";
import type { OfflineChatSchemaDataset } from "$/types/offlineChat.types";

/**
 * Fuse.js score at or below this value is treated as a confident name match.
 */
export const OFFLINE_DATASET_FUSE_THRESHOLD = 0.38;

/**
 * Picks the workspace dataset whose label is closest to `searchText` using
 * fuzzy matching. Used when exact or token-heuristic resolution fails.
 */
export function fuzzyMatchOfflineDatasetByName(args: {
  searchText: string;
  datasets: readonly OfflineChatSchemaDataset[];
}): OfflineChatSchemaDataset | undefined {
  const searchText = args.searchText.trim();
  if (!searchText || args.datasets.length === 0) {
    return undefined;
  }

  const fuse = new Fuse(
    args.datasets.map((dataset) => {
      return {
        id: dataset.id,
        name: dataset.name,
        searchLabel: OfflineDatasetLabelMatch.tokenize(dataset.name).join(" "),
      };
    }),
    {
      keys: ["name", "searchLabel", "id"],
      threshold: OFFLINE_DATASET_FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    },
  );

  const top = fuse.search(searchText)[0];
  if (
    top &&
    top.score !== undefined &&
    top.score <= OFFLINE_DATASET_FUSE_THRESHOLD
  ) {
    return args.datasets.find(propEq("id", top.item.id));
  }
  return undefined;
}
