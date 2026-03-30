import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { VirtualDatasetId } from "$/models/datasets/VirtualDataset/VirtualDataset.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

/**
 * Identifies the currently open saved dataset in the Data Explorer, if any.
 * Stored in state so the toolbar can offer "Save Over" and "Delete" actions.
 */
export type OpenDatasetInfo = {
  datasetId: DatasetId;
  name: string;
  virtualDatasetId: VirtualDatasetId;
};

export type DataExplorerAppState = {
  query: PartialStructuredQuery;

  /**
   * If raw SQL was generated, we should use that for our query instead of
   * the structured query.
   */
  rawSQL: string | undefined;
  vizConfig: VizConfig;

  /** The currently open saved dataset, or `undefined` if none is open. */
  openDataset: OpenDatasetInfo | undefined;
};

export const INITIAL_DATA_EXPLORER_STATE: DataExplorerAppState = {
  query: StructuredQuery.makeEmpty(),
  vizConfig: {
    vizType: "table",
  },
  rawSQL: undefined,
  openDataset: undefined,
};
