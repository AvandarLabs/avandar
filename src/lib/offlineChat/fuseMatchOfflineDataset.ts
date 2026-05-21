import Fuse from "fuse.js";
import { tokenizeForDatasetMatch } from "./offlineDatasetLabelMatch";
import type { OfflineChatSchemaDataset } from "./offlineChat.types";

/**
 * Fuse.js score at or below this value is treated as a confident name match.
 */
export const OFFLINE_DATASET_FUSE_THRESHOLD = 0.38;

/**
 * Picks the workspace dataset whose label is closest to `searchText` using
 * fuzzy matching. Used when exact or token-heuristic resolution fails.
 */
export function fuseMatchOfflineDatasetByName(args: {
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
        searchLabel: tokenizeForDatasetMatch(dataset.name).join(" "),
      };
    }),
    {
      keys: ["name", "searchLabel", "id"],
      threshold: OFFLINE_DATASET_FUSE_THRESHOLD,
      ignoreLocation: true,
      includeScore: true,
    },
  );

  const fuseResults = fuse.search(searchText);
  const top = fuseResults[0];
  console.log("fuse results", { fuseResults, top });
  if (
    top &&
    top.score !== undefined &&
    top.score <= OFFLINE_DATASET_FUSE_THRESHOLD
  ) {
    return args.datasets.find((dataset) => {
      return dataset.id === top.item.id;
    });
  }
}
