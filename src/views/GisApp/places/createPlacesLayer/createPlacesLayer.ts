import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/**
 * A point layer showing a places dataset: bound by `latitude` and
 * `longitude`, every column in its popup, and `starts_at` driving the map's
 * time slider. The place tool adds it when a places dataset is created or
 * chosen for a map.
 */
export function createPlacesLayer(
  options: Readonly<{
    dataset: Dataset.T;
    datasetColumns: readonly DatasetColumn.T[];
  }>,
): MapLayer.T {
  const columns = options.datasetColumns
    .filter((column) => {
      return column.datasetId === options.dataset.id;
    })
    .sort((left, right) => {
      return left.columnIdx - right.columnIdx;
    })
    .map(QueryColumn.makeFromDatasetColumn);
  const findColumn = (name: string): QueryColumn.T | undefined => {
    return columns.find((column) => {
      return QueryColumn.getDerivedColumnName(column) === name;
    });
  };
  const latitude = findColumn("latitude");
  const longitude = findColumn("longitude");
  if (!latitude || !longitude) {
    throw new Error(
      `Dataset '${options.dataset.id}' has no latitude and longitude columns.`,
    );
  }
  const empty = MapLayer.fromDataSource({
    dataSource: options.dataset,
    name: options.dataset.name,
  });
  const withLatitude = MapLayerUpdates.withGeoBindingAxis({
    layer: empty,
    axis: "latitude",
    column: latitude,
  });
  const withBoth = MapLayerUpdates.withGeoBindingAxis({
    layer: withLatitude,
    axis: "longitude",
    column: longitude,
  });
  const withPopup = MapLayerUpdates.withPopupColumns({
    layer: withBoth,
    columns,
  });
  const startsAt = findColumn("starts_at");
  return startsAt
    ? MapLayerUpdates.withTimeColumn({ layer: withPopup, column: startsAt })
    : withPopup;
}
