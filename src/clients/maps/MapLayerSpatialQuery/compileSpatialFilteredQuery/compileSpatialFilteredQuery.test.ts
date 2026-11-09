/**
 * Spatial filter compilation over every spatial compiler's output.
 */
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import {
  createGeometryLayerFixture,
  createGridBinLayerFixture,
  SAMPLE_AOI,
} from "../compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { compileSpatialFilteredQuery } from "./compileSpatialFilteredQuery";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { SpatialFilterCompileOptions } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { ResolvedMapLayerMetadata } from "../MapLayerSpatialQuery.types";

type LayerFixture = { layer: MapLayer.T; metadata: ResolvedMapLayerMetadata };

function _makeBoundary(): NonNullable<ResolvedMapLayerMetadata["boundary"]> {
  return {
    datasetId: uuid<Dataset.Id>(),
    datasetName: "Boundaries",
    geometryColumnName: "shape",
    geometryEncoding: "wkt",
    keyColumnName: "pcode",
    displayNameColumnName: undefined,
    simplification: { tolerancePixels: 0.75 },
  };
}

function _makeBoundaryRef(
  boundary: NonNullable<ResolvedMapLayerMetadata["boundary"]>,
): MapLayer.BoundarySource {
  return {
    datasetId: boundary.datasetId,
    geometryColumnId: uuid<DatasetColumn.Id>(),
    geometryEncoding: "wkt",
    keyColumnId: uuid<DatasetColumn.Id>(),
    displayNameColumnId: undefined,
    simplification: { tolerancePixels: 0.75 },
  };
}

function _createPointFixture(): LayerFixture {
  const fixture = createGeometryLayerFixture();
  const binding = fixture.layer.geoBinding;
  if (binding?.type !== "geometryColumn") {
    throw new Error("The fixture binds a geometry column");
  }
  return {
    layer: {
      ...fixture.layer,
      id: uuid<MapLayer.Id>(),
      sensitivity: { mode: "exact" },
      symbology: MapLayer.makeEmpty("Points").symbology,
      geoBinding: { ...binding, family: "point", simplification: undefined },
    },
    metadata: fixture.metadata,
  };
}

function _createPointAggregationFixture(): LayerFixture {
  const fixture = createGeometryLayerFixture();
  const boundary = _makeBoundary();
  const layer = {
    ...fixture.layer,
    geoBinding: {
      type: "aggregatePointsToBoundaries" as const,
      points: {
        type: "geometryColumn" as const,
        column: fixture.layer.source.queryColumns[0]!.id,
        encoding: "wkt" as const,
        family: "point" as const,
        simplification: undefined,
        sourceCrs: undefined,
      },
      aggregation: {
        operation: "count" as const,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
      boundary: _makeBoundaryRef(boundary),
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
  return { layer, metadata: { ...fixture.metadata, boundary } };
}

function _createBoundaryJoinFixture(): LayerFixture {
  const fixture = createGeometryLayerFixture();
  const boundary = _makeBoundary();
  const layer = {
    ...fixture.layer,
    geoBinding: {
      type: "joinToBoundaries" as const,
      dataKeyColumn: fixture.layer.source.queryColumns[1]!.id,
      boundary: _makeBoundaryRef(boundary),
      matching: "exact" as const,
      aggregation: {
        operation: "count" as const,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
  return { layer, metadata: { ...fixture.metadata, boundary } };
}

/** Compile options over `fixtures`, each layer resolving its own metadata. */
function _makeOptions(
  target: MapLayer.T,
  fixtures: readonly LayerFixture[],
  overlay: SpatialFilterCompileOptions["overlay"] = {
    aoi: undefined,
    timeRange: undefined,
  },
): SpatialFilterCompileOptions {
  return {
    layer: target,
    stack: fixtures.map((fixture) => {
      return fixture.layer.id === target.id ? target : fixture.layer;
    }),
    overlay,
    zoomBand: 3,
    simplificationReferenceLatitude: 0,
    resolveMetadata: (layer) => {
      const match = fixtures.find((fixture) => {
        return fixture.layer.id === layer.id;
      });
      if (!match) {
        throw new Error("No metadata for this layer");
      }
      return match.metadata;
    },
  };
}

const COMPILER_FIXTURES = [
  { name: "geometry column", create: _createPointFixture },
  {
    name: "grid bin",
    create: () => {
      return createGridBinLayerFixture({ grid: "hex" });
    },
  },
  { name: "point aggregation", create: _createPointAggregationFixture },
  { name: "boundary join", create: _createBoundaryJoinFixture },
] as const;

describe("compileSpatialFilteredQuery", () => {
  it.each(COMPILER_FIXTURES)(
    "leaves an unfiltered $name layer's SQL unchanged",
    ({ create }) => {
      const target = create();
      const options = _makeOptions(target.layer, [target]);

      expect(compileSpatialFilteredQuery(options).rawSql).toBe(
        compileMapLayerSpatialQuery({ ...options, metadata: target.metadata })
          .rawSql,
      );
    },
  );

  it.each(COMPILER_FIXTURES)(
    "keeps only $name features that intersect the filter layer",
    ({ create }) => {
      const filter = createGeometryLayerFixture();
      const target = create();
      const filtered = {
        ...target.layer,
        spatialFilter: { layerId: filter.layer.id },
      };
      const { rawSql } = compileSpatialFilteredQuery(
        _makeOptions(filtered, [filter, target]),
      );

      expect(rawSql).toContain("filter_geoms AS (");
      expect(rawSql).toContain("kept_features AS (");
      expect(rawSql).toContain("EXISTS (SELECT 1 FROM filter_geoms");
      expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(rawSql).kind).toBe(
        "read",
      );
    },
  );

  it("compiles the filter layer at full detail whatever the map zoom", () => {
    const filter = createGeometryLayerFixture();
    const target = _createPointFixture();
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: filter.layer.id },
    };
    const options = _makeOptions(filtered, [filter, target]);
    const fullDetailFilterSql = compileMapLayerSpatialQuery({
      ...options,
      layer: filter.layer,
      metadata: filter.metadata,
      zoomBand: 24,
    }).rawSql;

    expect(compileSpatialFilteredQuery(options).rawSql).toContain(
      fullDetailFilterSql,
    );
  });

  it("applies the area filter and the spatial filter together", () => {
    const filter = createGeometryLayerFixture();
    const target = _createPointFixture();
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: filter.layer.id },
    };
    const { rawSql } = compileSpatialFilteredQuery(
      _makeOptions(filtered, [filter, target], {
        aoi: SAMPLE_AOI,
        timeRange: undefined,
      }),
    );

    expect(rawSql).toContain(JSON.stringify(SAMPLE_AOI));
    expect(rawSql).toContain("kept_features AS (");
  });

  it("refuses a filter layer that is missing", () => {
    const target = _createPointFixture();
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: uuid<MapLayer.Id>() },
    };

    expect(() => {
      return compileSpatialFilteredQuery(_makeOptions(filtered, [target]));
    }).toThrow("Spatial filter layer is missing");
  });

  it("refuses a filter layer that does not output polygons", () => {
    const pointFilter = _createPointFixture();
    const target = _createPointFixture();
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: pointFilter.layer.id },
    };

    expect(() => {
      return compileSpatialFilteredQuery(
        _makeOptions(filtered, [pointFilter, target]),
      );
    }).toThrow("Spatial filter layer must output polygons");
  });

  it("refuses a filter layer that depends on the filtered layer", () => {
    const filter = createGeometryLayerFixture();
    const target = _createPointFixture();
    const loopedFilter = {
      ...filter,
      layer: { ...filter.layer, spatialFilter: { layerId: target.layer.id } },
    };
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: filter.layer.id },
    };

    expect(() => {
      return compileSpatialFilteredQuery(
        _makeOptions(filtered, [loopedFilter, target]),
      );
    }).toThrow("Spatial filter chain contains a cycle");
  });
});
