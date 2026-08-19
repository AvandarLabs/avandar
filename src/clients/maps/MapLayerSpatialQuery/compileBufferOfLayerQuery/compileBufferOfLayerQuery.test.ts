/**
 * Buffer-of-layer compilation for compileMapLayerSpatialQuery.
 */
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import {
  createGeometryLayerFixture,
  createGridBinLayerFixture,
} from "../compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import type { CompileOptions } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";

const emptyOverlay: CompileOptions["overlay"] = {
  aoi: undefined,
  timeRange: undefined,
};

function _makeBufferLayer(
  source: MapLayer.T,
  options: {
    dissolve?: boolean;
    sensitivity?: MapLayer.T["sensitivity"];
  } = {},
): MapLayer.T {
  return MapLayer.withSensitivity(
    {
      ...MapLayer.createArea("Buffer"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: source.id,
        distanceMeters: 1000,
        dissolve: options.dissolve ?? false,
      },
    },
    options.sensitivity ?? source.sensitivity,
  );
}

function _compileOptions(
  layer: MapLayer.T,
  metadata: CompileOptions["metadata"],
  stack: readonly MapLayer.T[],
): CompileOptions {
  return {
    layer,
    metadata,
    overlay: emptyOverlay,
    stack,
    zoomBand: 0,
    simplificationReferenceLatitude: 0,
  };
}

describe("compileBufferOfLayerQuery", () => {
  it("buffers source output in a meters crs", () => {
    const { layer: polygonSource, metadata: sourceMetadata } =
      createGeometryLayerFixture();
    const bufferLayer = _makeBufferLayer(polygonSource);
    const { rawSql } = compileMapLayerSpatialQuery({
      layer: bufferLayer,
      metadata: sourceMetadata,
      overlay: emptyOverlay,
      stack: [polygonSource, bufferLayer],
      zoomBand: 0,
      simplificationReferenceLatitude: 0,
    });
    expect(rawSql).toContain("ST_Buffer");
    expect(rawSql).toContain("ST_Transform");
    expect(rawSql).toContain("concat('EPSG:'");
  });

  it("takes the CRS centroid from polygon centroids", () => {
    const { layer: polygonSource, metadata: sourceMetadata } =
      createGeometryLayerFixture();
    const bufferLayer = _makeBufferLayer(polygonSource);
    const { rawSql } = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, sourceMetadata, [
        polygonSource,
        bufferLayer,
      ]),
    );
    expect(rawSql).toContain("avg(ST_X(ST_Centroid(geom)))");
    expect(rawSql).toContain("avg(ST_Y(ST_Centroid(geom)))");
  });

  it("produces SQL the DuckDB analyzer can inspect", () => {
    const { layer: polygonSource, metadata: sourceMetadata } =
      createGeometryLayerFixture();
    const bufferLayer = _makeBufferLayer(polygonSource);
    const { rawSql } = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, sourceMetadata, [
        polygonSource,
        bufferLayer,
      ]),
    );
    expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(rawSql).kind).toBe(
      "read",
    );
  });

  it("produces inspectable SQL for an aggregate-only grid source", () => {
    const { layer: aggregateSource, metadata: sourceMetadata } =
      createGridBinLayerFixture({ grid: "hex", minCellCount: 5 });
    const bufferLayer = _makeBufferLayer(aggregateSource);
    const analysis = DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
      compileMapLayerSpatialQuery(
        _compileOptions(bufferLayer, sourceMetadata, [
          aggregateSource,
          bufferLayer,
        ]),
      ).rawSql,
    );
    expect(analysis).toEqual({ kind: "read", relations: expect.any(Array) });
  });

  it("dissolves with ST_Union_Agg", () => {
    const { layer: polygonSource, metadata: sourceMetadata } =
      createGeometryLayerFixture();
    const bufferLayer = _makeBufferLayer(polygonSource, { dissolve: true });
    const dissolvedPlan = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, sourceMetadata, [
        polygonSource,
        bufferLayer,
      ]),
    );
    expect(dissolvedPlan.rawSql).toContain("ST_Union_Agg");
  });

  it("throws when the source layer is missing", () => {
    const bufferLayer = _makeBufferLayer(MapLayer.createArea("Missing"));
    const missingSourceOptions = _compileOptions(
      bufferLayer,
      {
        type: "resolved",
        sourceColumnNames: new Map(),
        boundary: undefined,
        aggregationMeasureColumnName: undefined,
        normalizationDenominator: undefined,
        disputedStatusColumn: undefined,
      },
      [bufferLayer],
    );

    expect(() => {
      return compileMapLayerSpatialQuery(missingSourceOptions);
    }).toThrow("Buffer source layer is missing");
  });

  it("throws on a cycle", () => {
    const first = _makeBufferLayer(MapLayer.createArea("A"));
    const second = _makeBufferLayer(first);
    const cyclicFirst: MapLayer.T = {
      ...first,
      geoBinding: {
        type: "bufferOfLayer",
        layerId: second.id,
        distanceMeters: 1000,
        dissolve: false,
      },
    };
    const cyclicOptions = _compileOptions(
      cyclicFirst,
      {
        type: "resolved",
        sourceColumnNames: new Map(),
        boundary: undefined,
        aggregationMeasureColumnName: undefined,
        normalizationDenominator: undefined,
        disputedStatusColumn: undefined,
      },
      [cyclicFirst, second],
    );
    expect(() => {
      return compileMapLayerSpatialQuery(cyclicOptions);
    }).toThrow(/cycle/i);
  });

  it("throws on a sensitivity mismatch", () => {
    const { layer: polygonSource, metadata: sourceMetadata } =
      createGeometryLayerFixture();
    const bufferLayer = _makeBufferLayer(polygonSource, {
      sensitivity: {
        mode: "aggregateOnly",
        minCellCount: 5,
        minGeoLevel: "hex",
      },
    });
    const mismatchOptions = _compileOptions(bufferLayer, sourceMetadata, [
      polygonSource,
      bufferLayer,
    ]);
    expect(() => {
      return compileMapLayerSpatialQuery(mismatchOptions);
    }).toThrow(/sensitivity/i);
  });

  it("does not mention source point columns for an aggregate-only source", () => {
    const { layer: aggregateSource, metadata: sourceMetadata } =
      createGridBinLayerFixture({ grid: "hex", minCellCount: 5 });
    const bufferLayer = _makeBufferLayer(aggregateSource);
    const aggregateBufferPlan = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, sourceMetadata, [
        aggregateSource,
        bufferLayer,
      ]),
    );
    expect(aggregateBufferPlan.rawSql).not.toContain('"latitude"');
  });
});
