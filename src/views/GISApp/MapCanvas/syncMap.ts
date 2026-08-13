import type {
  MapLayerSpec,
  MapSpec,
} from "@/views/GISApp/layers/createMapSpec/MapSpec.types";
import type {
  AddLayerObject,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";

/** Finds the spec for a layer id within a `MapSpec`, if it is present. */
function _findLayerSpec(
  spec: MapSpec,
  layerId: string,
): MapLayerSpec | undefined {
  return spec.layers.find((layer) => {
    return layer.id === layerId;
  });
}

/** Applies only the paint properties whose values differ. */
function _syncPaint(
  map: MapLibreMap,
  layerSpec: MapLayerSpec,
  previousLayerSpec: MapLayerSpec | undefined,
): void {
  Object.entries(layerSpec.paint).forEach(([property, value]) => {
    const previousValue = previousLayerSpec?.paint[property];
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
  Object.entries(nextLayout).forEach(([property, value]) => {
    if (JSON.stringify(previousLayout[property]) === JSON.stringify(value)) {
      return;
    }
    map.setLayoutProperty(layerSpec.id, property, value);
  });
}

/**
 * Brings a MapLibre map in line with `nextSpec`, doing the minimum work.
 *
 * This is the only function in the GIS app that calls MapLibre imperatively.
 * It deliberately registers no event listeners: interaction handlers are
 * attached once by the canvas, so repeated syncs cannot accumulate them.
 *
 * @param params.previousSpec What was last applied, used to diff. Pass an
 * empty spec after a style reload, when the map has dropped everything.
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
  const nextLayerIds = new Set(
    nextSpec.layers.map((layer) => {
      return layer.id;
    }),
  );

  // Layers first, then their sources: MapLibre refuses to remove a source
  // that a layer still references.
  previousSpec.layers.forEach((layerSpec) => {
    if (!nextLayerIds.has(layerSpec.id) && map.getLayer(layerSpec.id)) {
      map.removeLayer(layerSpec.id);
    }
  });
  Object.keys(previousSpec.sources).forEach((sourceId) => {
    if (!(sourceId in nextSpec.sources) && map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  });

  Object.entries(nextSpec.sources).forEach(([sourceId, sourceSpec]) => {
    const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existingSource) {
      if (previousSpec.sources[sourceId]?.data !== sourceSpec.data) {
        existingSource.setData(sourceSpec.data);
      }
      return;
    }
    map.addSource(sourceId, { type: "geojson", data: sourceSpec.data });
  });

  const isReordered =
    previousSpec.layers.length === nextSpec.layers.length &&
    nextSpec.layers.some((layerSpec, index) => {
      return previousSpec.layers[index]?.id !== layerSpec.id;
    });

  nextSpec.layers.forEach((layerSpec) => {
    const previousLayerSpec = _findLayerSpec(previousSpec, layerSpec.id);
    if (!map.getLayer(layerSpec.id)) {
      map.addLayer(layerSpec as unknown as AddLayerObject);
      return;
    }
    _syncPaint(map, layerSpec, previousLayerSpec);
    _syncLayout(map, layerSpec, previousLayerSpec);
    if (isReordered) {
      // Moving each layer to the top in order leaves them in the requested
      // bottom-to-top sequence.
      map.moveLayer(layerSpec.id);
    }
  });
}
