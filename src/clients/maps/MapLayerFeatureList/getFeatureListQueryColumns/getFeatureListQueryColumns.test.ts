import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { createSitesAndSchoolsFixture } from "../MapLayerFeatureList.fixtures";
import { getFeatureListQueryColumns } from "./getFeatureListQueryColumns";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

function _makeGeometryLayer(): {
  layer: MapLayer.T;
  geometryTwin: QueryColumn.T;
} {
  const { sites } = createSitesAndSchoolsFixture();
  const [siteName, geometry] = sites.source.queryColumns;
  const geometryTwin: QueryColumn.T = { ...geometry!, id: uuid() };
  const layer: MapLayer.T = {
    ...sites,
    source: {
      ...sites.source,
      queryColumns: [siteName!, geometryTwin],
      sourceColumns: [siteName!, geometry!],
    },
    popup: { columnIds: "all", action: undefined },
    geoBinding: {
      type: "geometryColumn",
      column: geometry!.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
  return { layer, geometryTwin };
}

describe("getFeatureListQueryColumns", () => {
  it("omits the bound geometry column of an all-fields popup, matched by source column", () => {
    const { layer } = _makeGeometryLayer();

    const columns = getFeatureListQueryColumns(layer, "popup");

    expect(columns.map(QueryColumn.getDerivedColumnName)).toEqual([
      "site_name",
    ]);
  });

  it("omits the geometry column even when requested by id", () => {
    const { layer, geometryTwin } = _makeGeometryLayer();
    const siteName = layer.source.queryColumns[0]!;

    const columns = getFeatureListQueryColumns(layer, [
      siteName.id,
      geometryTwin.id,
    ]);

    expect(columns.map(prop("id"))).toEqual([siteName.id]);
  });

  it("omits the bound latitude and longitude of a coordinate layer", () => {
    const { schools } = createSitesAndSchoolsFixture();
    const everyColumnIds = schools.source.queryColumns.map(prop("id"));

    const columns = getFeatureListQueryColumns(schools, everyColumnIds);

    expect(columns.map(QueryColumn.getDerivedColumnName)).toEqual([
      "school_name",
    ]);
  });
});
