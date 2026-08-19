/**
 * Direct geometry-column compilation for compileMapLayerSpatialQuery.
 */
import { describe, expect, it } from "vitest";
import { MapLayerSpatialQueryColumns } from "../../MapLayerSpatialQuery.constants";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery";
import {
  createGeometryLayerFixture,
  getParsedRowsSql,
  withAoiOverlay,
  withEmptyOverlay,
} from "./compileMapLayerSpatialQuery.fixtures";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

describe("compileMapLayerSpatialQuery geometry column", () => {
  it("wraps source SQL and emits the stable one-row envelope", () => {
    const fixture = createGeometryLayerFixture();
    const plan = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 7,
        simplificationReferenceLatitude: 38.9,
      }),
    );

    expect(plan.rawSql).toContain("source_rows AS (");
    expect(plan.rawSql).toContain("parsed_rows AS (");
    expect(plan.rawSql).toContain("typed_rows AS (");
    expect(plan.rawSql).toContain("diagnostic_summary AS (");
    expect(plan.rawSql).toContain("feature_rows AS (");
    expect(plan.rawSql).toContain("ST_SimplifyPreserveTopology");
    expect(plan.rawSql).toContain(
      'replace(CAST(ST_GeometryType("__avandar_geometry") AS VARCHAR)',
    );
    expect(plan.rawSql).toContain("'EPSG:3857'");
    expect(plan.rawSql).toContain("always_xy := true");
    expect(plan.rawSql).toContain(
      `AS "${MapLayerSpatialQueryColumns.featureCollection}"`,
    );
    expect(plan.rawSql).toContain(
      `AS "${MapLayerSpatialQueryColumns.diagnostics}"`,
    );
    expect(plan.family).toBe("polygon");
    expect(plan.sourcePropertyColumnNames).toEqual(["label"]);
  });

  it("quotes a hostile geometry identifier everywhere it is referenced", () => {
    const fixture = createGeometryLayerFixture();
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 0,
        simplificationReferenceLatitude: 0,
      }),
    );
    const hostileName = 'shape"; DROP TABLE maps; --';
    const quotedName = '"shape""; DROP TABLE maps; --"';

    expect(rawSql).toContain(quotedName);
    expect(rawSql.replaceAll(quotedName, "")).not.toContain(hostileName);
  });

  it("emits a direct query-column denominator as a reserved property", () => {
    const fixture = createGeometryLayerFixture();
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        metadata: {
          ...fixture.metadata,
          normalizationDenominator: {
            type: "queryColumn",
            columnName: "label",
          },
        },
        zoomBand: 0,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).toContain("'__avandar_denominator', \"label\"");
  });

  it.each(["point", "line", "polygon"] as const)(
    "compiles the configured %s family",
    (family) => {
      const fixture = createGeometryLayerFixture();
      const binding = fixture.layer.geoBinding;
      if (binding?.type !== "geometryColumn") {
        throw new Error("Expected a geometry-column fixture");
      }
      const layer = {
        ...fixture.layer,
        geoBinding: { ...binding, family },
      } as MapLayer.T;

      expect(
        compileMapLayerSpatialQuery(
          withEmptyOverlay({
            layer,
            metadata: fixture.metadata,
            zoomBand: 2,
            simplificationReferenceLatitude: 0,
          }),
        ).family,
      ).toBe(family);
    },
  );

  it("does not simplify point geometry", () => {
    const fixture = createGeometryLayerFixture();
    const binding = fixture.layer.geoBinding;
    if (binding?.type !== "geometryColumn") {
      throw new Error("Expected a geometry-column fixture");
    }
    const layer = {
      ...fixture.layer,
      geoBinding: {
        ...binding,
        family: "point" as const,
        simplification: undefined,
      },
    } as MapLayer.T;

    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        layer,
        metadata: fixture.metadata,
        zoomBand: 4,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).not.toContain("ST_SimplifyPreserveTopology");
  });

  it("reprojects a direct geometry column from its configured source CRS", () => {
    const fixture = createGeometryLayerFixture();
    const binding = fixture.layer.geoBinding;
    if (binding?.type !== "geometryColumn") {
      throw new Error("Expected a geometry-column fixture");
    }
    const layer = {
      ...fixture.layer,
      geoBinding: {
        ...binding,
        family: "point" as const,
        simplification: undefined,
        sourceCrs: 32_633,
      },
    } as MapLayer.T;

    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        layer,
        metadata: fixture.metadata,
        zoomBand: 4,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(getParsedRowsSql(rawSql)).toContain(
      "TRY(ST_Transform(TRY(ST_GeomFromText",
    );
    expect(getParsedRowsSql(rawSql)).toContain("'EPSG:32633'");
  });

  it("does not transform an unset direct geometry source CRS", () => {
    const fixture = createGeometryLayerFixture();
    const binding = fixture.layer.geoBinding;
    if (binding?.type !== "geometryColumn") {
      throw new Error("Expected a geometry-column fixture");
    }
    const layer = {
      ...fixture.layer,
      geoBinding: {
        ...binding,
        family: "point" as const,
        simplification: undefined,
      },
    } as MapLayer.T;

    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        layer,
        metadata: fixture.metadata,
        zoomBand: 4,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(getParsedRowsSql(rawSql)).not.toContain("ST_Transform");
  });

  it("intersects parsed geometry with the aoi before ST_AsGeoJSON", () => {
    const fixture = createGeometryLayerFixture();
    const { rawSql } = compileMapLayerSpatialQuery(
      withAoiOverlay({
        ...fixture,
        zoomBand: 0,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).toContain("ST_Intersects");
    expect(rawSql).toContain("ST_GeomFromGeoJSON");
    expect(getParsedRowsSql(rawSql)).not.toContain("ST_Intersects");
    expect(rawSql).toContain("ST_AsGeoJSON");
  });

  it("counts invalid geometry from typed_rows without aoi-filtering parsed_rows", () => {
    const fixture = createGeometryLayerFixture();
    const { rawSql } = compileMapLayerSpatialQuery(
      withAoiOverlay({
        ...fixture,
        zoomBand: 0,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(getParsedRowsSql(rawSql)).not.toContain("ST_Intersects");
    expect(rawSql).toContain(
      'count(*) FILTER (WHERE "__avandar_geometry" IS NULL) AS invalid_count',
    );
    const diagnosticSql = rawSql.slice(
      rawSql.indexOf("diagnostic_summary AS ("),
      rawSql.indexOf("feature_rows AS ("),
    );
    expect(diagnosticSql).toContain("FROM typed_rows");
    expect(rawSql.slice(rawSql.indexOf("feature_rows AS ("))).toContain(
      "ST_Intersects",
    );
  });

  it("omits aoi intersects when applyAoiFilter is false", () => {
    const fixture = createGeometryLayerFixture();
    const { rawSql } = compileMapLayerSpatialQuery(
      withAoiOverlay({
        layer: { ...fixture.layer, applyAoiFilter: false },
        metadata: fixture.metadata,
        zoomBand: 0,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).not.toContain("ST_Intersects");
  });
});
