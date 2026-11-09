import { i18n } from "@lingui/core";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createDatasetQueryColumn } from "$/models/queries/QueryColumn/QueryColumn.fixtures";
import { MAP_LAYER_FEATURE_LIST_ROW_KEYS } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.constants";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";

const { fetchMapLayerFeatureListMock } = vi.hoisted(() => {
  return { fetchMapLayerFeatureListMock: vi.fn() };
});

vi.mock("@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList", () => {
  return { fetchMapLayerFeatureList: fetchMapLayerFeatureListMock };
});

const { loadExportFeatureTable } =
  await import("@/views/GisApp/export/loadExportFeatureTable/loadExportFeatureTable");

const SITE_ID = createDatasetQueryColumn({
  name: "site_id",
  dataType: "varchar",
});
const CASES = createDatasetQueryColumn({ name: "cases", dataType: "bigint" });
const LATITUDE = createDatasetQueryColumn({
  name: "latitude",
  dataType: "double",
});
const LONGITUDE = createDatasetQueryColumn({
  name: "longitude",
  dataType: "double",
});
const WORKSPACE_ID = uuid<Workspace.Id>();

const LIST: MapLayerFeatureList = {
  columns: [
    { key: "site_id", label: "site_id", kind: "source" },
    { key: "cases", label: "cases", kind: "source" },
  ],
  rows: [
    { site_id: "S1", cases: 10 },
    { site_id: "S2", cases: 20 },
  ],
  totalCount: 2,
  distanceUnit: undefined,
};

/** An exact "Sites" point layer whose query returns four columns. */
function _sitesLayer(): MapLayer.T {
  const layer = MapLayer.makeEmpty("Sites");
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [SITE_ID, CASES, LATITUDE, LONGITUDE],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: LATITUDE.id,
      longitude: LONGITUDE.id,
    },
  };
}

/** A map holding `layer` whose export lists `layerId` (default: `layer`). */
function _config(
  options: Readonly<{
    layer: MapLayer.T;
    layerId?: MapLayer.Id;
    featureList?: Partial<AvaMapConfig.ExportFeatureList>;
  }>,
): AvaMapConfig.T {
  const base = AvaMapConfig.makeEmpty();
  return {
    ...base,
    layers: [options.layer],
    exportLayout: {
      ...base.exportLayout,
      featureList: {
        layerId: options.layerId ?? options.layer.id,
        columnIds: [SITE_ID.id, CASES.id],
        sort: undefined,
        maxRows: 200,
        ...options.featureList,
      },
    },
  };
}

/** Loads with loaded (empty) workspace metadata. */
async function _load(
  config: AvaMapConfig.T,
): ReturnType<typeof loadExportFeatureTable> {
  return await loadExportFeatureTable({
    config,
    workspaceId: WORKSPACE_ID,
    datasets: [],
    datasetColumns: [],
    i18n,
  });
}

describe("loadExportFeatureTable", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  beforeEach(() => {
    fetchMapLayerFeatureListMock.mockReset();
    fetchMapLayerFeatureListMock.mockResolvedValue(LIST);
  });

  it("returns no table and fetches nothing when the layout has no feature list", async () => {
    expect(await _load(AvaMapConfig.makeEmpty())).toBeUndefined();
    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
  });

  it("returns no table when the listed layer is no longer exact", async () => {
    const jittered = MapLayer.withSensitivity(_sitesLayer(), {
      mode: "jitter",
      radiusMeters: 500,
    });

    expect(await _load(_config({ layer: jittered }))).toBeUndefined();
    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
  });

  it("returns no table when the listed layer is not on the map", async () => {
    const config = _config({
      layer: _sitesLayer(),
      layerId: uuid<MapLayer.Id>(),
    });

    expect(await _load(config)).toBeUndefined();
    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
  });

  it("asks for the saved columns, the sort column's row key, and the row cap", async () => {
    const layer = _sitesLayer();
    const config = _config({
      layer,
      featureList: {
        sort: { columnId: CASES.id, direction: "desc" },
        maxRows: 50,
      },
    });

    await _load(config);

    expect(fetchMapLayerFeatureListMock).toHaveBeenCalledWith({
      config,
      layerId: layer.id,
      columnIds: [SITE_ID.id, CASES.id],
      sort: { key: "cases", direction: "desc" },
      limit: 50,
      workspaceId: WORKSPACE_ID,
      datasets: [],
      datasetColumns: [],
      i18n,
    });
  });

  it("queries the layer as the drawer does, with a popup-all layer's other source columns", async () => {
    const status = createDatasetQueryColumn({
      name: "status",
      dataType: "varchar",
    });
    const sites = _sitesLayer();
    const layer: MapLayer.T = {
      ...sites,
      popup: { ...sites.popup, columnIds: "all" },
      source: {
        ...sites.source,
        sourceColumns: [...sites.source.queryColumns, status],
      },
    };

    await _load(
      _config({ layer, featureList: { columnIds: [SITE_ID.id, status.id] } }),
    );

    const [fetchOptions] = fetchMapLayerFeatureListMock.mock.calls[0]!;
    expect(fetchOptions.columnIds).toEqual([SITE_ID.id, status.id]);
    expect(fetchOptions.config.layers[0].source.queryColumns).toContainEqual(
      status,
    );
  });

  it("falls back to the popup columns and default order when the saved columns are gone", async () => {
    const goneColumnId = uuid<QueryColumn.Id>();
    const config = _config({
      layer: _sitesLayer(),
      featureList: {
        columnIds: [goneColumnId],
        sort: { columnId: goneColumnId, direction: "asc" },
      },
    });

    await _load(config);

    expect(fetchMapLayerFeatureListMock).toHaveBeenCalledWith(
      expect.objectContaining({ columnIds: "popup", sort: undefined }),
    );
  });

  it("refuses to print while the workspace's datasets are still loading", async () => {
    await expect(
      loadExportFeatureTable({
        config: _config({ layer: _sitesLayer() }),
        workspaceId: WORKSPACE_ID,
        datasets: undefined,
        datasetColumns: [],
        i18n,
      }),
    ).rejects.toThrow("still loading");
    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
  });

  it("returns the list's labels and each row's printed cells", async () => {
    expect(await _load(_config({ layer: _sitesLayer() }))).toEqual({
      summaryLine: "2 Sites",
      truncationNote: undefined,
      buildColumnLimitNote: expect.any(Function),
      headerLabels: ["site_id", "cases"],
      rows: [
        ["S1", "10"],
        ["S2", "20"],
      ],
    });
  });

  it("prints distances as the drawer shows them and never the row's coordinates", async () => {
    const keys = MAP_LAYER_FEATURE_LIST_ROW_KEYS;
    fetchMapLayerFeatureListMock.mockResolvedValue({
      columns: [
        { key: "site_id", label: "site_id", kind: "source" },
        {
          key: keys.distance,
          label: "Distance to nearest Sites",
          kind: "distance",
        },
      ],
      rows: [
        {
          site_id: "S1",
          [keys.distance]: 0.0935,
          [keys.longitude]: -73.99,
          [keys.latitude]: 40.73,
        },
      ],
      totalCount: 1,
      distanceUnit: "mi",
    } satisfies MapLayerFeatureList);

    const table = await _load(_config({ layer: _sitesLayer() }));

    expect(table?.headerLabels).toEqual([
      "site_id",
      "Distance to nearest Sites",
    ]);
    expect(table?.rows).toEqual([["S1", "0.09 mi"]]);
  });
});
