import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createSitesAndSchoolsFixture } from "../MapLayerFeatureList.fixtures";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { fetchMapLayerFeatureCount } =
  await import("./fetchMapLayerFeatureCount");

describe("fetchMapLayerFeatureCount", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
    runQueryMock.mockResolvedValue({
      id: uuid<QueryResult.Id>(),
      columns: [],
      data: [{ feature_count: 12n }],
      numRows: 1,
    });
  });

  it("counts a jittered layer's features inside its spatial filter", async () => {
    const { config, schools } = createSitesAndSchoolsFixture({
      mode: "jitter",
      radiusMeters: 500,
    });

    const count = await fetchMapLayerFeatureCount({
      config,
      layerId: schools.id,
      workspaceId: uuid<Workspace.Id>(),
      datasets: [],
      datasetColumns: [],
    });

    expect(count).toBe(12);
    const { rawSql } = runQueryMock.mock.calls[0]![0] as { rawSql: string };
    expect(rawSql).toContain("filter_geoms AS (");
  });

  it("refuses an aggregate-only layer", async () => {
    const { config, schools } = createSitesAndSchoolsFixture();
    const protectedSchools = MapLayer.withSensitivity(schools, {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });

    await expect(
      fetchMapLayerFeatureCount({
        config: {
          ...config,
          layers: config.layers.map((layer) => {
            return layer.id === schools.id ? protectedSchools : layer;
          }),
        },
        layerId: schools.id,
        workspaceId: uuid<Workspace.Id>(),
        datasets: [],
        datasetColumns: [],
      }),
    ).rejects.toThrow("This layer has no feature count");
  });
});
