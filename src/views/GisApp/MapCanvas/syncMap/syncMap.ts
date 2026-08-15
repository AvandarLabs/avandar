import {
  isDefined,
  objectEntries,
  objectKeys,
  prop,
  propEq,
} from "@avandar/utils";
import type {
  MapLayerSpec,
  MapSpec,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

/** Finds the spec for a layer id within a `MapSpec`, if it is present. */
function _findLayerSpec(
  spec: MapSpec,
  layerId: string,
): MapLayerSpec | undefined {
  return spec.layers.find(propEq("id", layerId));
}

/** Applies only the paint properties whose values differ. */
function _syncPaint(
  map: MapLibreMap,
  layerSpec: MapLayerSpec,
  previousLayerSpec: MapLayerSpec | undefined,
): void {
  objectEntries(layerSpec.paint)
    .filter(isDefined)
    .forEach(([property, value]) => {
      const previousValue =
        previousLayerSpec?.paint[property as keyof MapLayerSpec["paint"]];
      if (JSON.stringify(previousValue) === JSON.stringify(value)) {
        return;
      }
      map.setPaintProperty(layerSpec.id, property, value);
    });
}

/** Applies only the layout properties whose values differ. */
function _syncLayout(
  map: MapLibreMap,
  layerSpec: MapLayerSpec,
  previousLayerSpec: MapLayerSpec | undefined,
): void {
  const nextLayout = layerSpec.layout ?? { visibility: "visible" };
  const previousLayout = previousLayerSpec?.layout ?? {
    visibility: "visible",
  };
  objectEntries(nextLayout)
    .filter(isDefined)
    .forEach(([property, value]) => {
      const previousValue =
        previousLayout[property as keyof typeof previousLayout];
      if (JSON.stringify(previousValue) === JSON.stringify(value)) {
        return;
      }
      map.setLayoutProperty(layerSpec.id, property, value);
    });
}

/**
 * Removes layers and sources that `nextSpec` no longer references.
 *
 * Layers are removed before their sources, because MapLibre refuses to
 * remove a source that a layer still references.
 */
function _removeStaleLayersAndSources(
  map: MapLibreMap,
  previousSpec: MapSpec,
  nextSpec: MapSpec,
  nextLayerIds: ReadonlySet<string>,
): void {
  previousSpec.layers.forEach((layerSpec) => {
    if (!nextLayerIds.has(layerSpec.id) && map.getLayer(layerSpec.id)) {
      map.removeLayer(layerSpec.id);
    }
  });
  objectKeys(previousSpec.sources).forEach((sourceId) => {
    if (!(sourceId in nextSpec.sources) && map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  });
}

/**
 * Adds sources `nextSpec` introduces and refreshes the data of ones that
 * already exist.
 *
 * A source's `data` is only pushed to the map with `setData` when it is a
 * different object than what was last applied. This is sound because every
 * function upstream of `syncMap` is pure and produces a fresh
 * `FeatureCollection` on every call, so a changed reference always means
 * changed data. Mutating a `FeatureCollection` in place instead of replacing
 * it would defeat this check and leave the map showing stale data.
 */
function _syncSources(
  map: MapLibreMap,
  previousSpec: MapSpec,
  nextSpec: MapSpec,
): void {
  objectEntries(nextSpec.sources).forEach(([sourceId, sourceSpec]) => {
    const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existingSource) {
      if (previousSpec.sources[sourceId]?.data !== sourceSpec.data) {
        existingSource.setData(sourceSpec.data);
      }
      return;
    }
    map.addSource(sourceId, { type: "geojson", data: sourceSpec.data });
  });
}

/**
 * Determines whether an explicit `moveLayer` pass is required to reach
 * `nextSpec`'s draw order.
 *
 * MapLibre's `addLayer` always appends to the top, so the order the map ends
 * up in after adding every new layer is the surviving layers from
 * `previousSpec` (filtered to ids `nextSpec` keeps, in their previous order)
 * followed by the newly introduced ids, in the order they appear in
 * `nextSpec.layers`. A `moveLayer` pass is only needed when that effective
 * order does not already match the requested order.
 */
function _needsReorder(
  previousSpec: MapSpec,
  nextSpec: MapSpec,
  nextLayerIds: ReadonlySet<string>,
): boolean {
  const previousLayerIds = new Set(previousSpec.layers.map(prop("id")));
  // Plain predicate rather than `propPasses`: `Set.has` is not a type guard,
  // and `propPasses` only exposes its type-guard overload, so it rejects a
  // predicate that merely returns boolean.
  const survivingIds = previousSpec.layers
    .filter((layerSpec) => {
      return nextLayerIds.has(layerSpec.id);
    })
    .map(prop("id"));
  const newIds = nextSpec.layers.map(prop("id")).filter((layerId) => {
    return !previousLayerIds.has(layerId);
  });
  const effectiveOrder = [...survivingIds, ...newIds];
  const targetOrder = nextSpec.layers.map(prop("id"));
  return effectiveOrder.some((layerId, layerIndex) => {
    return layerId !== targetOrder[layerIndex];
  });
}

/**
 * Adds layers `nextSpec` introduces, repaints ones that already exist, and
 * restores the requested draw order when it would not otherwise fall out of
 * the add pass.
 */
function _applyLayers(
  map: MapLibreMap,
  previousSpec: MapSpec,
  nextSpec: MapSpec,
  nextLayerIds: ReadonlySet<string>,
): void {
  const needsReorder = _needsReorder(previousSpec, nextSpec, nextLayerIds);

  nextSpec.layers.forEach((layerSpec) => {
    const previousLayerSpec = _findLayerSpec(previousSpec, layerSpec.id);
    if (!map.getLayer(layerSpec.id)) {
      map.addLayer(layerSpec);
    } else {
      _syncPaint(map, layerSpec, previousLayerSpec);
      _syncLayout(map, layerSpec, previousLayerSpec);
    }
    if (needsReorder) {
      // Moving each layer to the top in requested order leaves them in the
      // correct bottom-to-top stack, whether it was just added or already
      // existed.
      map.moveLayer(layerSpec.id);
    }
  });
}

/**
 * Brings a MapLibre map in line with `nextSpec`, doing the minimum work.
 *
 * This is the only function in the GIS app that calls MapLibre imperatively.
 * It deliberately registers no event listeners: interaction handlers are
 * attached once by the canvas, so repeated syncs cannot accumulate them.
 *
 * @param params The map to update and the specs to diff.
 * @param params.map The live MapLibre map to mutate.
 * @param params.previousSpec What was last applied, used to diff. Pass an
 * empty spec after a style reload, when the map has dropped everything.
 * @param params.nextSpec The desired state: sources and layers, ordered
 * bottom to top.
 * @returns void
 */
export function syncMap({
  map,
  previousSpec,
  nextSpec,
}: {
  map: MapLibreMap;
  previousSpec: MapSpec;
  nextSpec: MapSpec;
}): void {
  const nextLayerIds = new Set(nextSpec.layers.map(prop("id")));

  _removeStaleLayersAndSources(map, previousSpec, nextSpec, nextLayerIds);
  _syncSources(map, previousSpec, nextSpec);
  _applyLayers(map, previousSpec, nextSpec, nextLayerIds);
}
