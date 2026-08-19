import { propEq, propNotEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type {
  AnnotationFeature,
  AnnotationFeatureId,
  AnnotationLayer,
  AoiPolygon,
  AvaMapConfigRead,
  TimeRange,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";

/** Empty annotation overlay: visible, no features. */
export const EMPTY_ANNOTATIONS: AnnotationLayer = {
  isVisible: true,
  features: [],
};

/** Smallest allowed buffer distance, in meters. */
const MIN_BUFFER_DISTANCE_METERS = 100;

/** Largest allowed buffer distance, in meters. */
const MAX_BUFFER_DISTANCE_METERS = 1_000_000;

/** Clamps annotation z-order to `0..=layerCount`. */
function _clampAnnotationsZIndex(
  options: Readonly<{ layerCount: number; annotationsZIndex: number }>,
): number {
  const { layerCount, annotationsZIndex } = options;
  return Math.min(layerCount, Math.max(0, annotationsZIndex));
}

/** Clamps a buffer distance to the allowed meter band. */
function _clampBufferDistanceMeters(distanceMeters: number): number {
  return Math.min(
    MAX_BUFFER_DISTANCE_METERS,
    Math.max(MIN_BUFFER_DISTANCE_METERS, distanceMeters),
  );
}

/** Throws when a defined time range has `end` before `start`. */
function _assertTimeRangeOrder(timeRange: TimeRange | undefined): void {
  if (timeRange !== undefined && timeRange.end < timeRange.start) {
    throw new Error("Time range end must not precede start");
  }
}

/** A new fill layer bound as a buffer of `sourceLayer`. */
function _makeBufferLayer(
  options: Readonly<{
    name: string;
    sourceLayer: MapLayer.T;
    distanceMeters: number;
    dissolve: boolean;
  }>,
): MapLayer.T {
  const { name, sourceLayer, distanceMeters, dissolve } = options;
  const area = MapLayer.createArea(name);
  return MapLayer.withSensitivity(
    {
      ...area,
      geoBinding: {
        type: "bufferOfLayer",
        layerId: sourceLayer.id,
        distanceMeters: _clampBufferDistanceMeters(distanceMeters),
        dissolve,
      },
    },
    sourceLayer.sensitivity,
  );
}

/** Overlay, annotation, and buffer-layer updates for map configuration. */
export const overlayConfigUpdaters = {
  /**
   * Sets or clears the map's area-of-interest polygon.
   * @param aoi The next AOI, or `undefined` to clear it.
   */
  withAoi: (
    options: Readonly<{
      config: AvaMapConfigRead;
      aoi: AoiPolygon | undefined;
    }>,
  ): AvaMapConfigRead => {
    const { config, aoi } = options;
    return { ...config, aoi };
  },

  /**
   * Sets or clears the map clock window.
   * @throws When `end` precedes `start`.
   */
  withTimeRange: (
    options: Readonly<{
      config: AvaMapConfigRead;
      timeRange: TimeRange | undefined;
    }>,
  ): AvaMapConfigRead => {
    const { config, timeRange } = options;
    _assertTimeRangeOrder(timeRange);
    return { ...config, timeRange };
  },

  /**
   * Appends one annotation feature, keeping overlay visibility.
   */
  withAnnotationFeature: (
    options: Readonly<{
      config: AvaMapConfigRead;
      feature: AnnotationFeature;
    }>,
  ): AvaMapConfigRead => {
    const { config, feature } = options;
    return {
      ...config,
      annotations: {
        ...config.annotations,
        features: [...config.annotations.features, feature],
      },
    };
  },

  /**
   * Replaces one annotation with `nextFeatures` at the same index.
   */
  withAnnotationFeaturesReplaced: (
    options: Readonly<{
      config: AvaMapConfigRead;
      featureId: AnnotationFeatureId;
      nextFeatures: readonly AnnotationFeature[];
    }>,
  ): AvaMapConfigRead => {
    const { config, featureId, nextFeatures } = options;
    const featureIndex = config.annotations.features.findIndex(
      propEq("id", featureId),
    );
    if (featureIndex < 0) {
      return config;
    }
    const features = [...config.annotations.features];
    features.splice(featureIndex, 1, ...nextFeatures);
    if (features.length === 0) {
      return { ...config, annotations: EMPTY_ANNOTATIONS };
    }
    return {
      ...config,
      annotations: { ...config.annotations, features },
    };
  },

  /**
   * Removes an annotation by id. The last removal leaves an empty overlay.
   */
  withoutAnnotationFeature: (
    options: Readonly<{
      config: AvaMapConfigRead;
      featureId: AnnotationFeatureId;
    }>,
  ): AvaMapConfigRead => {
    const { config, featureId } = options;
    const nextFeatures = config.annotations.features.filter(
      propNotEq("id", featureId),
    );
    if (nextFeatures.length === 0) {
      return { ...config, annotations: EMPTY_ANNOTATIONS };
    }
    return {
      ...config,
      annotations: { ...config.annotations, features: nextFeatures },
    };
  },

  /**
   * Places the annotation overlay above this many data layers from the bottom.
   */
  withAnnotationsZIndex: (
    options: Readonly<{
      config: AvaMapConfigRead;
      annotationsZIndex: number;
    }>,
  ): AvaMapConfigRead => {
    const { config, annotationsZIndex } = options;
    return {
      ...config,
      annotationsZIndex: _clampAnnotationsZIndex({
        layerCount: config.layers.length,
        annotationsZIndex,
      }),
    };
  },

  /**
   * Inserts a buffer layer immediately above the source, copying sensitivity.
   * @throws When the source is missing or has no geo binding.
   */
  withBufferLayerInserted: (
    options: Readonly<{
      config: AvaMapConfigRead;
      sourceLayerId: MapLayer.Id;
      distanceMeters: number;
      dissolve: boolean;
      name: string;
    }>,
  ): AvaMapConfigRead => {
    const { config, sourceLayerId, distanceMeters, dissolve, name } = options;
    const sourceIndex = config.layers.findIndex(propEq("id", sourceLayerId));
    const sourceLayer = config.layers[sourceIndex];
    if (!sourceLayer?.geoBinding) {
      throw new Error("Cannot insert a buffer of a missing or unbound layer");
    }
    const buffer = _makeBufferLayer({
      name,
      sourceLayer,
      distanceMeters,
      dissolve,
    });
    const nextLayers = [...config.layers];
    nextLayers.splice(sourceIndex + 1, 0, buffer);
    const annotationsZIndex =
      config.annotationsZIndex > sourceIndex ?
        config.annotationsZIndex + 1
      : config.annotationsZIndex;
    return { ...config, layers: nextLayers, annotationsZIndex };
  },
};
