import { uuid } from "$/lib/uuid.ts";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* Test JSON fixtures: return types are inferred from `as const` payloads. */

export const waveCLayer = MapLayer.makeEmpty("Cases");
export const textAnnotation: AvaMapConfig.AnnotationFeature = {
  id: uuid<AvaMapConfig.AnnotationFeatureId>(),
  kind: "text",
  geometry: { type: "Point", coordinates: [29.2, -1.7] },
  text: "Goma",
  sizePx: 14,
  color: "#3b82f6",
};
export const unitSquare: AvaMapConfig.AoiPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

export function createVersion1Json() {
  return {
    __type: "AvaMapConfig",
    version: 1,
    basemap: { type: "builtIn", style: "avandar" },
    view: { center: [-119.4, 36.8], zoom: 6 },
    bookmarks: [],
    layers: [],
  } as const;
}

export function createVersion2Json() {
  return {
    ...createVersion1Json(),
    version: 2,
  } as const;
}

export function omitOverlayFields(layer: MapLayer.T) {
  const {
    timeColumn: _timeColumn,
    applyAoiFilter: _applyAoiFilter,
    ...legacyLayer
  } = layer;
  return legacyLayer;
}

export function createVersion3Json() {
  return {
    __type: "AvaMapConfig",
    version: 3,
    basemap: { type: "builtIn", style: "avandar" },
    view: AvaMapConfig.defaultViewState,
    bookmarks: [],
    layers: [omitOverlayFields(waveCLayer)],
  };
}

export function createEmptyVersion4Json() {
  const config = AvaMapConfig.makeEmpty();
  return {
    __type: config.__type,
    version: config.version,
    basemap: config.basemap,
    view: config.view,
    bookmarks: config.bookmarks,
    layers: config.layers,
    annotations: config.annotations,
    annotationsZIndex: config.annotationsZIndex,
  };
}

export function createVersion4ReversedTimeJson() {
  return {
    ...createEmptyVersion4Json(),
    timeRange: {
      start: "2026-08-02T00:00:00.000Z",
      end: "2026-08-01T00:00:00.000Z",
    },
  };
}

export function createVersion4CyclicBufferJson() {
  const layer = MapLayer.createArea("Buffer of itself");
  return {
    ...createEmptyVersion4Json(),
    layers: [
      {
        ...layer,
        geoBinding: {
          type: "bufferOfLayer",
          layerId: layer.id,
          distanceMeters: 1000,
          dissolve: false,
        },
      },
    ],
  };
}

export function createMissingBufferSourceJson() {
  const buffer = MapLayer.createArea("Buffer of missing layer");
  return {
    ...createEmptyVersion4Json(),
    layers: [
      {
        ...buffer,
        geoBinding: {
          type: "bufferOfLayer",
          layerId: uuid<MapLayer.Id>(),
          distanceMeters: 1000,
          dissolve: false,
        },
      },
    ],
  };
}

export function createVersion4TwoLayerBufferCycleJson() {
  const layerA = MapLayer.createArea("Buffer of B");
  const layerB = MapLayer.createArea("Buffer of A");
  return {
    ...createEmptyVersion4Json(),
    layers: [
      {
        ...layerA,
        geoBinding: {
          type: "bufferOfLayer",
          layerId: layerB.id,
          distanceMeters: 1000,
          dissolve: false,
        },
      },
      {
        ...layerB,
        geoBinding: {
          type: "bufferOfLayer",
          layerId: layerA.id,
          distanceMeters: 1000,
          dissolve: false,
        },
      },
    ],
  };
}

export function createValidBufferJson() {
  const source = {
    ...MapLayer.createArea("Cases"),
    geoBinding: {
      type: "geometryColumn" as const,
      column: uuid<QueryColumn.Id>(),
      encoding: "geojson" as const,
      family: "polygon" as const,
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
  const buffer = {
    ...MapLayer.createArea("Buffer of Cases"),
    geoBinding: {
      type: "bufferOfLayer" as const,
      layerId: source.id,
      distanceMeters: 1000,
      dissolve: false,
    },
  };
  return {
    ...createEmptyVersion4Json(),
    layers: [source, buffer],
  };
}

export function createMismatchedBufferJson() {
  const source = {
    ...MapLayer.createArea("Cases"),
    geoBinding: {
      type: "geometryColumn" as const,
      column: uuid<QueryColumn.Id>(),
      encoding: "geojson" as const,
      family: "polygon" as const,
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
  const buffer = MapLayer.withSensitivity(
    {
      ...MapLayer.createArea("Buffer of Cases"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: source.id,
        distanceMeters: 1000,
        dissolve: false,
      },
    },
    { mode: "aggregateOnly", minCellCount: 5, minGeoLevel: "district" },
  );
  return {
    ...createEmptyVersion4Json(),
    layers: [source, buffer],
  };
}
