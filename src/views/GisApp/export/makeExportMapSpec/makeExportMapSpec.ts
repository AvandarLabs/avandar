import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type {
  MapLayerSpec,
  MapSourceSpec,
  MapSpec,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

import { prop } from "@avandar/utils";

import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { MapChromeOverlayIds } from "@/views/GisApp/MapCanvas/useMapChromeOverlays";

/** Chrome source and layer ids: every layer id below begins with one. */
const CHROME_ID_PREFIXES: readonly string[] =
  Object.values(MapChromeOverlayIds);

/** The three MapLibre layer ids the persisted annotation overlay uses. */
const ANNOTATION_LAYER_IDS: readonly string[] = [
  MapLayerIds.annotationFillLayer,
  MapLayerIds.annotationLineLayer,
  MapLayerIds.annotationSymbolLayer,
];

/** Whether a layer id names AOI, measure, or annotation-preview chrome. */
function _isChromeLayerId(id: string): boolean {
  return CHROME_ID_PREFIXES.some((prefix) => {
    return id.startsWith(prefix);
  });
}

/** Whether any node in an expression tree is a `["feature-state", ...]`. */
function _containsFeatureState(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value[0] === "feature-state" || value.some(_containsFeatureState);
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(_containsFeatureState);
  }
  return false;
}

/**
 * Resolves a paint expression to what the reader should see: any
 * `["case", ...]` that reads a `feature-state` anywhere in its conditions
 * collapses to its own fallback (its last element), recursively, so a
 * `case` nested inside another `case`'s fallback is also resolved.
 */
function _collapseFeatureStateToFallback(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value[0] === "case" && _containsFeatureState(value)) {
      return _collapseFeatureStateToFallback(value.at(-1));
    }
    return value.map(_collapseFeatureStateToFallback);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        return [key, _collapseFeatureStateToFallback(entry)];
      }),
    );
  }
  return value;
}

/** Rewrites every paint value on a layer to drop `feature-state` reads. */
function _stripFeatureState(layer: MapLayerSpec): MapLayerSpec {
  const paint = Object.fromEntries(
    Object.entries(layer.paint).map(([key, value]) => {
      return [key, _collapseFeatureStateToFallback(value)];
    }),
  ) as MapLayerSpec["paint"];
  return { ...layer, paint };
}

/** Whether a layer belongs in the export, before feature-state is resolved. */
function _keepLayer(layer: MapLayerSpec, annotationsVisible: boolean): boolean {
  if (_isChromeLayerId(layer.id)) {
    return false;
  }
  if (layer.layout?.visibility === "none") {
    return false;
  }
  if (!annotationsVisible && ANNOTATION_LAYER_IDS.includes(layer.id)) {
    return false;
  }
  return true;
}

/** Drops every source no remaining layer references. */
function _pruneSources(
  sources: Record<string, MapSourceSpec>,
  layers: readonly MapLayerSpec[],
): Record<string, MapSourceSpec> {
  const referencedSourceIds = new Set(layers.map(prop("source")));
  return Object.fromEntries(
    Object.entries(sources).filter(([sourceId]) => {
      return referencedSourceIds.has(sourceId);
    }),
  );
}

/**
 * Strips authoring chrome from the on-screen spec.
 *
 * The export is a second MapLibre instance rather than a screenshot of the
 * live canvas, so this is the only place the difference between "what the
 * author is working in" and "what the reader receives" is decided. Anything
 * left in here prints.
 *
 * It never adds a layer, only removes and rewrites paint, so the
 * aggregate-only invariant (no `circle`, `symbol`, `cluster`, or `heatmap`
 * layer) holds by construction: a spec that contained none of those cannot
 * gain one here.
 *
 * @param options.spec The spec currently applied to the on-screen map.
 * @param options.annotations The map's annotation overlay, which prints only
 * when visible.
 * @returns A spec with no AOI outline, measure overlay, hidden layer, or
 * hover and selection feature-state, and no orphaned source.
 */
export function makeExportMapSpec(
  options: Readonly<{
    spec: MapSpec;
    annotations: AvaMapConfig.AnnotationLayer;
  }>,
): MapSpec {
  const keptLayers = options.spec.layers
    .filter((layer) => {
      return _keepLayer(layer, options.annotations.isVisible);
    })
    .map(_stripFeatureState);

  return {
    sources: _pruneSources(options.spec.sources, keptLayers),
    layers: keptLayers,
  };
}
