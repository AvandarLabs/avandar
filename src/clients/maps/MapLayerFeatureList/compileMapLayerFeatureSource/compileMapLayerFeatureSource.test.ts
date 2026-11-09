import { describe, expect, it } from "vitest";
import { createSitesAndSchoolsFixture } from "../MapLayerFeatureList.fixtures";
import { compileMapLayerFeatureSource } from "./compileMapLayerFeatureSource";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

describe("compileMapLayerFeatureSource", () => {
  it("reads a latitude and longitude layer as rows inside its spatial filter", () => {
    const { config, schools } = createSitesAndSchoolsFixture();

    const source = compileMapLayerFeatureSource({
      config,
      layer: schools,
      propertyColumnIds: [],
      datasets: [],
      datasetColumns: [],
    });

    expect(source.type).toBe("rows");
    expect(source.sql).toContain("filter_geoms AS (");
    expect(source.sql).toContain("ST_Buffer(geom, 805)");
  });

  it("reads a spatial layer as an envelope carrying the requested columns", () => {
    const { config, sites } = createSitesAndSchoolsFixture();
    const [siteName, latitude] = sites.source.queryColumns;
    const wktSites: MapLayer.T = {
      ...sites,
      popup: { columnIds: [], action: undefined },
      geoBinding: {
        type: "geometryColumn",
        column: latitude!.id,
        encoding: "wkt",
        family: "point",
        simplification: undefined,
        sourceCrs: undefined,
      },
    };

    const source = compileMapLayerFeatureSource({
      config: { ...config, layers: [wktSites] },
      layer: wktSites,
      propertyColumnIds: [siteName!.id],
      datasets: [],
      datasetColumns: [],
    });

    expect(source.type).toBe("envelope");
    expect(source.sql).toContain(`'site_name', "site_name"`);
  });
});
