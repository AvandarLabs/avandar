import { isDefined, makeSet } from "@avandar/utils";
import { match } from "ts-pattern";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _getGeoBindingColumnIds(
  binding: MapLayer.GeoBinding | undefined,
): Array<QueryColumn.Id | undefined> {
  if (!binding) {
    return [];
  }
  return match(binding)
    .with({ type: "latLngColumns" }, ({ latitude, longitude }) => {
      return [latitude, longitude];
    })
    .with({ type: "geometryColumn" }, ({ column }) => {
      return [column];
    })
    .with({ type: "binPointsToGrid" }, ({ points }) => {
      return points.type === "latLngColumns" ?
          [points.latitude, points.longitude]
        : [points.column];
    })
    .with({ type: "joinToBoundaries" }, () => {
      return [];
    })
    .with({ type: "aggregatePointsToBoundaries" }, () => {
      return [];
    })
    .exhaustive();
}

function _getColorColumnIds(
  color: MapLayer.Color | undefined,
): Array<QueryColumn.Id | undefined> {
  if (!color || color.type === "single") {
    return [];
  }
  const valueColumn =
    color.value.type === "queryColumn" ? color.value.column : undefined;
  const denominatorColumn =
    (
      color.type === "graduated" &&
      color.normalization?.denominator.type === "queryColumn"
    ) ?
      color.normalization.denominator.column
    : undefined;
  return [valueColumn, denominatorColumn];
}

/** Column ids the layer needs regardless of what the popup shows. */
export function getRequiredColumnIds(layer: MapLayer.T): Set<QueryColumn.Id> {
  const binding = layer.geoBinding;
  const color =
    layer.symbology.type === "heatmap" ? undefined : layer.symbology.color;
  const areaAggregationMeasureColumnId =
    (
      binding?.type === "joinToBoundaries" ||
      binding?.type === "aggregatePointsToBoundaries" ||
      binding?.type === "binPointsToGrid"
    ) ?
      binding.aggregation.operation === "count" ?
        undefined
      : binding.aggregation.measureColumn
    : undefined;
  return makeSet(
    [
      ..._getGeoBindingColumnIds(binding),
      areaAggregationMeasureColumnId,
      layer.symbology.type === "proportionalSymbol" ?
        layer.symbology.value
      : undefined,
      layer.symbology.type === "heatmap" ? layer.symbology.weight : undefined,
      ..._getColorColumnIds(color),
    ].filter(isDefined),
  );
}
