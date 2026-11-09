import { describe, expect, it } from "vitest";
/**
 * Buffer-of-layer compilation for compileMapLayerSpatialQuery.
 */
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import {
  createGeometryLayerFixture,
  createGridBinLayerFixture,
} from "../compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
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
    labelColumn?: QueryColumn.Id;
  } = {},
): MapLayer.T {
  return MapLayer.withSensitivity(
    {
      ...MapLayer.createArea("Buffer"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: source.id,
        distanceMeters: 1000,
        distanceUnit: "m",
        labelColumn: options.labelColumn,
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
    expect(analysis).toEqual({
      kind: "read",
      relations: expect.any(Array),
      internalTableNames: [],
    });
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
        distanceUnit: "m",
        labelColumn: undefined,
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
  it("buffers a latitude and longitude source from its points", () => {
    const { layer: geometrySource, metadata } = createGeometryLayerFixture();
    const [latitude, longitude] = geometrySource.source.queryColumns;
    const latLngSource: MapLayer.T = {
      ...geometrySource,
      sensitivity: { mode: "exact" },
      geoBinding: {
        type: "latLngColumns",
        latitude: latitude!.id,
        longitude: longitude!.id,
      },
    };
    const bufferLayer = _makeBufferLayer(latLngSource);
    const { rawSql } = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, metadata, [latLngSource, bufferLayer]),
    );

    expect(rawSql).toContain("source_features_rows AS (");
    expect(rawSql).toContain('TRY(ST_Point(TRY_CAST("label" AS DOUBLE)');
    expect(rawSql).toContain("ST_Buffer");
    expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(rawSql).kind).toBe(
      "read",
    );
  });

  it("labels each ring with the source's label column", () => {
    const { layer: polygonSource, metadata } = createGeometryLayerFixture();
    const labelColumn = polygonSource.source.queryColumns[1]!;
    const bufferLayer = _makeBufferLayer(polygonSource, {
      labelColumn: labelColumn.id,
    });
    const plan = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, metadata, [polygonSource, bufferLayer]),
    );

    expect(plan.rawSql).toContain(
      "json_extract_string(properties, '/label') AS label",
    );
    expect(plan.rawSql).toContain("json_object('label', label)");
    expect(plan.sourcePropertyColumnNames).toEqual(["label"]);
  });

  it("drops ring labels when rings are dissolved", () => {
    const { layer: polygonSource, metadata } = createGeometryLayerFixture();
    const bufferLayer = _makeBufferLayer(polygonSource, {
      dissolve: true,
      labelColumn: polygonSource.source.queryColumns[1]!.id,
    });
    const { rawSql } = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, metadata, [polygonSource, bufferLayer]),
    );

    expect(rawSql).not.toContain("json_extract_string(properties");
  });
});
