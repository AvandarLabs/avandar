import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { i18n } from "@lingui/core";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fetchMapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList";
import { MAP_LAYER_FEATURE_LIST_ROW_KEYS } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.constants";
import { createSitesAndSchoolsFixture } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.fixtures";
import { createGeometryLayerFixture } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { compileMapLayerSpatialQuery } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { getQueryLayersFromMapLayers } from "@/views/GisApp/layers/getQueryLayersFromMapLayers/getQueryLayersFromMapLayers";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return {
    WorkspaceQuerySession: {
      runQuery: vi
        .fn()
        .mockResolvedValue({ columns: [], data: [], numRows: 0 }),
    },
  };
});

/** A hydrated schools layer drawn from its WKT column, popup on all fields. */
function _makeSchoolsLayer(): MapLayer.T {
  const dataset = Model.make("Dataset", {
    id: "schools",
    name: "schools",
  }) as Dataset.T;
  const sourceColumns = ["the_geom", "loc_name", "address"].map(
    (name, index) => {
      return QueryColumn.makeFromDatasetColumn(
        Model.make("DatasetColumn", {
          id: `dc_${name}`,
          datasetId: dataset.id,
          name,
          originalName: name,
          dataType: "varchar",
          columnIdx: index,
        }) as DatasetColumn.T,
      );
    },
  );
  const geometryColumn = sourceColumns[0]!;
  const layer = MapLayer.makeEmpty("schools");
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: dataset,
      queryColumns: [geometryColumn],
      sourceColumns,
    },
    geoBinding: {
      type: "geometryColumn",
      column: geometryColumn.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
}

function _getQueriedNames(layer: MapLayer.T): string[] {
  const [queryLayer] = getQueryLayersFromMapLayers([layer]);
  return queryLayer!.source.queryColumns.map(prop("baseColumn.name"));
}

describe("getQueryLayersFromMapLayers", () => {
  it("queries every source column of an exact layer whose popup shows all fields", () => {
    expect(_getQueriedNames(_makeSchoolsLayer())).toEqual([
      "the_geom",
      "loc_name",
      "address",
    ]);
  });

  it("keeps the source columns' ids, so the layer's query key is stable", () => {
    const layer = _makeSchoolsLayer();
    const [queryLayer] = getQueryLayersFromMapLayers([layer]);

    expect(queryLayer!.source.queryColumns.map(prop("id"))).toEqual(
      layer.source.sourceColumns!.map(prop("id")),
    );
  });

  it("never widens a layer whose locations are displaced", () => {
    const displaced = MapLayer.withSensitivity(_makeSchoolsLayer(), {
      mode: "jitter",
      radiusMeters: 500,
    });

    expect(_getQueriedNames(displaced)).toEqual(["the_geom"]);
  });

  it("leaves a popup's chosen fields as the only queried columns", () => {
    const layer = _makeSchoolsLayer();
    const chosen = { ...layer, popup: { ...layer.popup, columnIds: [] } };

    expect(_getQueriedNames(chosen)).toEqual(["the_geom"]);
  });

  it("leaves an aggregated query alone", () => {
    const layer = _makeSchoolsLayer();
    const geometryId = layer.source.queryColumns[0]!.id;
    const aggregated = {
      ...layer,
      source: {
        ...layer.source,
        aggregations: { [geometryId]: "count" as const },
      },
    };

    expect(_getQueriedNames(aggregated)).toEqual(["the_geom"]);
  });

  it("returns an unchanged layer itself", () => {
    const layer = MapLayer.makeEmpty("unbound");

    expect(getQueryLayersFromMapLayers([layer])[0]).toBe(layer);
  });
});

/**
 * Sites as a new latitude and longitude layer has them (only the coordinates
 * queried, popup on chosen fields), a buffer of them labelled by
 * `site_name`, and schools filtered by that buffer.
 */
function _makeLabelledBufferConfig(): {
  config: AvaMapConfig.T;
  sites: MapLayer.T;
  buffer: MapLayer.T;
  schools: MapLayer.T;
} {
  const fixture = createSitesAndSchoolsFixture();
  const [siteName, latitude, longitude] = fixture.sites.source.queryColumns;
  const sites: MapLayer.T = {
    ...fixture.sites,
    source: {
      ...fixture.sites.source,
      queryColumns: [latitude!, longitude!],
      sourceColumns: [
        siteName!,
        { ...latitude!, id: uuid<QueryColumn.Id>() },
        { ...longitude!, id: uuid<QueryColumn.Id>() },
      ],
    },
    popup: { columnIds: [], action: undefined },
  };
  return {
    config: {
      ...fixture.config,
      layers: [sites, fixture.buffer, fixture.schools],
    },
    sites,
    buffer: fixture.buffer,
    schools: fixture.schools,
  };
}

/** The names of the columns the sites layer, listed first, queries. */
function _getQueriedSiteNames(layers: readonly MapLayer.T[]): string[] {
  return getQueryLayersFromMapLayers(layers)[0]!.source.queryColumns.map(
    prop("baseColumn.name"),
  );
}

describe("getQueryLayersFromMapLayers with a labelled buffer", () => {
  it("queries the ring label column of a source whose popup lists other fields", () => {
    const { config, sites, buffer } = _makeLabelledBufferConfig();
    const [querySites] = getQueryLayersFromMapLayers(config.layers);

    expect(querySites!.source.queryColumns.map(prop("id"))).toEqual([
      ...sites.source.queryColumns.map(prop("id")),
      buffer.geoBinding?.type === "bufferOfLayer"
        ? buffer.geoBinding.labelColumn
        : undefined,
    ]);
  });

  it("labels each ring with the site name", () => {
    const { config, buffer } = _makeLabelledBufferConfig();
    const plan = compileMapLayerSpatialQuery({
      layer: buffer,
      metadata: createGeometryLayerFixture().metadata,
      overlay: { aoi: undefined, timeRange: undefined },
      stack: getQueryLayersFromMapLayers(config.layers),
      zoomBand: 0,
      simplificationReferenceLatitude: 0,
    });

    expect(plan.sourcePropertyColumnNames).toEqual(["site_name"]);
  });

  it("shows the nearest site's name in the feature list", async () => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
    const { config, schools } = _makeLabelledBufferConfig();
    const list = await fetchMapLayerFeatureList({
      config: { ...config, layers: getQueryLayersFromMapLayers(config.layers) },
      layerId: schools.id,
      columnIds: "popup",
      sort: undefined,
      limit: undefined,
      workspaceId: uuid<Workspace.Id>(),
      datasets: [],
      datasetColumns: [],
      i18n,
    });

    expect(list.columns.map(prop("key"))).toContain(
      MAP_LAYER_FEATURE_LIST_ROW_KEYS.nearestLabel,
    );
  });

  it("leaves a dissolved buffer's source alone", () => {
    const { config, buffer } = _makeLabelledBufferConfig();
    const dissolved: MapLayer.T =
      buffer.geoBinding?.type === "bufferOfLayer"
        ? { ...buffer, geoBinding: { ...buffer.geoBinding, dissolve: true } }
        : buffer;

    expect(
      _getQueriedSiteNames(
        config.layers.map((layer) => {
          return layer.id === buffer.id ? dissolved : layer;
        }),
      ),
    ).toEqual(["latitude", "longitude"]);
  });

  it("never adds a label column to a displaced source", () => {
    const { config, sites } = _makeLabelledBufferConfig();
    const displaced = MapLayer.withSensitivity(sites, {
      mode: "jitter",
      radiusMeters: 500,
    });

    expect(
      _getQueriedSiteNames(
        config.layers.map((layer) => {
          return layer.id === sites.id ? displaced : layer;
        }),
      ),
    ).toEqual(["latitude", "longitude"]);
  });
});
