import { isDefined, propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getForbiddenMapPropertyNames } from "@/clients/maps/getForbiddenMapPropertyNames/getForbiddenMapPropertyNames";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { PointAggregateProperties } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { getPaintValueColumnName } from "@/views/GisApp/layers/useAvaMapRender/getPaintValueColumnName";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * The reserved properties the renderer reads to paint and describe a
 * feature. Every other `__avandar_*` key a query attaches (such as a
 * boundary's key or name) is dropped.
 */
const RENDER_PROPERTY_NAMES: readonly string[] = [
  MapLayerSpatialFeatureProperties.classIndex,
  MapLayerSpatialFeatureProperties.contributorCount,
  MapLayerSpatialFeatureProperties.denominator,
  MapLayerSpatialFeatureProperties.disputedStatus,
  MapLayerSpatialFeatureProperties.featureId,
  MapLayerSpatialFeatureProperties.state,
  MapLayerSpatialFeatureProperties.value,
  PointAggregateProperties.pointCount,
  PointAggregateProperties.abbreviated,
];

function _getColumnNameById(
  layer: MapLayer.T,
  columnId: QueryColumn.Id,
): string | undefined {
  const column = layer.source.queryColumns.find(propEq("id", columnId));
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}

/** The column a layer's classified color reads, which the renderer needs. */
function _getColorValueColumnName(layer: MapLayer.T): string | undefined {
  const { symbology } = layer;
  if (
    !("color" in symbology) ||
    symbology.color.type === "single" ||
    symbology.color.value.type !== "queryColumn"
  ) {
    return undefined;
  }
  return _getColumnNameById(layer, symbology.color.value.column);
}

/** The popup's columns, with "all fields" meaning every queried column. */
function _getPopupPropertyNames(layer: MapLayer.T): readonly string[] {
  const propertyNames = MapLayer.toPropertyColumnNames(layer);
  return propertyNames === "all"
    ? layer.source.queryColumns.map(QueryColumn.getDerivedColumnName)
    : propertyNames;
}

/** Every property name a published feature of `layer` may carry. */
function _getAllowedPropertyNames(
  layer: MapLayer.T,
  placesDatasetIds: ReadonlySet<Dataset.Id>,
): ReadonlySet<string> {
  const forbidden = getForbiddenMapPropertyNames(layer, placesDatasetIds);
  const candidates = [
    ..._getPopupPropertyNames(layer),
    getPaintValueColumnName(layer),
    _getColorValueColumnName(layer),
  ].filter(isDefined);
  return new Set([
    ...candidates.filter((name) => {
      return !forbidden.has(name);
    }),
    ...RENDER_PROPERTY_NAMES,
  ]);
}

/**
 * Cuts each feature's properties to what the layer's popup shows, what its
 * paint reads, and the reserved properties the renderer needs. A bound
 * geometry, latitude, or longitude column and a places layer's `place_id`
 * are never kept, even when the popup lists them.
 *
 * @param options.layer The layer as its query ran, so a popup set to all
 * fields covers every column the viewer would see.
 * @param options.featureCollection The features the layer draws.
 * @param options.placesDatasetIds The workspace's places datasets.
 * @returns The features with only allowed properties.
 */
export function cutSnapshotFeatureProperties(
  options: Readonly<{
    layer: MapLayer.T;
    featureCollection: GeoJSON.FeatureCollection;
    placesDatasetIds: ReadonlySet<Dataset.Id>;
  }>,
): GeoJSON.FeatureCollection {
  const allowed = _getAllowedPropertyNames(
    options.layer,
    options.placesDatasetIds,
  );
  return {
    ...options.featureCollection,
    features: options.featureCollection.features.map((feature) => {
      const properties = Object.fromEntries(
        Object.entries(feature.properties ?? {}).filter(([name]) => {
          return allowed.has(name);
        }),
      );
      return { ...feature, properties };
    }),
  };
}
