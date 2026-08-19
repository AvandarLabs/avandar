import { match } from "ts-pattern";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type {
    MapLayerSpec,
    MapSpec,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

type AnnotationVisibility = {
  layout?: { visibility: "none" };
};

function _copyPosition(position: readonly [number, number]): [number, number] {
  return [position[0], position[1]];
}

function _makeAnnotationGeometry(
  feature: AvaMapConfig.AnnotationFeature,
): GeoJSON.Geometry {
  return match(feature)
    .with({ kind: "text" }, (textFeature) => {
      return {
        type: "Point" as const,
        coordinates: _copyPosition(textFeature.geometry.coordinates),
      };
    })
    .with({ kind: "area" }, (areaFeature) => {
      return {
        type: "Polygon" as const,
        coordinates: areaFeature.geometry.coordinates.map((ring) => {
          return ring.map(_copyPosition);
        }),
      };
    })
    .with({ kind: "arrow" }, { kind: "freehand" }, (lineFeature) => {
      return {
        type: "LineString" as const,
        coordinates: lineFeature.geometry.coordinates.map(_copyPosition),
      };
    })
    .exhaustive();
}

function _makeAnnotationProperties(
  feature: AvaMapConfig.AnnotationFeature,
): GeoJSON.GeoJsonProperties {
  return match(feature)
    .with({ kind: "text" }, (textFeature) => {
      return {
        id: textFeature.id,
        kind: textFeature.kind,
        text: textFeature.text,
        sizePx: textFeature.sizePx,
        color: textFeature.color,
      };
    })
    .with({ kind: "area" }, (areaFeature) => {
      return {
        id: areaFeature.id,
        kind: areaFeature.kind,
        color: areaFeature.color,
        opacity: areaFeature.opacity,
        strokeColor: areaFeature.stroke.color,
        strokeWidthPx: areaFeature.stroke.widthPx,
      };
    })
    .with({ kind: "arrow" }, { kind: "freehand" }, (lineFeature) => {
      return {
        id: lineFeature.id,
        kind: lineFeature.kind,
        color: lineFeature.color,
        strokeWidthPx: lineFeature.strokeWidthPx,
      };
    })
    .exhaustive();
}

function _makeAnnotationGeoJsonFeature(
  feature: AvaMapConfig.AnnotationFeature,
): GeoJSON.Feature {
  return {
    type: "Feature",
    id: feature.id,
    geometry: _makeAnnotationGeometry(feature),
    properties: _makeAnnotationProperties(feature),
  };
}

function _visibilityLayout(isVisible: boolean): AnnotationVisibility {
  return isVisible ? {} : { layout: { visibility: "none" } };
}

function _buildFillLayerSpec(isVisible: boolean): MapLayerSpec {
  return {
    id: MapLayerIds.annotationFillLayer,
    type: "fill",
    source: MapLayerIds.annotationSource,
    filter: ["==", ["get", "kind"], "area"],
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": ["get", "opacity"],
    },
    ..._visibilityLayout(isVisible),
  };
}

function _buildLineLayerSpec(isVisible: boolean): MapLayerSpec {
  return {
    id: MapLayerIds.annotationLineLayer,
    type: "line",
    source: MapLayerIds.annotationSource,
    filter: ["in", ["get", "kind"], ["literal", ["arrow", "freehand", "area"]]],
    paint: {
      "line-color": ["coalesce", ["get", "strokeColor"], ["get", "color"]],
      "line-width": ["get", "strokeWidthPx"],
    },
    ..._visibilityLayout(isVisible),
  };
}

function _buildSymbolLayerSpec(isVisible: boolean): MapLayerSpec {
  return {
    id: MapLayerIds.annotationSymbolLayer,
    type: "symbol",
    source: MapLayerIds.annotationSource,
    filter: ["==", ["get", "kind"], "text"],
    paint: {
      "text-color": ["get", "color"],
    },
    layout: {
      "text-field": ["get", "text"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["get", "sizePx"],
      ...(isVisible ? {} : { visibility: "none" as const }),
    },
  };
}

/**
 * Turns persisted annotations into one GeoJSON source and paint layers.
 *
 * Always returns a spec, including when there are no features or the overlay
 * is hidden, so z-order among data layers stays stable.
 *
 * @param options.annotations Visibility and features for the overlay.
 * @returns A MapSpec with fill, line, and symbol layers.
 */
export function makeMapSpecFromAnnotations(options: {
  annotations: AvaMapConfig.AnnotationLayer;
  hiddenAnnotationFeatureIds?: readonly AvaMapConfig.AnnotationFeatureId[];
}): MapSpec {
  const { annotations, hiddenAnnotationFeatureIds = [] } = options;
  const hiddenIds = new Set(hiddenAnnotationFeatureIds);
  const visibleFeatures = annotations.features.filter((feature) => {
    return !hiddenIds.has(feature.id);
  });
  return {
    sources: {
      [MapLayerIds.annotationSource]: {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: visibleFeatures.map(_makeAnnotationGeoJsonFeature),
        },
      },
    },
    layers: [
      _buildFillLayerSpec(annotations.isVisible),
      _buildLineLayerSpec(annotations.isVisible),
      _buildSymbolLayerSpec(annotations.isVisible),
    ],
  };
}
