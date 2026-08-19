import { propEq } from "@avandar/utils";
import type {
  MapLayerRebindReason,
  MapLayerRebindRequired,
} from "../MapLayerSpatialQuery.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** Creates one actionable rebind result. */
export function createRebindRequired(
  reason: MapLayerRebindReason,
  referenceId: string,
): MapLayerRebindRequired {
  return { type: "rebindRequired", reason, referenceId };
}

/** Finds one column only when it still belongs to the referenced dataset. */
export function findBoundaryColumn(
  columns: readonly DatasetColumn.T[],
  datasetId: Dataset.Id,
  columnId: DatasetColumn.Id,
): DatasetColumn.T | undefined {
  return columns
    .filter(propEq("id", columnId))
    .find(propEq("datasetId", datasetId));
}
