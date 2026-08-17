import { isNumber, propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { classifyLayerValues } from "@/views/GisApp/layers/classifyLayerValues/classifyLayerValues";
import { normalizeLayerValue } from "@/views/GisApp/layers/classifyLayerValues/normalizeLayerValue/normalizeLayerValue";
import { makeSizeLegendStops } from "@/views/GisApp/layers/makeSizeLegendStops/makeSizeLegendStops";
import { PersistedLayerLegends } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import { getPaintValueColumnName } from "@/views/GisApp/layers/useAvaMapRender/getPaintValueColumnName";
import type { LayerGeometry } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import type { LayerLegendUpdate } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";

type ClassifiedGeometry = {
  geometry: LayerGeometry;
  legendUpdate: LayerLegendUpdate | undefined;
};

type LegendClassification = {
  breaks: readonly MapLayer.LegendBreak[];
  classIndexByFeatureId: ReadonlyMap<string, number>;
  entries: readonly MapLayer.LegendEntry[];
};

const SIZE_LABEL_FORMATTER = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

/** Resolves a persisted value reference to its GeoJSON property name. */
function _getColorValuePropertyName(options: {
  layer: MapLayer.T;
  value: MapLayer.LayerValue;
}): string | undefined {
  const { layer, value } = options;
  if (value.type === "areaAggregation") {
    return MapLayerSpatialFeatureProperties.value;
  }
  const column = layer.source.queryColumns.find(propEq("id", value.column));
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}

/** Reads and optionally normalizes one feature value. */
function _getFeatureColorValue(options: {
  layer: MapLayer.T;
  properties: GeoJSON.GeoJsonProperties;
}): unknown {
  const { layer, properties } = options;
  if (layer.symbology.type === "heatmap") {
    return undefined;
  }
  const color = layer.symbology.color;
  if (color.type === "single" || !properties) {
    return undefined;
  }
  const propertyName = _getColorValuePropertyName({
    layer,
    value: color.value,
  });
  const value = propertyName ? properties[propertyName] : undefined;
  if (color.type !== "graduated" || !color.normalization) {
    return value;
  }
  const denominator = properties[MapLayerSpatialFeatureProperties.denominator];
  return normalizeLayerValue(
    value,
    denominator,
    color.normalization.multiplier,
  );
}

function _getFeatureId(options: {
  feature: GeoJSON.Feature;
  index: number;
}): string {
  const reservedId =
    options.feature.properties?.[MapLayerSpatialFeatureProperties.featureId];
  return String(reservedId ?? options.feature.id ?? options.index);
}

/** Classifies configured categories in author order, followed by Other. */
function _classifyCategories(options: {
  layer: MapLayer.T;
  features: readonly GeoJSON.Feature[];
  color: Extract<MapLayer.Color, { type: "categorical" }>;
}): LegendClassification {
  const { layer, features, color } = options;
  const classIndexes = new Map<string, number>();
  const counts = Array.from({ length: color.categories.length + 1 }, () => {
    return 0;
  });
  let noDataCount = 0;
  features.forEach((feature, index) => {
    const value = _getFeatureColorValue({
      layer,
      properties: feature.properties,
    });
    if (value === null || value === undefined) {
      noDataCount += 1;
      return;
    }
    const categoryIndex = color.categories.findIndex(({ value: category }) => {
      return category === String(value);
    });
    const classIndex =
      categoryIndex === -1 ? color.categories.length : categoryIndex;
    classIndexes.set(_getFeatureId({ feature, index }), classIndex);
    counts[classIndex] = (counts[classIndex] ?? 0) + 1;
  });
  const entries: MapLayer.LegendEntry[] = color.categories.map(
    (category, index) => {
      return { type: "value", ...category, count: counts[index] ?? 0 };
    },
  );
  entries.push({
    type: "value",
    color: color.other.color,
    label: color.other.label,
    count: counts.at(-1) ?? 0,
  });
  if (noDataCount > 0) {
    entries.push({ type: "noData", ...color.noData, count: noDataCount });
  }
  return { breaks: [], classIndexByFeatureId: classIndexes, entries };
}

function _makeClassifiedFeatures(options: {
  features: readonly GeoJSON.Feature[];
  classIndexes: ReadonlyMap<string, number>;
}): GeoJSON.Feature[] {
  return options.features.map((feature, index) => {
    const featureId = _getFeatureId({ feature, index });
    const classIndex = options.classIndexes.get(featureId);
    if (classIndex === undefined) {
      return feature;
    }
    return {
      ...feature,
      properties: {
        ...feature.properties,
        [MapLayerSpatialFeatureProperties.classIndex]: classIndex,
      },
    };
  });
}

function _makeSizeStops(options: {
  layer: MapLayer.T;
  features: readonly GeoJSON.Feature[];
}): MapLayer.SizeLegendStop[] {
  const { layer, features } = options;
  if (layer.symbology.type !== "proportionalSymbol") {
    return [];
  }
  const valueColumnName = getPaintValueColumnName(layer);
  const values = features
    .map((feature) => {
      return valueColumnName ?
          feature.properties?.[valueColumnName]
        : undefined;
    })
    .filter(isNumber);
  return makeSizeLegendStops({
    values,
    minRadius: layer.symbology.minRadius,
    maxRadius: layer.symbology.maxRadius,
    scale: layer.symbology.scale,
    formatLabel: (value) => {
      return SIZE_LABEL_FORMATTER.format(value);
    },
  });
}

function _classifyLegend(options: {
  layer: MapLayer.T;
  features: readonly GeoJSON.Feature[];
}): LegendClassification {
  const { layer, features } = options;
  if (layer.symbology.type === "heatmap") {
    return { breaks: [], classIndexByFeatureId: new Map(), entries: [] };
  }
  const color = layer.symbology.color;
  if (color.type === "single") {
    return { breaks: [], classIndexByFeatureId: new Map(), entries: [] };
  }
  return color.type === "categorical" ?
      _classifyCategories({ layer, features, color })
    : classifyLayerValues(
        features.map((feature, index) => {
          return {
            featureId: _getFeatureId({ feature, index }),
            value: _getFeatureColorValue({
              layer,
              properties: feature.properties,
            }),
          };
        }),
        {
          classification: color.classification,
          ramp: color.ramp,
          noData: color.noData,
        },
      );
}

function _getReportableFeatures(
  features: readonly GeoJSON.Feature[],
): GeoJSON.Feature[] {
  return features.filter((feature) => {
    return (
      feature.properties?.[MapLayerSpatialFeatureProperties.state] !==
      "suppressed"
    );
  });
}

function _withSuppressedLegendEntry(options: {
  entries: readonly MapLayer.LegendEntry[];
  suppressedCount: number;
}): MapLayer.LegendEntry[] {
  const nextEntries = [...options.entries];
  if (options.suppressedCount > 0) {
    nextEntries.push({
      type: "suppressed",
      color: "#868e96",
      label: "",
      count: options.suppressedCount,
    });
  }
  return nextEntries;
}

/** Adds derived class indexes and the exact legend produced from them. */
export function classifyLayerGeometry(options: {
  layer: MapLayer.T;
  geometry: LayerGeometry;
  hasQueryData: boolean;
}): ClassifiedGeometry {
  const { layer, geometry, hasQueryData } = options;
  if (!hasQueryData) {
    return { geometry, legendUpdate: undefined };
  }
  const reportableFeatures = _getReportableFeatures(
    geometry.featureCollection.features,
  );
  const classification = _classifyLegend({
    layer,
    features: reportableFeatures,
  });
  const suppressedCount =
    geometry.featureCollection.features.length - reportableFeatures.length;
  return {
    geometry: {
      ...geometry,
      featureCollection: {
        ...geometry.featureCollection,
        features: _makeClassifiedFeatures({
          features: geometry.featureCollection.features,
          classIndexes: classification.classIndexByFeatureId,
        }),
      },
    },
    legendUpdate: {
      layerFingerprint:
        PersistedLayerLegends.makeFingerprintFromMapLayer(layer),
      breaks: classification.breaks,
      entries: _withSuppressedLegendEntry({
        entries: classification.entries,
        suppressedCount,
      }),
      sizeStops: _makeSizeStops({ layer, features: reportableFeatures }),
    },
  };
}
