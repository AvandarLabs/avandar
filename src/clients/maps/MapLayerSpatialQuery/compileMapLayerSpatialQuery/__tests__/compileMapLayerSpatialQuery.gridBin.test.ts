/**
 * Grid-bin compilation for compileMapLayerSpatialQuery.
 */
import { describe, expect, it } from "vitest";

import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery";
import {
  createGridBinLayerFixture,
  getCellMathSql,
  withAoiOverlay,
  withEmptyOverlay,
} from "./compileMapLayerSpatialQuery.fixtures";

describe("compileMapLayerSpatialQuery grid bin", () => {
  it.each(["hex", "square"] as const)(
    "compiles a %s grid bin in a derived meters CRS",
    (grid) => {
      const fixture = createGridBinLayerFixture({ grid, minCellCount: 5 });
      const { rawSql, family, sourcePropertyColumnNames } =
        compileMapLayerSpatialQuery(
          withEmptyOverlay({
            ...fixture,
            zoomBand: 6,
            simplificationReferenceLatitude: 12.5,
          }),
        );

      [
        "source_rows",
        "parsed_points",
        "typed_points",
        "point_rows",
        "grid_crs",
        "projected_points",
        "binned_points",
        "cell_values",
        "classified_cells",
        "feature_rows",
        "diagnostic_summary",
      ].forEach((cte) => {
        expect(rawSql).toContain(`${cte} AS (`);
      });
      expect(rawSql).toContain("ST_Transform");
      expect(rawSql).toContain("always_xy := true");
      expect(rawSql).toContain("'EPSG:4326'");
      expect(rawSql).toContain("32661");
      expect(rawSql).toContain("32761");
      expect(rawSql).toContain("32600");
      expect(rawSql).toContain("32700");
      expect(rawSql).toContain("count(*) AS contributor_count");
      expect(rawSql).toContain("ST_SimplifyPreserveTopology");
      expect(family).toBe("polygon");
      expect(sourcePropertyColumnNames).toEqual([]);
    },
  );

  it("bins squares by fixed meter columns and rows", () => {
    const fixture = createGridBinLayerFixture({ grid: "square" });
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 6,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(getCellMathSql(rawSql)).toContain("floor(");
    expect(rawSql).toContain("ST_MakeEnvelope");
  });

  it("bins hexes by rounded axial coordinates", () => {
    const fixture = createGridBinLayerFixture({ grid: "hex" });
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 6,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(getCellMathSql(rawSql)).toContain("sqrt(3)");
    expect(rawSql).toContain("ST_MakePolygon");
  });

  it("quotes a hostile point identifier in compiled bin SQL", () => {
    const fixture = createGridBinLayerFixture({ grid: "square" });
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 3,
        simplificationReferenceLatitude: 0,
      }),
    );
    const hostileName = 'shape"; DROP TABLE maps; --';
    const quotedName = '"shape""; DROP TABLE maps; --"';

    expect(rawSql).toContain(quotedName);
    expect(rawSql.replaceAll(quotedName, "")).not.toContain(hostileName);
  });

  it("reprojects a geometry-column point before grid binning", () => {
    const fixture = createGridBinLayerFixture({
      grid: "square",
      sourceCrs: 4258,
    });
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 3,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).toContain("TRY(ST_Transform(TRY(ST_GeomFromText");
    expect(rawSql).toContain("'EPSG:4258'");
  });

  it("suppresses below-threshold cells without any reportable count", () => {
    const fixture = createGridBinLayerFixture({ grid: "hex", minCellCount: 5 });
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 6,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).toContain("contributor_count < 5");
    expect(rawSql).toContain("THEN 'suppressed'");
    expect(rawSql).toContain(
      "CASE WHEN state = 'suppressed' THEN json_object(",
    );
    expect(rawSql).not.toContain(
      "CASE WHEN state = 'suppressed' THEN NULL ELSE contributor_count END",
    );
  });

  it("suppresses nothing when the layer is not aggregate only", () => {
    const fixture = createGridBinLayerFixture({ grid: "square" });
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 6,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).toContain("contributor_count < 0");
  });

  it("keeps cell math identical while zoom changes cell simplification", () => {
    const fixture = createGridBinLayerFixture({ grid: "hex", minCellCount: 5 });
    const lowZoom = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 4,
        simplificationReferenceLatitude: 12.5,
      }),
    ).rawSql;
    const highZoom = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        ...fixture,
        zoomBand: 12,
        simplificationReferenceLatitude: 12.5,
      }),
    ).rawSql;

    expect(getCellMathSql(highZoom)).toEqual(getCellMathSql(lowZoom));
    expect(highZoom).not.toEqual(lowZoom);
  });

  it("sums a query-column denominator inside each cell", () => {
    const fixture = createGridBinLayerFixture({
      grid: "square",
      minCellCount: 5,
    });
    const { rawSql } = compileMapLayerSpatialQuery(
      withEmptyOverlay({
        layer: fixture.layer,
        metadata: {
          ...fixture.metadata,
          normalizationDenominator: {
            type: "queryColumn",
            columnName: "population",
          },
        },
        zoomBand: 6,
        simplificationReferenceLatitude: 0,
      }),
    );

    expect(rawSql).toContain(
      'sum("population") AS "__avandar_denominator"', // prettier-ignore
    );
  });

  it("refuses a boundary denominator on a grid bin", () => {
    const fixture = createGridBinLayerFixture({
      grid: "square",
      minCellCount: 5,
    });

    expect(() => {
      return compileMapLayerSpatialQuery(
        withEmptyOverlay({
          layer: fixture.layer,
          metadata: {
            ...fixture.metadata,
            normalizationDenominator: {
              type: "boundaryColumn",
              columnName: "population",
            },
          },
          zoomBand: 6,
          simplificationReferenceLatitude: 0,
        }),
      );
    }).toThrow(/denominator/i);
  });

  it("intersects point_geometry with the aoi before binning", () => {
    const fixture = createGridBinLayerFixture({ grid: "square" });
    const { rawSql } = compileMapLayerSpatialQuery(
      withAoiOverlay({
        ...fixture,
        zoomBand: 6,
        simplificationReferenceLatitude: 0,
      }),
    );

    const pointIntersectIndex = rawSql.search(
      /ST_Intersects\s*\(\s*point_geometry/,
    );
    const binnedIndex = rawSql.indexOf("binned_points AS (");
    expect(pointIntersectIndex).toBeGreaterThanOrEqual(0);
    expect(binnedIndex).toBeGreaterThan(pointIntersectIndex);
    expect(rawSql).toContain('ST_Intersects("__avandar_geometry"');
  });
});
