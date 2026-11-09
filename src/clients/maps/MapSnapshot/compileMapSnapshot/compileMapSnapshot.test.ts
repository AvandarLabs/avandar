import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import {
  createBufferLayer,
  createFeature,
  createGeometryLayer,
  createPointAuditResult,
  createQueryResult,
  createSchoolLayer,
  createSpatialEnvelopeResult,
  createTextQueryColumn,
  getDistanceMeters,
  SCHOOL_POSITION,
  UNIT_CELL,
} from "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot.fixtures";
import { MapSnapshotJson } from "@/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson";
import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import {
  createGridBinLayer,
  createQueryableLayer,
  UNIT_SQUARE,
} from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { compileMapSnapshot } =
  await import("@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot");

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const MAP_SALT = "8f14e45f-ceea-467a-9575-1a1c0c1e7f3b";
const OTHER_MAP_SALT = "0c5d1f2a-7b3e-4c69-9d8a-2f6e4b1a3c57";
const JITTER = { mode: "jitter", radiusMeters: 500 } as const;
const AGGREGATE_ONLY = {
  mode: "aggregateOnly",
  minCellCount: 5,
  minGeoLevel: "admin2",
} as const;

/**
 * Answers every statement the real layer query path sends to DuckDB: a
 * lat/lng layer's coordinate audit and rows, or a spatial layer's envelope.
 */
function _mockDuckDb(
  options: Readonly<{
    rows?: readonly UnknownRow[];
    features?: readonly GeoJSON.Feature[];
  }>,
): void {
  runQueryMock.mockImplementation(async ({ rawSql }: { rawSql: string }) => {
    if (rawSql.includes("source_row_count")) {
      return createPointAuditResult(options.rows?.length ?? 0);
    }
    if (rawSql.includes("__avandar_feature_collection")) {
      return createSpatialEnvelopeResult(options.features ?? []);
    }
    return createQueryResult(options.rows ?? []);
  });
}

/** Every SQL statement the compiler sent to DuckDB. */
function _getSentSql(): string[] {
  return runQueryMock.mock.calls.map(([params]) => {
    return (params as { rawSql: string }).rawSql;
  });
}

async function _compile(
  layers: readonly MapLayer.T[],
  options: Readonly<{
    placesDatasetIds?: ReadonlySet<Dataset.Id>;
    aoi?: AvaMapConfig.AoiPolygon;
    jitterSalt?: string;
  }> = {},
): Promise<MapSnapshot> {
  const mapConfig = layers.reduce(
    (config, layer) => {
      return AvaMapConfig.withLayerAdded({ config, layer });
    },
    { ...AvaMapConfig.makeEmpty(), aoi: options.aoi },
  );
  return await compileMapSnapshot({
    mapId: MAP_ID,
    mapName: "Coverage risk",
    mapConfig,
    queryContext: {
      workspaceId: uuid<Workspace.Id>(),
      zoomBand: 0,
      simplificationReferenceLatitude: 0,
      datasets: [],
      datasetColumns: [],
      jitterSalt: options.jitterSalt ?? MAP_SALT,
    },
    placesDatasetIds: options.placesDatasetIds ?? new Set(),
  });
}

function _getFeatures(
  snapshot: MapSnapshot,
  layerIndex = 0,
): readonly GeoJSON.Feature[] {
  return snapshot.layers[layerIndex]?.featureCollection.features ?? [];
}

function _getFirstPoint(snapshot: MapSnapshot): GeoJSON.Position {
  const geometry = _getFeatures(snapshot)[0]?.geometry;
  if (geometry?.type !== "Point") {
    throw new Error("Expected the first published feature to be a point");
  }
  return geometry.coordinates;
}

function _createGridBinOfPoints(): MapLayer.T {
  const points = createQueryableLayer();
  return MapLayer.withSensitivity(
    createGridBinLayer(points, {
      type: "latLngColumns",
      latitude: points.source.queryColumns[0]!.id,
      longitude: points.source.queryColumns[1]!.id,
    }),
    AGGREGATE_ONLY,
  );
}

const SCHOOL_ROW = {
  lat: SCHOOL_POSITION[1],
  lon: SCHOOL_POSITION[0],
  school_name: "PS 11",
};

describe("compileMapSnapshot sensitivity", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
  });

  it("publishes a displaced lat/lng layer's points inside its radius, never at the source", async () => {
    _mockDuckDb({ rows: [SCHOOL_ROW] });

    const point = _getFirstPoint(await _compile([createSchoolLayer(JITTER)]));

    expect(point).not.toEqual([...SCHOOL_POSITION]);
    expect(getDistanceMeters(SCHOOL_POSITION, point)).toBeLessThanOrEqual(
      JITTER.radiusMeters + 1,
    );
  });

  it("publishes a displaced geometry layer's points inside its radius, never at the source", async () => {
    _mockDuckDb({
      features: [
        createFeature({ type: "Point", coordinates: [...SCHOOL_POSITION] }),
      ],
    });

    const point = _getFirstPoint(
      await _compile([
        createGeometryLayer({ family: "point", sensitivity: JITTER }),
      ]),
    );

    expect(point).not.toEqual([...SCHOOL_POSITION]);
    expect(getDistanceMeters(SCHOOL_POSITION, point)).toBeLessThanOrEqual(
      JITTER.radiusMeters + 1,
    );
  });

  it("refuses to publish a displaced layer that draws polygons", async () => {
    _mockDuckDb({ features: [createFeature(UNIT_CELL)] });

    await expect(
      _compile([
        createGeometryLayer({ family: "polygon", sensitivity: JITTER }),
      ]),
    ).rejects.toBeInstanceOf(SensitivityViolationError);
  });

  it("refuses to publish rings drawn around displaced points", async () => {
    const points = createGeometryLayer({
      family: "point",
      sensitivity: JITTER,
    });
    _mockDuckDb({ features: [createFeature(UNIT_CELL)] });

    await expect(
      _compile([{ ...points, isVisible: false }, createBufferLayer(points)]),
    ).rejects.toBeInstanceOf(SensitivityViolationError);
  });

  it("publishes only areas for an aggregate-only layer", async () => {
    _mockDuckDb({ features: [createFeature(UNIT_CELL, { point_count: 6 })] });

    const snapshot = await _compile([_createGridBinOfPoints()]);

    expect(
      _getFeatures(snapshot).map((feature) => {
        return feature.geometry.type;
      }),
    ).toEqual(["Polygon"]);
  });

  it("refuses to publish a point from an aggregate-only layer", async () => {
    _mockDuckDb({
      features: [
        createFeature(UNIT_CELL),
        createFeature({ type: "Point", coordinates: [...SCHOOL_POSITION] }),
      ],
    });

    await expect(_compile([_createGridBinOfPoints()])).rejects.toThrow();
  });
});

describe("compileMapSnapshot properties", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
  });

  it("keeps only a geometry layer's popup columns and the render properties", async () => {
    const base = createGeometryLayer({
      family: "point",
      sensitivity: { mode: "exact" },
    });
    const geometryColumn = base.source.queryColumns[0]!;
    const nameColumn = createTextQueryColumn("school_name");
    const layer: MapLayer.T = {
      ...base,
      source: {
        ...base.source,
        queryColumns: [...base.source.queryColumns, nameColumn],
      },
      popup: {
        columnIds: [geometryColumn.id, nameColumn.id],
        action: undefined,
      },
    };
    _mockDuckDb({
      features: [
        createFeature(
          { type: "Point", coordinates: [...SCHOOL_POSITION] },
          {
            school_name: "PS 11",
            shape: "POINT (-73.9812 40.7514)",
            home_address: "1 Main St",
            __avandar_boundary_key: "NY-061",
            __avandar_internal_row: 7,
          },
        ),
      ],
    });

    const snapshot = await _compile([layer]);

    expect(_getFeatures(snapshot)[0]!.properties).toEqual({
      school_name: "PS 11",
    });
  });

  it("never publishes a lat/lng layer's coordinate columns, even when its popup lists them", async () => {
    _mockDuckDb({ rows: [SCHOOL_ROW] });

    const snapshot = await _compile([createSchoolLayer({ mode: "exact" })]);

    expect(_getFeatures(snapshot)[0]!.properties).toEqual({
      school_name: "PS 11",
    });
  });

  it("publishes every source column of a popup-all layer, as the viewer queries it", async () => {
    const base = createGeometryLayer({
      family: "point",
      sensitivity: { mode: "exact" },
    });
    const nameColumn = createTextQueryColumn("loc_name");
    const layer: MapLayer.T = {
      ...base,
      source: {
        ...base.source,
        sourceColumns: [base.source.queryColumns[0]!, nameColumn],
      },
      popup: { columnIds: "all", action: undefined },
    };
    _mockDuckDb({
      features: [
        createFeature(
          { type: "Point", coordinates: [...SCHOOL_POSITION] },
          { loc_name: "PS 11", shape: "POINT (0 0)", unlisted: "x" },
        ),
      ],
    });

    const snapshot = await _compile([layer]);

    expect(_getSentSql().join("\n")).toContain("loc_name");
    expect(_getFeatures(snapshot)[0]!.properties).toEqual({
      loc_name: "PS 11",
    });
  });

  it("never publishes a places layer's place_id", async () => {
    const base = createSchoolLayer({ mode: "exact" });
    const placesDatasetId = base.source.dataSource!.id as Dataset.Id;
    const placeIdColumn = createTextQueryColumn("place_id", placesDatasetId);
    const layer: MapLayer.T = {
      ...base,
      source: {
        ...base.source,
        queryColumns: [...base.source.queryColumns, placeIdColumn],
      },
      popup: { columnIds: "all", action: undefined },
    };
    _mockDuckDb({ rows: [{ ...SCHOOL_ROW, place_id: "place-1" }] });

    const snapshot = await _compile([layer], {
      placesDatasetIds: new Set([placesDatasetId]),
    });

    expect(_getFeatures(snapshot)[0]!.properties).toEqual({
      school_name: "PS 11",
    });
  });
});

describe("compileMapSnapshot queries", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
  });

  it("publishes a spatially filtered layer through its filter layer, even a hidden one", async () => {
    const filterLayer = createGeometryLayer({
      family: "polygon",
      sensitivity: { mode: "exact" },
    });
    const schools: MapLayer.T = {
      ...createGeometryLayer({
        family: "point",
        sensitivity: { mode: "exact" },
      }),
      spatialFilter: { layerId: filterLayer.id },
    };
    const keptFeature = createFeature({
      type: "Point",
      coordinates: [...SCHOOL_POSITION],
    });
    _mockDuckDb({ features: [keptFeature] });

    const snapshot = await _compile([
      { ...filterLayer, isVisible: false },
      schools,
    ]);

    expect(_getSentSql()).toHaveLength(1);
    expect(_getSentSql()[0]).toContain("kept_features AS (");
    expect(
      snapshot.layers.map((layer) => {
        return layer.layerId;
      }),
    ).toEqual([schools.id]);
    expect(_getFeatures(snapshot)).toHaveLength(1);
  });

  it("applies the map's saved area of interest", async () => {
    _mockDuckDb({ rows: [SCHOOL_ROW] });

    await _compile([createSchoolLayer({ mode: "exact" })], {
      aoi: UNIT_SQUARE,
    });

    expect(_getSentSql().join("\n")).toContain("ST_Intersects");
  });

  it("does not query or publish a hidden layer", async () => {
    _mockDuckDb({ rows: [SCHOOL_ROW] });

    const snapshot = await _compile([
      { ...createSchoolLayer({ mode: "exact" }), isVisible: false },
    ]);

    expect(runQueryMock).not.toHaveBeenCalled();
    expect(snapshot.layers).toEqual([]);
  });

  it("skips a visible layer that draws nothing because it has no source", async () => {
    const snapshot = await _compile([MapLayer.makeEmpty("Draft")]);

    expect(runQueryMock).not.toHaveBeenCalled();
    expect(snapshot.layers).toEqual([]);
  });

  it("carries a DuckDB-aggregated layer's aggregation", async () => {
    runQueryMock.mockImplementation(async ({ rawSql }: { rawSql: string }) => {
      if (rawSql.includes("source_row_count")) {
        return createPointAuditResult(12_000);
      }
      if (rawSql.includes("point_aggregate_cell_count")) {
        return createQueryResult([{ point_aggregate_cell_count: 1 }]);
      }
      return createQueryResult([{ ...SCHOOL_ROW, point_count: 12_000 }]);
    });

    const snapshot = await _compile([createSchoolLayer({ mode: "exact" })]);

    expect(snapshot.layers[0]!.aggregation).toMatchObject({
      aggregatedRowCount: 12_000,
    });
  });

  it("strips layer sources from the published config", async () => {
    _mockDuckDb({ rows: [SCHOOL_ROW] });

    const snapshot = await _compile([createSchoolLayer({ mode: "exact" })]);

    expect(snapshot.config.layers[0]!.source.dataSource).toBeUndefined();
  });
});

/** The displaced position the map's salt gives `position` as row `rowIndex`. */
function _getSaltedPosition(
  options: Readonly<{ layerId: MapLayer.Id; salt: string; rowIndex: number }>,
): GeoJSON.Position {
  const displaced = jitterCoordinate({
    longitude: SCHOOL_POSITION[0],
    latitude: SCHOOL_POSITION[1],
    radiusMeters: JITTER.radiusMeters,
    salt: options.salt,
    seed: `${options.layerId}:${options.rowIndex}`,
  });
  return [displaced.longitude, displaced.latitude];
}

describe("compileMapSnapshot displacement salt", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
  });

  it("keys a displaced lat/lng layer with the map's salt, so the public seed cannot reverse it", async () => {
    _mockDuckDb({ rows: [SCHOOL_ROW] });
    const layer = createSchoolLayer(JITTER);

    const point = _getFirstPoint(await _compile([layer]));

    expect(point).toEqual(
      _getSaltedPosition({ layerId: layer.id, salt: MAP_SALT, rowIndex: 0 }),
    );
    expect(point).not.toEqual(
      _getSaltedPosition({ layerId: layer.id, salt: "", rowIndex: 0 }),
    );
  });

  it("keys a displaced geometry layer with the map's salt, so the public seed cannot reverse it", async () => {
    _mockDuckDb({
      features: [
        createFeature({ type: "Point", coordinates: [...SCHOOL_POSITION] }),
      ],
    });
    const layer = createGeometryLayer({ family: "point", sensitivity: JITTER });

    const point = _getFirstPoint(await _compile([layer]));

    expect(point).toEqual(
      _getSaltedPosition({ layerId: layer.id, salt: MAP_SALT, rowIndex: 0 }),
    );
    expect(point).not.toEqual(
      _getSaltedPosition({ layerId: layer.id, salt: "", rowIndex: 0 }),
    );
  });

  it("publishes the same points for the same salt and different points for another", async () => {
    _mockDuckDb({ rows: [SCHOOL_ROW] });
    const layer = createSchoolLayer(JITTER);

    const first = _getFirstPoint(await _compile([layer]));
    const again = _getFirstPoint(await _compile([layer]));
    const otherMap = _getFirstPoint(
      await _compile([layer], { jitterSalt: OTHER_MAP_SALT }),
    );

    expect(again).toEqual(first);
    expect(otherMap).not.toEqual(first);
    expect(getDistanceMeters(SCHOOL_POSITION, otherMap)).toBeLessThanOrEqual(
      JITTER.radiusMeters + 1,
    );
  });

  it("never writes the salt into the published snapshot", async () => {
    _mockDuckDb({ rows: [SCHOOL_ROW] });

    const snapshot = await _compile([createSchoolLayer(JITTER)]);

    expect(MapSnapshotJson.toJson(snapshot)).not.toContain(MAP_SALT);
  });
});
