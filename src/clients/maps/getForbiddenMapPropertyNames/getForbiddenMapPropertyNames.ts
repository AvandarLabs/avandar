import { isDefined, propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getPlacesLayerDatasetId } from "@/views/GisApp/places/getPlacesLayerDatasetId/getPlacesLayerDatasetId";
import { PLACE_ID_COLUMN_NAME } from "@/views/GisApp/places/withPlaceIdColumn/withPlaceIdColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The query column ids a binding reads a location from. */
function _getBoundLocationColumnIds(layer: MapLayer.T): QueryColumn.Id[] {
  const binding = layer.geoBinding;
  const pointBinding =
    binding?.type === "binPointsToGrid" ||
    binding?.type === "aggregatePointsToBoundaries"
      ? binding.points
      : binding;
  if (pointBinding?.type === "geometryColumn") {
    return [pointBinding.column];
  }
  if (pointBinding?.type === "latLngColumns") {
    return [pointBinding.latitude, pointBinding.longitude].filter(isDefined);
  }
  return [];
}

function _getColumnNameById(
  layer: MapLayer.T,
  columnId: QueryColumn.Id,
): string | undefined {
  const column = layer.source.queryColumns.find(propEq("id", columnId));
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}

/**
 * Column names a viewer of a map must never see: the bound location columns,
 * which hold the exact position, and a places layer's internal `place_id`.
 * A published snapshot and a live read-only popup both use this, so the two
 * cannot disagree about what is private.
 *
 * @param layer The layer as its query ran.
 * @param placesDatasetIds The workspace's places datasets.
 * @returns The forbidden column names.
 */
export function getForbiddenMapPropertyNames(
  layer: MapLayer.T,
  placesDatasetIds: ReadonlySet<Dataset.Id>,
): ReadonlySet<string> {
  const locationNames = _getBoundLocationColumnIds(layer)
    .map((columnId) => {
      return _getColumnNameById(layer, columnId);
    })
    .filter(isDefined);
  const isPlacesLayer =
    getPlacesLayerDatasetId(layer, placesDatasetIds) !== undefined;
  return new Set(
    isPlacesLayer ? [...locationNames, PLACE_ID_COLUMN_NAME] : locationNames,
  );
}
