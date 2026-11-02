import { describe, expect, it } from "vitest";
/**
 * Disputed-status property emission for compileMapLayerSpatialQuery.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerSpatialFeatureProperties } from "../../MapLayerSpatialQuery.constants";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery";
import {
  createGeometryLayerFixture,
  createGridBinLayerFixture,
  withEmptyOverlay,
} from "./compileMapLayerSpatialQuery.fixtures";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { MapLayerSpatialQueryPlan } from "../../MapLayerSpatialQuery.types";

/** Shorthand for the compiled plan type, to keep helper signatures narrow. */
type Plan = MapLayerSpatialQueryPlan;

/** Compiles the direct geometry-column fixture with no disputed bind. */
function _compileGeometryColumnPlan(): Plan {
  const fixture = createGeometryLayerFixture();
  return compileMapLayerSpatialQuery(
    withEmptyOverlay({
      ...fixture,
      zoomBand: 0,
      simplificationReferenceLatitude: 0,
    }),
  );
}

/** Compiles the direct geometry-column fixture bound to a "status" column. */
function _compileGeometryColumnPlanWithDisputedBind(): Plan {
  const fixture = createGeometryLayerFixture();
  return compileMapLayerSpatialQuery(
    withEmptyOverlay({
      ...fixture,
      metadata: {
        ...fixture.metadata,
        disputedStatusColumn: { type: "queryColumn", columnName: "status" },
      },
      zoomBand: 0,
      simplificationReferenceLatitude: 0,
    }),
  );
}

/** Builds a boundary-join layer and metadata from the geometry fixture. */
function _createBoundaryJoinFixture(
  fixture: ReturnType<typeof createGeometryLayerFixture>,
) {
  const sourceKey = fixture.layer.source.queryColumns[1]!;
  const boundaryDatasetId = uuid<Dataset.Id>();
  const layer = {
    ...fixture.layer,
    geoBinding: {
      type: "joinToBoundaries" as const,
      dataKeyColumn: sourceKey.id,
      matching: "exact" as const,
      aggregation: {
        operation: "count" as const,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
      boundary: {
        datasetId: boundaryDatasetId,
        geometryColumnId: uuid<DatasetColumn.Id>(),
        geometryEncoding: "wkt" as const,
        keyColumnId: uuid<DatasetColumn.Id>(),
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
  return { layer, boundaryDatasetId };
}

/** Compiles a boundary-join layer bound to a boundary "status" column. */
function _compileBoundaryJoinPlanWithDisputedBind(): Plan {
  const fixture = createGeometryLayerFixture();
  const { layer, boundaryDatasetId } = _createBoundaryJoinFixture(fixture);
  return compileMapLayerSpatialQuery(
    withEmptyOverlay({
      layer,
      metadata: {
        ...fixture.metadata,
        boundary: {
          datasetId: boundaryDatasetId,
          datasetName: "Boundaries",
          geometryColumnName: "shape",
          geometryEncoding: "wkt",
          keyColumnName: "pcode",
          displayNameColumnName: "district",
          simplification: { tolerancePixels: 0.75 },
        },
        disputedStatusColumn: {
          type: "boundaryColumn",
          columnName: "status",
        },
      },
      zoomBand: 3,
      simplificationReferenceLatitude: 0,
    }),
  );
}

/** Builds a point-aggregation layer and metadata from the geometry fixture. */
function _createPointAggregationFixture(
  fixture: ReturnType<typeof createGeometryLayerFixture>,
) {
  const pointColumn = fixture.layer.source.queryColumns[0]!;
  const boundaryDatasetId = uuid<Dataset.Id>();
  const layer = {
    ...fixture.layer,
    geoBinding: {
      type: "aggregatePointsToBoundaries" as const,
      points: {
        type: "geometryColumn" as const,
        column: pointColumn.id,
        encoding: "wkt" as const,
        family: "point" as const,
        simplification: undefined,
        sourceCrs: undefined,
      },
      aggregation: {
        operation: "count" as const,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
      boundary: {
        datasetId: boundaryDatasetId,
        geometryColumnId: uuid<DatasetColumn.Id>(),
        geometryEncoding: "wkt" as const,
        keyColumnId: uuid<DatasetColumn.Id>(),
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
  return { layer, boundaryDatasetId };
}

/** Compiles a point-aggregation layer bound to a boundary "status" column. */
function _compilePointAggregationPlanWithDisputedBind(): Plan {
  const fixture = createGeometryLayerFixture();
  const { layer, boundaryDatasetId } = _createPointAggregationFixture(fixture);
  return compileMapLayerSpatialQuery(
    withEmptyOverlay({
      layer,
      metadata: {
        ...fixture.metadata,
        boundary: {
          datasetId: boundaryDatasetId,
          datasetName: "Boundaries",
          geometryColumnName: "shape",
          geometryEncoding: "wkt",
          keyColumnName: "pcode",
          displayNameColumnName: "district",
          simplification: { tolerancePixels: 0.75 },
        },
        disputedStatusColumn: {
          type: "boundaryColumn",
          columnName: "status",
        },
      },
      zoomBand: 3,
      simplificationReferenceLatitude: 0,
    }),
  );
}

/** Compiles a point-aggregation layer with no disputed bind. */
function _compilePointAggregationPlan(): Plan {
  const fixture = createGeometryLayerFixture();
  const { layer, boundaryDatasetId } = _createPointAggregationFixture(fixture);
  return compileMapLayerSpatialQuery(
    withEmptyOverlay({
      layer,
      metadata: {
        ...fixture.metadata,
        boundary: {
          datasetId: boundaryDatasetId,
          datasetName: "Boundaries",
          geometryColumnName: "shape",
          geometryEncoding: "wkt",
          keyColumnName: "pcode",
          displayNameColumnName: "district",
          simplification: { tolerancePixels: 0.75 },
        },
      },
      zoomBand: 3,
      simplificationReferenceLatitude: 0,
    }),
  );
}

/** Compiles a grid-bin layer whose metadata carries a query-column bind. */
function _compileGridBinPlanWithDisputedBind(): Plan {
  const fixture = createGridBinLayerFixture({ grid: "square" });
  return compileMapLayerSpatialQuery(
    withEmptyOverlay({
      ...fixture,
      metadata: {
        ...fixture.metadata,
        disputedStatusColumn: { type: "queryColumn", columnName: "label" },
      },
      zoomBand: 3,
      simplificationReferenceLatitude: 0,
    }),
  );
}

/** Compiles a grid-bin layer with no disputed bind. */
function _compileGridBinPlan(): Plan {
  const fixture = createGridBinLayerFixture({ grid: "square" });
  return compileMapLayerSpatialQuery(
    withEmptyOverlay({
      ...fixture,
      zoomBand: 3,
      simplificationReferenceLatitude: 0,
    }),
  );
}

describe("disputed status in compiled spatial SQL", () => {
  it("selects the bound source column as the disputed property", () => {
    const plan = _compileGeometryColumnPlanWithDisputedBind();

    expect(plan.rawSql).toContain(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
    expect(plan.rawSql).toContain('"status"');
  });

  it("emits no disputed property when the layer has no bind", () => {
    const plan = _compileGeometryColumnPlan();

    expect(plan.rawSql).not.toContain(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
  });

  it("selects the boundary column on a boundary join", () => {
    const plan = _compileBoundaryJoinPlanWithDisputedBind();

    expect(plan.rawSql).toContain(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
  });

  it("adds no spatial function for the disputed bind", () => {
    const withBind = _compileGeometryColumnPlanWithDisputedBind();
    const withoutBind = _compileGeometryColumnPlan();
    const countStFunctions = (sql: string): number => {
      return sql.match(/ST_[A-Za-z_]+/g)?.length ?? 0;
    };

    expect(countStFunctions(withBind.rawSql)).toBe(
      countStFunctions(withoutBind.rawSql),
    );
  });

  it("selects the boundary column on a point aggregation", () => {
    const plan = _compilePointAggregationPlanWithDisputedBind();

    expect(plan.rawSql).toContain(
      `'${MapLayerSpatialFeatureProperties.disputedStatus}', "${MapLayerSpatialFeatureProperties.disputedStatus}"`,
    );
    expect(plan.rawSql).toContain('"status"');
  });

  it("emits the key with NULL on an unbound point aggregation", () => {
    const plan = _compilePointAggregationPlan();

    expect(plan.rawSql).toContain(
      `'${MapLayerSpatialFeatureProperties.disputedStatus}', NULL`,
    );
  });

  it("never emits a disputed property for grid bins, bound or not", () => {
    const withBind = _compileGridBinPlanWithDisputedBind();
    const withoutBind = _compileGridBinPlan();

    expect(withBind.rawSql).not.toContain(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
    expect(withoutBind.rawSql).not.toContain(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
  });
});
