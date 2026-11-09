import { i18n } from "@lingui/core";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MAP_LAYER_FEATURE_LIST_ROW_KEYS } from "./MapLayerFeatureList.constants";
import { createSitesAndSchoolsFixture } from "./MapLayerFeatureList.fixtures";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { FetchMapLayerFeatureListOptions } from "./MapLayerFeatureList.types";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { fetchMapLayerFeatureList } = await import("./fetchMapLayerFeatureList");

/** Two schools, the farther first, as the list SQL returns them. */
function _makeQueryResult(): QueryResult.T {
  const makeRow = (name: string, meters: number, site: string) => {
    return {
      __avandar_properties: JSON.stringify({ school_name: name }),
      __avandar_longitude: -73.99,
      __avandar_latitude: 40.73,
      __avandar_distance_meters: meters,
      __avandar_nearest_label: site,
    };
  };
  const data = [
    makeRow("Far school", 804.672, "Union Square"),
    makeRow("Near school", 160.9344, "Washington Square"),
  ];
  return { id: uuid<QueryResult.Id>(), columns: [], data, numRows: 2 };
}

function _makeOptions(
  overrides: Partial<FetchMapLayerFeatureListOptions> = {},
): FetchMapLayerFeatureListOptions {
  const { config, schools } = createSitesAndSchoolsFixture();
  return {
    config,
    layerId: schools.id,
    columnIds: "popup",
    sort: undefined,
    limit: undefined,
    workspaceId: uuid<Workspace.Id>(),
    datasets: [],
    datasetColumns: [],
    i18n,
    ...overrides,
  };
}

describe("fetchMapLayerFeatureList", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  beforeEach(() => {
    runQueryMock.mockReset();
    runQueryMock.mockResolvedValue(_makeQueryResult());
  });

  it("lists the popup columns, then distance and nearest site", async () => {
    const list = await fetchMapLayerFeatureList(_makeOptions());

    expect(list.columns).toEqual([
      { key: "school_name", label: "school_name", kind: "source" },
      {
        key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance,
        label: "Distance to nearest Sites",
        kind: "distance",
      },
      {
        key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.nearestLabel,
        label: "Nearest Sites",
        kind: "nearestLabel",
      },
    ]);
  });

  it("shows distances in the buffer's unit, nearest first", async () => {
    const list = await fetchMapLayerFeatureList(_makeOptions());

    expect(list.distanceUnit).toBe("mi");
    expect(list.rows[0]).toMatchObject({
      school_name: "Near school",
      [MAP_LAYER_FEATURE_LIST_ROW_KEYS.nearestLabel]: "Washington Square",
    });
    expect(
      list.rows[0]?.[MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance],
    ).toBeCloseTo(0.1, 6);
  });

  it("counts every row before the limit", async () => {
    const list = await fetchMapLayerFeatureList(_makeOptions({ limit: 1 }));

    expect(list.rows).toHaveLength(1);
    expect(list.totalCount).toBe(2);
  });

  it("queries the layer's rows inside its buffer and measures to the sites", async () => {
    await fetchMapLayerFeatureList(_makeOptions());

    const { rawSql } = runQueryMock.mock.calls[0]![0] as { rawSql: string };
    expect(rawSql).toContain("list_features_rows AS (");
    expect(rawSql).toContain("filter_geoms AS (");
    expect(rawSql).toContain("nearest_features_rows AS (");
    expect(rawSql).toContain("arg_min(nearest_label, pair_distance)");
  });

  it("refuses a layer with approximate locations", async () => {
    const { config, schools } = createSitesAndSchoolsFixture({
      mode: "jitter",
      radiusMeters: 500,
    });

    await expect(
      fetchMapLayerFeatureList(_makeOptions({ config, layerId: schools.id })),
    ).rejects.toThrow(
      "A feature list is only available for a layer with exact locations",
    );
  });

  it("refuses distances to sites whose locations are displaced", async () => {
    const { config, sites, schools } = createSitesAndSchoolsFixture();
    const jitteredSites = MapLayer.withSensitivity(sites, {
      mode: "jitter",
      radiusMeters: 500,
    });
    const jitteredConfig = {
      ...config,
      layers: config.layers.map((layer) => {
        return layer.id === sites.id ? jitteredSites : layer;
      }),
    };

    await expect(
      fetchMapLayerFeatureList(
        _makeOptions({ config: jitteredConfig, layerId: schools.id }),
      ),
    ).rejects.toThrow(
      "Distances cannot be measured from a layer with approximate locations",
    );
    expect(runQueryMock).not.toHaveBeenCalled();
  });
});
