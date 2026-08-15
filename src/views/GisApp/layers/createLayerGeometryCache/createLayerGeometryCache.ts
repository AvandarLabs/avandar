import { makeFeatureCollectionFromRows } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { GeometryDropReport } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Everything one layer's geometry depends on. */
export type LayerGeometryInputs = {
  layerId: MapLayer.Id;
  binding: MapLayer.GeoBindingColumnNames | undefined;
  sensitivity: MapLayer.Sensitivity;
  propertyColumnNames: readonly string[] | "all";

  /** `undefined` while the layer's query has not resolved. */
  rows: readonly UnknownRow[] | undefined;
};

/** One layer's converted geometry, and why rows were lost. */
export type LayerGeometry = {
  featureCollection: GeoJSON.FeatureCollection;
  drops: GeometryDropReport[];

  /** Conversion error, when the layer cannot produce point geometry. */
  error: Error | undefined;
};

const EMPTY_GEOMETRY: LayerGeometry = {
  featureCollection: { type: "FeatureCollection", features: [] },
  drops: [],
  error: undefined,
};

type CacheEntry = {
  signature: string;
  rows: readonly UnknownRow[] | undefined;
  geometry: LayerGeometry;
};

/** Builds a signature for geometry inputs compared by value. */
function _buildInputSignature(inputs: LayerGeometryInputs): string {
  return JSON.stringify([
    inputs.binding,
    inputs.sensitivity,
    inputs.propertyColumnNames,
  ]);
}

/** Converts one layer's current inputs into renderable geometry. */
function _makeGeometryFromInputs(inputs: LayerGeometryInputs): LayerGeometry {
  if (!inputs.binding || !inputs.rows) {
    return EMPTY_GEOMETRY;
  }
  try {
    return {
      ...makeFeatureCollectionFromRows({
        rows: inputs.rows,
        binding: inputs.binding,
        sensitivity: inputs.sensitivity,
        propertyColumnNames: inputs.propertyColumnNames,
        layerId: inputs.layerId,
      }),
      error: undefined,
    };
  } catch (error: unknown) {
    if (error instanceof SensitivityViolationError) {
      return { ...EMPTY_GEOMETRY, error };
    }
    throw error;
  }
}

/** Returns cached geometry when the layer's current inputs have not changed. */
function _getGeometryFromEntries({
  entries,
  inputs,
}: {
  entries: Map<MapLayer.Id, CacheEntry>;
  inputs: LayerGeometryInputs;
}): LayerGeometry {
  const signature = _buildInputSignature(inputs);
  const cached = entries.get(inputs.layerId);
  if (cached && cached.signature === signature && cached.rows === inputs.rows) {
    return cached.geometry;
  }

  const geometry = _makeGeometryFromInputs(inputs);
  entries.set(inputs.layerId, { signature, rows: inputs.rows, geometry });
  return geometry;
}

/** Removes cache entries for layers absent from the current map. */
function _pruneEntries({
  entries,
  liveLayerIds,
}: Readonly<{
  entries: Map<MapLayer.Id, CacheEntry>;
  liveLayerIds: ReadonlySet<MapLayer.Id>;
}>): void {
  [...entries.keys()].forEach((layerId) => {
    if (!liveLayerIds.has(layerId)) {
      entries.delete(layerId);
    }
  });
}

/** Caches each layer's GeoJSON until its geometry inputs change. */
export function createLayerGeometryCache(): {
  get: (inputs: LayerGeometryInputs) => LayerGeometry;
  prune: (liveLayerIds: ReadonlySet<MapLayer.Id>) => void;
} {
  const entries = new Map<MapLayer.Id, CacheEntry>();

  return {
    get: (inputs) => {
      return _getGeometryFromEntries({ entries, inputs });
    },

    prune: (liveLayerIds) => {
      _pruneEntries({ entries, liveLayerIds });
    },
  };
}
